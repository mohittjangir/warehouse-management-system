from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.db.database import get_db
from app.core.dependencies import require_staff_or_admin
from app.models.models import User, UserRole, Product, Batch, Warehouse, StorageLocation, StockTransaction, Supplier, Customer

router = APIRouter()

@router.get("")
async def global_search(
    q: str = Query(..., min_length=2),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_staff_or_admin)
):
    search_term = f"%{q}%"
    
    # 1. Products
    products_stmt = select(Product).filter(
        or_(
            Product.name.ilike(search_term),
            Product.sku.ilike(search_term),
            Product.product_code.ilike(search_term)
        )
    ).options(selectinload(Product.category)).limit(5)
    products_res = await db.execute(products_stmt)
    products = products_res.scalars().all()

    # 2. Inventory (Batches)
    inventory_stmt = select(Batch).join(Product).join(Warehouse).outerjoin(StorageLocation).filter(
        or_(
            Batch.batch_number.ilike(search_term),
            Product.name.ilike(search_term),
            Product.sku.ilike(search_term),
            Warehouse.name.ilike(search_term)
        )
    ).options(
        selectinload(Batch.product),
        selectinload(Batch.warehouse),
        selectinload(Batch.location)
    ).limit(5)
    inventory_res = await db.execute(inventory_stmt)
    inventory = inventory_res.scalars().all()

    # 3. Warehouses
    warehouses_stmt = select(Warehouse).filter(
        or_(
            Warehouse.name.ilike(search_term),
            Warehouse.code.ilike(search_term),
            Warehouse.address.ilike(search_term)
        )
    ).limit(5)
    warehouses_res = await db.execute(warehouses_stmt)
    warehouses = warehouses_res.scalars().all()

    # 4. Locations
    locations_stmt = select(StorageLocation).join(Warehouse).filter(
        or_(
            StorageLocation.name.ilike(search_term),
            StorageLocation.code.ilike(search_term)
        )
    ).options(selectinload(StorageLocation.warehouse)).limit(5)
    locations_res = await db.execute(locations_stmt)
    locations = locations_res.scalars().all()

    # 5. Stock Movements
    movements_stmt = select(StockTransaction).join(Product).filter(
        or_(
            StockTransaction.transaction_number.ilike(search_term),
            Product.name.ilike(search_term),
            StockTransaction.reference_number.ilike(search_term)
        )
    ).options(selectinload(StockTransaction.product)).limit(5)
    movements_res = await db.execute(movements_stmt)
    movements = movements_res.scalars().all()

    suppliers = []
    customers = []
    
    # 6. Admin Only Data
    if current_user.role == UserRole.ADMIN:
        suppliers_stmt = select(Supplier).filter(
            or_(
                Supplier.name.ilike(search_term),
                Supplier.phone.ilike(search_term),
                Supplier.email.ilike(search_term)
            )
        ).limit(5)
        suppliers_res = await db.execute(suppliers_stmt)
        suppliers = suppliers_res.scalars().all()
        
        customers_stmt = select(Customer).filter(
            or_(
                Customer.name.ilike(search_term),
                Customer.phone.ilike(search_term),
                Customer.email.ilike(search_term)
            )
        ).limit(5)
        customers_res = await db.execute(customers_stmt)
        customers = customers_res.scalars().all()

    return {
        "products": [
            {"id": p.id, "name": p.name, "sku": p.sku, "category": p.category.name if p.category else None} 
            for p in products
        ],
        "inventory": [
            {
                "id": b.id, "batch_number": b.batch_number, 
                "product_name": b.product.name, "product_id": b.product_id,
                "warehouse": b.warehouse.name, "warehouse_id": b.warehouse_id,
                "location": b.location.name if b.location else None,
                "available": b.remaining_quantity
            } for b in inventory
        ],
        "warehouses": [
            {"id": w.id, "name": w.name, "code": w.code, "address": w.address} 
            for w in warehouses
        ],
        "locations": [
            {"id": l.id, "name": l.name, "code": l.code, "warehouse": l.warehouse.name} 
            for l in locations
        ],
        "stockMovements": [
            {
                "id": m.id, "txn_number": m.transaction_number, "type": m.transaction_type.value,
                "product_name": m.product.name, "quantity": m.quantity, "date": m.transaction_date.isoformat()
            } for m in movements
        ],
        "suppliers": [
            {"id": s.id, "name": s.name, "phone": s.phone, "email": s.email} 
            for s in suppliers
        ],
        "customers": [
            {"id": c.id, "name": c.name, "phone": c.phone, "email": c.email} 
            for c in customers
        ]
    }
