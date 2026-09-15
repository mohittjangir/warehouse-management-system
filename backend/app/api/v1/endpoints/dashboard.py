"""Dashboard and Reports API endpoints."""
from datetime import datetime, date, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, case
from sqlalchemy.orm import selectinload
import io
import csv

from app.db.database import get_db
from app.models.models import (
    StockTransaction, TransactionType, InventoryBalance, Product,
    Batch, BatchStatus, AuditLog, User, Category,
)
from app.schemas.schemas import AdminDashboardResponse, InventoryDashboardResponse, AuditLogResponse
from app.core.dependencies import require_admin, require_staff_or_admin
from app.services.inventory_service import calculate_cartons, get_stock_status

router = APIRouter()


# ─── Admin Dashboard ─────────────────────────────────────────────────────────

@router.get("/dashboard/admin", response_model=AdminDashboardResponse)
async def admin_dashboard(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = today_start + timedelta(days=1)

    # Total products
    total_products_r = await db.execute(
        select(func.count(Product.id)).where(Product.status == "ACTIVE")
    )
    total_products = total_products_r.scalar() or 0

    # Total stock
    total_stock_r = await db.execute(select(func.sum(InventoryBalance.total_quantity)))
    total_stock = total_stock_r.scalar() or 0

    # Low stock / out of stock
    all_balances = await db.execute(
        select(InventoryBalance).options(selectinload(InventoryBalance.product))
    )
    balances = all_balances.scalars().all()

    low_stock_count = 0
    out_of_stock_count = 0
    total_cartons = 0
    for b in balances:
        if b.product:
            ss = get_stock_status(b.total_quantity, b.product.minimum_stock,
                                  b.product.reorder_level, b.product.maximum_stock)
            if ss == "LOW_STOCK":
                low_stock_count += 1
            elif ss == "OUT_OF_STOCK":
                out_of_stock_count += 1
            c, _ = calculate_cartons(b.total_quantity, b.product.items_per_carton)
            total_cartons += c

    # Today's stock in/out
    stock_in_today_r = await db.execute(
        select(func.sum(StockTransaction.quantity)).where(
            and_(
                StockTransaction.transaction_type == TransactionType.STOCK_IN,
                StockTransaction.created_at >= today_start,
                StockTransaction.created_at < today_end,
            )
        )
    )
    stock_in_today = stock_in_today_r.scalar() or 0

    stock_out_today_r = await db.execute(
        select(func.sum(StockTransaction.quantity)).where(
            and_(
                StockTransaction.transaction_type == TransactionType.STOCK_OUT,
                StockTransaction.created_at >= today_start,
                StockTransaction.created_at < today_end,
            )
        )
    )
    stock_out_today = stock_out_today_r.scalar() or 0

    # Stock movement chart (last 30 days, daily)
    movement_chart = await _get_movement_chart(db, days=30)

    # Inventory by category
    inventory_by_cat = await _get_inventory_by_category(db)

    # Recent activity
    recent_activity = await _get_recent_activity(db, limit=15)

    return AdminDashboardResponse(
        total_products=total_products,
        total_stock=total_stock,
        total_cartons=total_cartons,
        stock_in_today=stock_in_today,
        stock_out_today=stock_out_today,
        low_stock_count=low_stock_count,
        out_of_stock_count=out_of_stock_count,
        stock_movement_chart=movement_chart,
        inventory_by_category=inventory_by_cat,
        recent_activity=recent_activity,
    )


# ─── Inventory Dashboard ─────────────────────────────────────────────────────

@router.get("/dashboard/inventory", response_model=InventoryDashboardResponse)
async def inventory_dashboard(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_staff_or_admin),
):
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = today_start + timedelta(days=1)

    total_products_r = await db.execute(
        select(func.count(Product.id)).where(Product.status == "ACTIVE")
    )
    total_products = total_products_r.scalar() or 0

    total_stock_r = await db.execute(select(func.sum(InventoryBalance.total_quantity)))
    available_stock = total_stock_r.scalar() or 0

    all_balances = await db.execute(
        select(InventoryBalance).options(selectinload(InventoryBalance.product))
    )
    balances = all_balances.scalars().all()

    low_stock_count = 0
    out_of_stock_count = 0
    total_cartons = 0
    low_stock_products = []

    for b in balances:
        if b.product:
            ss = get_stock_status(b.total_quantity, b.product.minimum_stock,
                                  b.product.reorder_level, b.product.maximum_stock)
            if ss == "LOW_STOCK":
                low_stock_count += 1
                low_stock_products.append({
                    "product_id": b.product_id,
                    "product_name": b.product.name,
                    "sku": b.product.sku,
                    "available": b.total_quantity,
                    "reorder_level": b.product.reorder_level,
                    "status": ss,
                })
            elif ss == "OUT_OF_STOCK":
                out_of_stock_count += 1
            c, _ = calculate_cartons(b.total_quantity, b.product.items_per_carton)
            total_cartons += c

    stock_in_today_r = await db.execute(
        select(func.sum(StockTransaction.quantity)).where(
            and_(
                StockTransaction.transaction_type == TransactionType.STOCK_IN,
                StockTransaction.created_at >= today_start,
                StockTransaction.created_at < today_end,
            )
        )
    )
    stock_in_today = stock_in_today_r.scalar() or 0

    stock_out_today_r = await db.execute(
        select(func.sum(StockTransaction.quantity)).where(
            and_(
                StockTransaction.transaction_type == TransactionType.STOCK_OUT,
                StockTransaction.created_at >= today_start,
                StockTransaction.created_at < today_end,
            )
        )
    )
    stock_out_today = stock_out_today_r.scalar() or 0

    # Recent stock in
    recent_si_r = await db.execute(
        select(StockTransaction).options(
            selectinload(StockTransaction.product),
            selectinload(StockTransaction.user),
        ).where(
            StockTransaction.transaction_type == TransactionType.STOCK_IN
        ).order_by(StockTransaction.created_at.desc()).limit(5)
    )
    recent_si = [
        {
            "id": t.id,
            "product": t.product.name if t.product else None,
            "quantity": t.quantity,
            "user": t.user.name if t.user else None,
            "time": t.created_at.isoformat(),
            "txn_number": t.transaction_number,
        }
        for t in recent_si_r.scalars().all()
    ]

    # Recent stock out
    recent_so_r = await db.execute(
        select(StockTransaction).options(
            selectinload(StockTransaction.product),
            selectinload(StockTransaction.user),
        ).where(
            StockTransaction.transaction_type == TransactionType.STOCK_OUT
        ).order_by(StockTransaction.created_at.desc()).limit(5)
    )
    recent_so = [
        {
            "id": t.id,
            "product": t.product.name if t.product else None,
            "quantity": t.quantity,
            "user": t.user.name if t.user else None,
            "time": t.created_at.isoformat(),
            "txn_number": t.transaction_number,
        }
        for t in recent_so_r.scalars().all()
    ]

    return InventoryDashboardResponse(
        total_products=total_products,
        available_stock=available_stock,
        total_cartons=total_cartons,
        stock_in_today=stock_in_today,
        stock_out_today=stock_out_today,
        low_stock_count=low_stock_count,
        out_of_stock_count=out_of_stock_count,
        recent_stock_in=recent_si,
        recent_stock_out=recent_so,
        low_stock_products=low_stock_products[:10],
    )


# ─── Reports ─────────────────────────────────────────────────────────────────

@router.get("/reports/stock")
async def stock_report(
    warehouse_id: Optional[int] = None,
    category_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_staff_or_admin),
):
    query = select(InventoryBalance).options(
        selectinload(InventoryBalance.product).selectinload(Product.category),
        selectinload(InventoryBalance.warehouse),
        selectinload(InventoryBalance.location),
    )
    if warehouse_id:
        query = query.where(InventoryBalance.warehouse_id == warehouse_id)

    result = await db.execute(query)
    balances = result.scalars().all()

    items = []
    for b in balances:
        p = b.product
        if not p:
            continue
        if category_id and p.category_id != category_id:
            continue
        cartons, loose = calculate_cartons(b.total_quantity, p.items_per_carton)
        ss = get_stock_status(b.total_quantity, p.minimum_stock, p.reorder_level, p.maximum_stock)
        items.append({
            "sku": p.sku,
            "product_name": p.name,
            "category": p.category.name if p.category else None,
            "warehouse": b.warehouse.name if b.warehouse else None,
            "location": b.location.name if b.location else None,
            "cartons": cartons,
            "loose_units": loose,
            "total_units": b.total_quantity,
            "status": ss,
        })
    return {"items": items, "total": len(items)}


@router.get("/reports/ageing")
async def ageing_report(
    product_id: Optional[int] = None,
    warehouse_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_staff_or_admin),
):
    query = select(Batch).options(
        selectinload(Batch.product),
        selectinload(Batch.warehouse),
    ).where(Batch.remaining_quantity > 0)

    if product_id:
        query = query.where(Batch.product_id == product_id)
    if warehouse_id:
        query = query.where(Batch.warehouse_id == warehouse_id)

    result = await db.execute(query.order_by(Batch.received_date.asc()))
    batches = result.scalars().all()

    now = datetime.utcnow()
    items = []
    for b in batches:
        age_days = (now - b.received_date).days
        if age_days <= 30:
            age_cat = "0-30 days"
        elif age_days <= 60:
            age_cat = "31-60 days"
        elif age_days <= 90:
            age_cat = "61-90 days"
        else:
            age_cat = "90+ days"

        items.append({
            "product": b.product.name if b.product else None,
            "sku": b.product.sku if b.product else None,
            "batch_number": b.batch_number,
            "received_date": b.received_date.isoformat(),
            "age_days": age_days,
            "age_category": age_cat,
            "remaining_quantity": b.remaining_quantity,
            "warehouse": b.warehouse.name if b.warehouse else None,
        })

    return {"items": items, "total": len(items)}


@router.get("/reports/movements")
async def movements_report(
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    product_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_staff_or_admin),
):
    query = select(StockTransaction).options(
        selectinload(StockTransaction.product),
        selectinload(StockTransaction.batch),
        selectinload(StockTransaction.user),
        selectinload(StockTransaction.warehouse),
    )
    if product_id:
        query = query.where(StockTransaction.product_id == product_id)
    if date_from:
        query = query.where(StockTransaction.created_at >= datetime.combine(date_from, datetime.min.time()))
    if date_to:
        query = query.where(StockTransaction.created_at <= datetime.combine(date_to, datetime.max.time()))

    result = await db.execute(query.order_by(StockTransaction.created_at.desc()))
    txns = result.scalars().all()

    items = [
        {
            "date": t.created_at.isoformat(),
            "txn_number": t.transaction_number,
            "type": t.transaction_type.value,
            "product": t.product.name if t.product else None,
            "sku": t.product.sku if t.product else None,
            "batch": t.batch.batch_number if t.batch else None,
            "quantity": t.quantity,
            "previous_balance": t.previous_balance,
            "new_balance": t.new_balance,
            "user": t.user.name if t.user else None,
            "warehouse": t.warehouse.name if t.warehouse else None,
        }
        for t in txns
    ]
    return {"items": items, "total": len(items)}


@router.get("/reports/export/csv/{report_type}")
async def export_csv(
    report_type: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_staff_or_admin),
):
    if report_type == "stock":
        report = await stock_report(db=db, _=_)
    elif report_type == "ageing":
        report = await ageing_report(db=db, _=_)
    elif report_type == "movements":
        report = await movements_report(db=db, _=_)
    else:
        from fastapi import HTTPException
        raise HTTPException(404, "Unknown report type")

    items = report.get("items", [])
    if not items:
        output = io.StringIO()
        output.write("No data available")
        output.seek(0)
        return StreamingResponse(
            io.BytesIO(output.read().encode()),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={report_type}_report.csv"},
        )

    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=items[0].keys())
    writer.writeheader()
    writer.writerows(items)
    output.seek(0)

    return StreamingResponse(
        io.BytesIO(output.read().encode()),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={report_type}_report.csv"},
    )


# ─── Audit Logs ──────────────────────────────────────────────────────────────

@router.get("/audit-logs")
async def list_audit_logs(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    action: Optional[str] = None,
    user_id: Optional[int] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    query = select(AuditLog).options(selectinload(AuditLog.user))
    if action:
        query = query.where(AuditLog.action == action)
    if user_id:
        query = query.where(AuditLog.user_id == user_id)
    if date_from:
        query = query.where(AuditLog.timestamp >= datetime.combine(date_from, datetime.min.time()))
    if date_to:
        query = query.where(AuditLog.timestamp <= datetime.combine(date_to, datetime.max.time()))

    # Count
    count_r = await db.execute(select(func.count(AuditLog.id)))
    total = count_r.scalar() or 0

    query = query.order_by(AuditLog.timestamp.desc()).offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    logs = result.scalars().all()

    return {
        "items": [
            AuditLogResponse(
                id=l.id,
                user_id=l.user_id,
                user_name=l.user.name if l.user else None,
                action=l.action,
                entity_type=l.entity_type,
                entity_id=l.entity_id,
                description=l.description,
                old_value=l.old_value,
                new_value=l.new_value,
                ip_address=l.ip_address,
                timestamp=l.timestamp,
            )
            for l in logs
        ],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


# ─── Helpers ─────────────────────────────────────────────────────────────────

async def _get_movement_chart(db: AsyncSession, days: int = 30) -> List[dict]:
    start = datetime.utcnow() - timedelta(days=days)
    result = await db.execute(
        select(
            func.date(StockTransaction.created_at).label("day"),
            StockTransaction.transaction_type,
            func.sum(StockTransaction.quantity).label("total"),
        ).where(
            StockTransaction.created_at >= start
        ).group_by(
            func.date(StockTransaction.created_at),
            StockTransaction.transaction_type,
        ).order_by(func.date(StockTransaction.created_at))
    )
    rows = result.all()

    day_map = {}
    for row in rows:
        d = str(row.day)
        if d not in day_map:
            day_map[d] = {"date": d, "stock_in": 0, "stock_out": 0}
        if row.transaction_type == TransactionType.STOCK_IN:
            day_map[d]["stock_in"] = float(row.total or 0)
        elif row.transaction_type == TransactionType.STOCK_OUT:
            day_map[d]["stock_out"] = float(row.total or 0)

    return list(day_map.values())


async def _get_inventory_by_category(db: AsyncSession) -> List[dict]:
    result = await db.execute(
        select(
            Category.name.label("category"),
            func.sum(InventoryBalance.total_quantity).label("total"),
        ).join(
            Product, Product.category_id == Category.id
        ).join(
            InventoryBalance, InventoryBalance.product_id == Product.id
        ).group_by(Category.name)
    )
    return [{"category": r.category, "total": float(r.total or 0)} for r in result.all()]


async def _get_recent_activity(db: AsyncSession, limit: int = 15) -> List[dict]:
    result = await db.execute(
        select(AuditLog).options(selectinload(AuditLog.user))
        .order_by(AuditLog.timestamp.desc())
        .limit(limit)
    )
    logs = result.scalars().all()
    return [
        {
            "id": l.id,
            "user": l.user.name if l.user else "System",
            "action": l.action,
            "description": l.description,
            "time": l.timestamp.isoformat(),
        }
        for l in logs
    ]
