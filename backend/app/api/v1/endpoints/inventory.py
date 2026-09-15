"""Stock In, Stock Out, Adjustment, and Inventory Balance endpoints."""
from datetime import datetime, date, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_, desc
from sqlalchemy.orm import selectinload

from app.db.database import get_db
from app.models.models import (
    StockTransaction, TransactionType, Batch, InventoryBalance,
    Product, User, Warehouse, StorageLocation, Supplier, Customer,
)
from app.schemas.schemas import (
    StockInRequest, StockOutRequest, AdjustmentRequest,
    StockTransactionResponse, BatchResponse, InventoryBalanceResponse,
)
from app.core.dependencies import require_staff_or_admin, require_admin
from app.services.inventory_service import (
    add_stock, remove_stock, adjust_stock,
    calculate_cartons, get_stock_status,
)

router = APIRouter()


# ─── Stock In ─────────────────────────────────────────────────────────────────

@router.post("/stock-in", response_model=StockTransactionResponse, status_code=201)
async def stock_in(
    body: StockInRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_staff_or_admin),
):
    try:
        txn = await add_stock(
            db=db,
            product_id=body.product_id,
            warehouse_id=body.warehouse_id,
            location_id=body.location_id,
            supplier_id=body.supplier_id,
            carton_quantity=body.carton_quantity,
            unit_quantity=body.unit_quantity,
            batch_number=body.batch_number,
            manufacturing_date=body.manufacturing_date,
            expiry_date=body.expiry_date,
            reference_number=body.reference_number,
            remarks=body.remarks,
            user=current_user,
        )
        await db.commit()
    except ValueError as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        await db.rollback()
        raise e

    # Reload with relationships
    result = await db.execute(
        select(StockTransaction)
        .options(
            selectinload(StockTransaction.product),
            selectinload(StockTransaction.batch),
            selectinload(StockTransaction.warehouse),
            selectinload(StockTransaction.location),
            selectinload(StockTransaction.supplier),
            selectinload(StockTransaction.user),
        )
        .where(StockTransaction.id == txn.id)
    )
    txn = result.scalar_one()
    return _to_txn_response(txn)


# ─── Stock Out ─────────────────────────────────────────────────────────────────

@router.post("/stock-out", response_model=StockTransactionResponse, status_code=201)
async def stock_out(
    body: StockOutRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_staff_or_admin),
):
    try:
        txns = await remove_stock(
            db=db,
            product_id=body.product_id,
            warehouse_id=body.warehouse_id,
            location_id=body.location_id,
            customer_id=body.customer_id,
            quantity=body.quantity,
            reference_number=body.reference_number,
            remarks=body.remarks,
            reason=body.reason,
            user=current_user,
        )
        await db.commit()
    except ValueError as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        await db.rollback()
        raise e

    result = await db.execute(
        select(StockTransaction)
        .options(
            selectinload(StockTransaction.product),
            selectinload(StockTransaction.batch),
            selectinload(StockTransaction.warehouse),
            selectinload(StockTransaction.location),
            selectinload(StockTransaction.customer),
            selectinload(StockTransaction.user),
        )
        .where(StockTransaction.id == txns[0].id)
    )
    txn = result.scalar_one()
    return _to_txn_response(txn)


# ─── Adjustment ───────────────────────────────────────────────────────────────

@router.post("/inventory/adjustment", response_model=StockTransactionResponse, status_code=201)
async def inventory_adjustment(
    body: AdjustmentRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    try:
        txn = await adjust_stock(
            db=db,
            product_id=body.product_id,
            warehouse_id=body.warehouse_id,
            location_id=body.location_id,
            quantity=body.quantity,
            reason=body.reason,
            reference_number=body.reference_number,
            remarks=body.remarks,
            user=current_user,
        )
        await db.commit()
    except ValueError as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        await db.rollback()
        raise e

    result = await db.execute(
        select(StockTransaction)
        .options(
            selectinload(StockTransaction.product),
            selectinload(StockTransaction.warehouse),
            selectinload(StockTransaction.user),
        )
        .where(StockTransaction.id == txn.id)
    )
    txn = result.scalar_one()
    return _to_txn_response(txn)


# ─── Stock Movements ──────────────────────────────────────────────────────────

@router.get("/stock-movements", response_model=List[StockTransactionResponse])
async def list_movements(
    product_id: Optional[int] = None,
    transaction_type: Optional[str] = None,
    warehouse_id: Optional[int] = None,
    search: Optional[str] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_staff_or_admin),
):
    query = select(StockTransaction).options(
        selectinload(StockTransaction.product),
        selectinload(StockTransaction.batch),
        selectinload(StockTransaction.warehouse),
        selectinload(StockTransaction.location),
        selectinload(StockTransaction.supplier),
        selectinload(StockTransaction.customer),
        selectinload(StockTransaction.user),
    )
    if product_id:
        query = query.where(StockTransaction.product_id == product_id)
    if transaction_type:
        query = query.where(StockTransaction.transaction_type == transaction_type)
    if warehouse_id:
        query = query.where(StockTransaction.warehouse_id == warehouse_id)
    if search:
        query = query.where(
            or_(
                StockTransaction.transaction_number.ilike(f"%{search}%"),
                StockTransaction.reference_number.ilike(f"%{search}%"),
            )
        )
    if date_from:
        query = query.where(StockTransaction.created_at >= datetime.combine(date_from, datetime.min.time()))
    if date_to:
        query = query.where(StockTransaction.created_at <= datetime.combine(date_to, datetime.max.time()))

    query = query.order_by(desc(StockTransaction.created_at))
    query = query.offset((page - 1) * page_size).limit(page_size)

    result = await db.execute(query)
    txns = result.scalars().all()
    return [_to_txn_response(t) for t in txns]


# ─── Inventory ───────────────────────────────────────────────────────────────

@router.get("/inventory", response_model=List[InventoryBalanceResponse])
async def list_inventory(
    warehouse_id: Optional[int] = None,
    category_id: Optional[int] = None,
    stock_status: Optional[str] = None,
    search: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_staff_or_admin),
):
    query = select(InventoryBalance).options(
        selectinload(InventoryBalance.product).selectinload(Product.category),
        selectinload(InventoryBalance.product).selectinload(Product.unit),
        selectinload(InventoryBalance.warehouse),
        selectinload(InventoryBalance.location),
    )
    if warehouse_id:
        query = query.where(InventoryBalance.warehouse_id == warehouse_id)

    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    balances = result.scalars().all()

    out = []
    for b in balances:
        p = b.product
        if not p:
            continue
        if category_id and p.category_id != category_id:
            continue
        if search and search.lower() not in p.name.lower() and search.lower() not in p.sku.lower():
            continue

        cartons, loose = calculate_cartons(b.total_quantity, p.items_per_carton)
        ss = get_stock_status(b.total_quantity, p.minimum_stock, p.reorder_level, p.maximum_stock)

        if stock_status and ss != stock_status:
            continue

        # Get oldest batch date
        batch_result = await db.execute(
            select(Batch.received_date).where(
                and_(Batch.product_id == p.id, Batch.remaining_quantity > 0)
            ).order_by(Batch.received_date.asc()).limit(1)
        )
        oldest = batch_result.scalar_one_or_none()

        out.append(InventoryBalanceResponse(
            product_id=p.id,
            sku=p.sku,
            product_name=p.name,
            category_name=p.category.name if p.category else None,
            warehouse_id=b.warehouse_id,
            warehouse_name=b.warehouse.name if b.warehouse else None,
            location_id=b.location_id,
            location_name=b.location.name if b.location else None,
            total_quantity=b.total_quantity,
            cartons=cartons,
            loose_units=loose,
            items_per_carton=p.items_per_carton,
            stock_status=ss,
            reorder_level=p.reorder_level,
            minimum_stock=p.minimum_stock,
            oldest_batch_date=oldest,
        ))

    return out


# ─── Batches ─────────────────────────────────────────────────────────────────

@router.get("/batches", response_model=List[BatchResponse])
async def list_batches(
    product_id: Optional[int] = None,
    warehouse_id: Optional[int] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_staff_or_admin),
):
    query = select(Batch)
    if product_id:
        query = query.where(Batch.product_id == product_id)
    if warehouse_id:
        query = query.where(Batch.warehouse_id == warehouse_id)
    if status_filter:
        query = query.where(Batch.status == status_filter)
    query = query.order_by(Batch.received_date.desc())

    result = await db.execute(query)
    batches = result.scalars().all()

    out = []
    for b in batches:
        age_days = (datetime.utcnow() - b.received_date).days if b.received_date else None
        out.append(BatchResponse(
            id=b.id,
            product_id=b.product_id,
            batch_number=b.batch_number,
            manufacturing_date=b.manufacturing_date,
            expiry_date=b.expiry_date,
            received_date=b.received_date,
            initial_quantity=b.initial_quantity,
            remaining_quantity=b.remaining_quantity,
            warehouse_id=b.warehouse_id,
            location_id=b.location_id,
            status=b.status.value,
            age_days=age_days,
        ))
    return out


# ─── Helper ───────────────────────────────────────────────────────────────────

def _to_txn_response(t: StockTransaction) -> StockTransactionResponse:
    return StockTransactionResponse(
        id=t.id,
        transaction_number=t.transaction_number,
        transaction_type=t.transaction_type.value,
        product_id=t.product_id,
        product_name=t.product.name if t.product else None,
        product_sku=t.product.sku if t.product else None,
        batch_id=t.batch_id,
        batch_number=t.batch.batch_number if t.batch else None,
        quantity=t.quantity,
        carton_quantity=t.carton_quantity,
        unit_quantity=t.unit_quantity,
        previous_balance=t.previous_balance,
        new_balance=t.new_balance,
        warehouse_id=t.warehouse_id,
        warehouse_name=t.warehouse.name if t.warehouse else None,
        location_id=t.location_id,
        location_name=t.location.name if t.location else None,
        supplier_id=t.supplier_id,
        supplier_name=t.supplier.name if t.supplier else None,
        customer_id=t.customer_id,
        customer_name=t.customer.name if t.customer else None,
        reference_number=t.reference_number,
        user_id=t.user_id,
        user_name=t.user.name if t.user else None,
        remarks=t.remarks,
        created_at=t.created_at,
    )
