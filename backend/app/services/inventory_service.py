"""
Inventory Service — Core business logic engine.
All inventory operations go through this service.
Never duplicate stock calculation logic elsewhere.
"""
import math
from datetime import datetime, date
from typing import List, Optional, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, update
from sqlalchemy.orm import selectinload

from app.models.models import (
    Product, Batch, StockTransaction, InventoryBalance, AuditLog,
    BatchStatus, TransactionType, User,
)


# ─── Carton/Unit Calculation ─────────────────────────────────────────────────

def calculate_cartons(total_units: float, items_per_carton: int) -> Tuple[int, float]:
    """
    Convert total base units to cartons + loose units.
    Returns (full_cartons, loose_units)
    Example: 230 units, 50 per carton → (4, 30)
    """
    if items_per_carton <= 0:
        return 0, total_units
    full_cartons = int(total_units // items_per_carton)
    loose_units = total_units % items_per_carton
    return full_cartons, loose_units


def cartons_to_units(cartons: float, loose: float, items_per_carton: int) -> float:
    """Convert carton count + loose units to total base units."""
    return (cartons * items_per_carton) + loose


def get_stock_status(total_quantity: float, minimum_stock: float,
                     reorder_level: float, maximum_stock: Optional[float]) -> str:
    """Determine stock health status."""
    if total_quantity <= 0:
        return "OUT_OF_STOCK"
    elif total_quantity <= minimum_stock:
        return "LOW_STOCK"
    elif maximum_stock and total_quantity > maximum_stock:
        return "OVERSTOCK"
    else:
        return "HEALTHY"


# ─── Transaction Number Generator ────────────────────────────────────────────

async def generate_transaction_number(db: AsyncSession, txn_type: TransactionType) -> str:
    prefix = {
        TransactionType.STOCK_IN: "SI",
        TransactionType.STOCK_OUT: "SO",
        TransactionType.ADJUSTMENT: "ADJ",
        TransactionType.TRANSFER: "TRF",
    }.get(txn_type, "TXN")
    today = datetime.utcnow().strftime("%Y%m%d")
    result = await db.execute(
        select(func.count(StockTransaction.id)).where(
            StockTransaction.transaction_type == txn_type
        )
    )
    count = result.scalar() or 0
    return f"{prefix}-{today}-{count + 1:05d}"


# ─── Inventory Balance ───────────────────────────────────────────────────────

async def get_or_create_balance(
    db: AsyncSession, product_id: int, warehouse_id: int, location_id: Optional[int]
) -> InventoryBalance:
    result = await db.execute(
        select(InventoryBalance).where(
            and_(
                InventoryBalance.product_id == product_id,
                InventoryBalance.warehouse_id == warehouse_id,
                InventoryBalance.location_id == location_id,
            )
        )
    )
    balance = result.scalar_one_or_none()
    if balance is None:
        balance = InventoryBalance(
            product_id=product_id,
            warehouse_id=warehouse_id,
            location_id=location_id,
            total_quantity=0,
        )
        db.add(balance)
        await db.flush()
    return balance


async def get_total_product_quantity(db: AsyncSession, product_id: int) -> float:
    """Sum all warehouse balances for a product."""
    result = await db.execute(
        select(func.sum(InventoryBalance.total_quantity)).where(
            InventoryBalance.product_id == product_id
        )
    )
    return result.scalar() or 0.0


# ─── FIFO Batch Allocation ───────────────────────────────────────────────────

async def allocate_fifo_batches(
    db: AsyncSession, product_id: int, warehouse_id: int, quantity_needed: float
) -> List[Tuple[Batch, float]]:
    """
    Allocate quantity across batches in FIFO order (oldest first).
    Returns list of (batch, quantity_to_deduct) pairs.
    Raises ValueError if insufficient stock.
    """
    result = await db.execute(
        select(Batch).where(
            and_(
                Batch.product_id == product_id,
                Batch.warehouse_id == warehouse_id,
                Batch.remaining_quantity > 0,
                Batch.status == BatchStatus.ACTIVE,
            )
        ).order_by(Batch.received_date.asc())
    )
    batches = result.scalars().all()

    available = sum(b.remaining_quantity for b in batches)
    if available < quantity_needed:
        raise ValueError(
            f"Insufficient stock. Available: {available:.2f} units, "
            f"Requested: {quantity_needed:.2f} units"
        )

    allocations: List[Tuple[Batch, float]] = []
    remaining = quantity_needed

    for batch in batches:
        if remaining <= 0:
            break
        take = min(batch.remaining_quantity, remaining)
        allocations.append((batch, take))
        remaining -= take

    return allocations


# ─── Stock In ────────────────────────────────────────────────────────────────

async def add_stock(
    db: AsyncSession,
    product_id: int,
    warehouse_id: int,
    location_id: Optional[int],
    carton_quantity: float,
    unit_quantity: float,
    batch_number: str,
    manufacturing_date: Optional[datetime],
    expiry_date: Optional[datetime],
    supplier_id: Optional[int],
    reference_number: Optional[str],
    remarks: Optional[str],
    user: User,
) -> StockTransaction:
    """
    Atomic stock-in operation.
    Creates batch, updates balance, creates movement record.
    """
    # Fetch product for items_per_carton
    product = await db.get(Product, product_id)
    if not product:
        raise ValueError(f"Product {product_id} not found")

    total_units = cartons_to_units(carton_quantity, unit_quantity, product.items_per_carton)
    if total_units <= 0:
        raise ValueError("Total quantity must be greater than 0")

    # Get current balance before
    balance = await get_or_create_balance(db, product_id, warehouse_id, location_id)
    previous_balance = await get_total_product_quantity(db, product_id)

    # Create or find batch
    batch_result = await db.execute(
        select(Batch).where(
            and_(
                Batch.product_id == product_id,
                Batch.batch_number == batch_number,
                Batch.warehouse_id == warehouse_id,
            )
        )
    )
    existing_batch = batch_result.scalar_one_or_none()

    if existing_batch:
        existing_batch.remaining_quantity += total_units
        existing_batch.initial_quantity += total_units
        existing_batch.updated_at = datetime.utcnow()
        batch = existing_batch
    else:
        batch = Batch(
            product_id=product_id,
            batch_number=batch_number,
            manufacturing_date=manufacturing_date,
            expiry_date=expiry_date,
            received_date=datetime.utcnow(),
            initial_quantity=total_units,
            remaining_quantity=total_units,
            warehouse_id=warehouse_id,
            location_id=location_id,
            status=BatchStatus.ACTIVE,
        )
        db.add(batch)
        await db.flush()

    # Update balance
    balance.total_quantity += total_units
    balance.updated_at = datetime.utcnow()
    new_balance = previous_balance + total_units

    # Generate transaction number
    txn_number = await generate_transaction_number(db, TransactionType.STOCK_IN)

    # Create movement record
    txn = StockTransaction(
        transaction_number=txn_number,
        transaction_type=TransactionType.STOCK_IN,
        product_id=product_id,
        batch_id=batch.id,
        quantity=total_units,
        carton_quantity=carton_quantity,
        unit_quantity=unit_quantity,
        previous_balance=previous_balance,
        new_balance=new_balance,
        warehouse_id=warehouse_id,
        location_id=location_id,
        supplier_id=supplier_id,
        reference_number=reference_number,
        user_id=user.id,
        remarks=remarks,
    )
    db.add(txn)
    await db.flush()

    # Audit
    audit = AuditLog(
        user_id=user.id,
        action="STOCK_IN",
        entity_type="stock_transaction",
        entity_id=txn.id,
        description=f"Stock In: {total_units} units of product {product_id} (Batch: {batch_number})",
        new_value={"quantity": total_units, "batch": batch_number, "warehouse": warehouse_id},
    )
    db.add(audit)

    return txn


# ─── Stock Out ───────────────────────────────────────────────────────────────

async def remove_stock(
    db: AsyncSession,
    product_id: int,
    warehouse_id: int,
    location_id: Optional[int],
    quantity: float,
    customer_id: Optional[int],
    reference_number: Optional[str],
    remarks: Optional[str],
    reason: Optional[str],
    user: User,
) -> List[StockTransaction]:
    """
    Atomic FIFO stock-out operation.
    Validates stock, allocates FIFO batches, updates balances, creates movement records.
    """
    if quantity <= 0:
        raise ValueError("Quantity must be greater than 0")

    previous_balance = await get_total_product_quantity(db, product_id)

    # FIFO allocation — raises ValueError if insufficient
    allocations = await allocate_fifo_batches(db, product_id, warehouse_id, quantity)

    txns = []
    remaining_to_deduct = quantity

    for batch, take_qty in allocations:
        # Update batch remaining
        batch.remaining_quantity -= take_qty
        batch.updated_at = datetime.utcnow()
        if batch.remaining_quantity <= 0:
            batch.remaining_quantity = 0
            batch.status = BatchStatus.DEPLETED

        # Update balance
        balance = await get_or_create_balance(db, product_id, warehouse_id, location_id)
        balance.total_quantity = max(0, balance.total_quantity - take_qty)
        balance.updated_at = datetime.utcnow()

    new_balance = max(0, previous_balance - quantity)

    # Single transaction record per stock-out (total)
    txn_number = await generate_transaction_number(db, TransactionType.STOCK_OUT)
    product = await db.get(Product, product_id)
    cartons, loose = calculate_cartons(quantity, product.items_per_carton if product else 1)

    txn = StockTransaction(
        transaction_number=txn_number,
        transaction_type=TransactionType.STOCK_OUT,
        product_id=product_id,
        batch_id=allocations[0][0].id if allocations else None,
        quantity=quantity,
        carton_quantity=cartons,
        unit_quantity=loose,
        previous_balance=previous_balance,
        new_balance=new_balance,
        warehouse_id=warehouse_id,
        location_id=location_id,
        customer_id=customer_id,
        reference_number=reference_number,
        user_id=user.id,
        remarks=f"{reason or ''} {remarks or ''}".strip() or None,
    )
    db.add(txn)
    await db.flush()

    # Audit
    audit = AuditLog(
        user_id=user.id,
        action="STOCK_OUT",
        entity_type="stock_transaction",
        entity_id=txn.id,
        description=f"Stock Out: {quantity} units of product {product_id}",
        new_value={"quantity": quantity, "warehouse": warehouse_id, "customer": customer_id},
    )
    db.add(audit)

    txns.append(txn)
    return txns


# ─── Adjustment ──────────────────────────────────────────────────────────────

async def adjust_stock(
    db: AsyncSession,
    product_id: int,
    warehouse_id: int,
    location_id: Optional[int],
    quantity: float,
    reason: str,
    reference_number: Optional[str],
    remarks: Optional[str],
    user: User,
) -> StockTransaction:
    """
    Controlled inventory adjustment (can be positive or negative).
    Creates an adjustment movement record preserving audit trail.
    """
    previous_balance = await get_total_product_quantity(db, product_id)
    new_balance = max(0, previous_balance + quantity)

    balance = await get_or_create_balance(db, product_id, warehouse_id, location_id)
    balance.total_quantity = max(0, balance.total_quantity + quantity)
    balance.updated_at = datetime.utcnow()

    product = await db.get(Product, product_id)
    cartons, loose = calculate_cartons(abs(quantity), product.items_per_carton if product else 1)

    txn_number = await generate_transaction_number(db, TransactionType.ADJUSTMENT)
    txn = StockTransaction(
        transaction_number=txn_number,
        transaction_type=TransactionType.ADJUSTMENT,
        product_id=product_id,
        quantity=quantity,
        carton_quantity=cartons if quantity >= 0 else -cartons,
        unit_quantity=loose if quantity >= 0 else -loose,
        previous_balance=previous_balance,
        new_balance=new_balance,
        warehouse_id=warehouse_id,
        location_id=location_id,
        reference_number=reference_number,
        user_id=user.id,
        remarks=f"REASON: {reason}. {remarks or ''}".strip(),
    )
    db.add(txn)
    await db.flush()

    audit = AuditLog(
        user_id=user.id,
        action="INVENTORY_ADJUSTMENT",
        entity_type="stock_transaction",
        entity_id=txn.id,
        description=f"Adjustment: {quantity:+.2f} units of product {product_id}. Reason: {reason}",
        old_value={"balance": previous_balance},
        new_value={"balance": new_balance, "adjustment": quantity},
    )
    db.add(audit)

    return txn


# ─── Audit Helper ────────────────────────────────────────────────────────────

async def create_audit_log(
    db: AsyncSession,
    user_id: Optional[int],
    action: str,
    entity_type: Optional[str] = None,
    entity_id: Optional[int] = None,
    description: Optional[str] = None,
    old_value: Optional[dict] = None,
    new_value: Optional[dict] = None,
    ip_address: Optional[str] = None,
) -> None:
    audit = AuditLog(
        user_id=user_id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        description=description,
        old_value=old_value,
        new_value=new_value,
        ip_address=ip_address,
    )
    db.add(audit)
