from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.core.dependencies import require_staff_or_admin
from app.models.models import User, UserRole, Product, Batch, Warehouse, StorageLocation, StockTransaction, Supplier, Customer

router = APIRouter()

@router.get("/")
def global_search(
    q: str = Query(..., min_length=2),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff_or_admin)
):
    search_term = f"%{q}%"
    
    # 1. Products
    products = db.query(Product).filter(
        (Product.name.ilike(search_term)) |
        (Product.sku.ilike(search_term)) |
        (Product.product_code.ilike(search_term))
    ).limit(5).all()

    # 2. Inventory (Batches)
    inventory = db.query(Batch).join(Product).join(Warehouse).outerjoin(StorageLocation).filter(
        (Batch.batch_number.ilike(search_term)) |
        (Product.name.ilike(search_term)) |
        (Product.sku.ilike(search_term)) |
        (Warehouse.name.ilike(search_term))
    ).limit(5).all()

    # 3. Warehouses
    warehouses = db.query(Warehouse).filter(
        (Warehouse.name.ilike(search_term)) |
        (Warehouse.code.ilike(search_term)) |
        (Warehouse.address.ilike(search_term))
    ).limit(5).all()

    # 4. Locations
    locations = db.query(StorageLocation).join(Warehouse).filter(
        (StorageLocation.name.ilike(search_term)) |
        (StorageLocation.code.ilike(search_term))
    ).limit(5).all()

    # 5. Stock Movements
    movements = db.query(StockTransaction).join(Product).filter(
        (StockTransaction.transaction_number.ilike(search_term)) |
        (Product.name.ilike(search_term)) |
        (StockTransaction.reference_number.ilike(search_term))
    ).limit(5).all()

    suppliers = []
    customers = []
    
    # 6. Admin Only Data
    if current_user.role == UserRole.ADMIN:
        suppliers = db.query(Supplier).filter(
            (Supplier.name.ilike(search_term)) |
            (Supplier.phone.ilike(search_term)) |
            (Supplier.email.ilike(search_term))
        ).limit(5).all()
        
        customers = db.query(Customer).filter(
            (Customer.name.ilike(search_term)) |
            (Customer.phone.ilike(search_term)) |
            (Customer.email.ilike(search_term))
        ).limit(5).all()

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
