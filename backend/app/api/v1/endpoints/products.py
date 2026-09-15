from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from app.db.database import get_db
from app.models.models import Product, Category, Unit, User, ProductStatus
from app.schemas.schemas import (
    ProductCreate, ProductUpdate, ProductResponse, ProductWithInventory
)
from app.core.dependencies import require_admin, require_staff_or_admin
from app.services.inventory_service import create_audit_log, get_total_product_quantity, get_stock_status, calculate_cartons

router = APIRouter()


@router.get("/", response_model=List[ProductWithInventory])
async def list_products(
    search: Optional[str] = None,
    category_id: Optional[int] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_staff_or_admin),
):
    from sqlalchemy import or_
    from app.models.models import InventoryBalance

    query = select(Product).options(
        selectinload(Product.category),
        selectinload(Product.unit),
    )
    if search:
        query = query.where(
            or_(
                Product.name.ilike(f"%{search}%"),
                Product.sku.ilike(f"%{search}%"),
                Product.product_code.ilike(f"%{search}%"),
            )
        )
    if category_id:
        query = query.where(Product.category_id == category_id)
    if status_filter:
        query = query.where(Product.status == status_filter)
    else:
        query = query.where(Product.status == ProductStatus.ACTIVE)

    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    products = result.scalars().all()

    # Enrich with inventory data
    out = []
    for p in products:
        total_qty = await get_total_product_quantity(db, p.id)
        cartons, loose = calculate_cartons(total_qty, p.items_per_carton)
        stock_status = get_stock_status(total_qty, p.minimum_stock, p.reorder_level, p.maximum_stock)

        item = ProductWithInventory(
            id=p.id,
            sku=p.sku,
            name=p.name,
            product_code=p.product_code,
            category_id=p.category_id,
            category_name=p.category.name if p.category else None,
            unit_id=p.unit_id,
            unit_name=p.unit.name if p.unit else None,
            unit_short_code=p.unit.short_code if p.unit else None,
            description=p.description,
            items_per_carton=p.items_per_carton,
            minimum_stock=p.minimum_stock,
            maximum_stock=p.maximum_stock,
            reorder_level=p.reorder_level,
            status=p.status.value,
            created_at=p.created_at,
            total_quantity=total_qty,
            cartons=cartons,
            loose_units=loose,
            stock_status=stock_status,
        )
        out.append(item)
    return out


@router.post("/", response_model=ProductResponse, status_code=201)
async def create_product(
    body: ProductCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    # Check SKU uniqueness
    existing = await db.execute(select(Product).where(Product.sku == body.sku))
    if existing.scalar_one_or_none():
        raise HTTPException(400, f"SKU '{body.sku}' already exists")

    product = Product(**body.model_dump())
    db.add(product)
    await db.flush()
    await create_audit_log(
        db, current_user.id, "PRODUCT_CREATED",
        entity_type="product", entity_id=product.id,
        description=f"Product '{product.name}' (SKU: {product.sku}) created",
        new_value={"sku": product.sku, "name": product.name},
    )
    await db.commit()
    await db.refresh(product)

    # Load relationships
    result = await db.execute(
        select(Product)
        .options(selectinload(Product.category), selectinload(Product.unit))
        .where(Product.id == product.id)
    )
    p = result.scalar_one()
    return ProductResponse(
        id=p.id, sku=p.sku, name=p.name, product_code=p.product_code,
        category_id=p.category_id, category_name=p.category.name if p.category else None,
        unit_id=p.unit_id, unit_name=p.unit.name if p.unit else None,
        unit_short_code=p.unit.short_code if p.unit else None,
        description=p.description, items_per_carton=p.items_per_carton,
        minimum_stock=p.minimum_stock, maximum_stock=p.maximum_stock,
        reorder_level=p.reorder_level, status=p.status.value, created_at=p.created_at,
    )


@router.get("/{product_id}", response_model=ProductWithInventory)
async def get_product(
    product_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_staff_or_admin),
):
    result = await db.execute(
        select(Product)
        .options(selectinload(Product.category), selectinload(Product.unit))
        .where(Product.id == product_id)
    )
    p = result.scalar_one_or_none()
    if not p:
        raise HTTPException(404, "Product not found")

    total_qty = await get_total_product_quantity(db, p.id)
    cartons, loose = calculate_cartons(total_qty, p.items_per_carton)
    stock_status = get_stock_status(total_qty, p.minimum_stock, p.reorder_level, p.maximum_stock)

    return ProductWithInventory(
        id=p.id, sku=p.sku, name=p.name, product_code=p.product_code,
        category_id=p.category_id, category_name=p.category.name if p.category else None,
        unit_id=p.unit_id, unit_name=p.unit.name if p.unit else None,
        unit_short_code=p.unit.short_code if p.unit else None,
        description=p.description, items_per_carton=p.items_per_carton,
        minimum_stock=p.minimum_stock, maximum_stock=p.maximum_stock,
        reorder_level=p.reorder_level, status=p.status.value, created_at=p.created_at,
        total_quantity=total_qty, cartons=cartons, loose_units=loose, stock_status=stock_status,
    )


@router.put("/{product_id}", response_model=ProductResponse)
async def update_product(
    product_id: int,
    body: ProductUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    p = await db.get(Product, product_id)
    if not p:
        raise HTTPException(404, "Product not found")

    old_val = {"name": p.name, "sku": p.sku}
    for k, v in body.model_dump(exclude_none=True).items():
        setattr(p, k, v)

    await create_audit_log(
        db, current_user.id, "PRODUCT_UPDATED",
        entity_type="product", entity_id=p.id,
        old_value=old_val, new_value={"name": p.name, "sku": p.sku},
    )
    await db.commit()
    await db.refresh(p)

    result = await db.execute(
        select(Product)
        .options(selectinload(Product.category), selectinload(Product.unit))
        .where(Product.id == p.id)
    )
    p = result.scalar_one()
    return ProductResponse(
        id=p.id, sku=p.sku, name=p.name, product_code=p.product_code,
        category_id=p.category_id, category_name=p.category.name if p.category else None,
        unit_id=p.unit_id, unit_name=p.unit.name if p.unit else None,
        unit_short_code=p.unit.short_code if p.unit else None,
        description=p.description, items_per_carton=p.items_per_carton,
        minimum_stock=p.minimum_stock, maximum_stock=p.maximum_stock,
        reorder_level=p.reorder_level, status=p.status.value, created_at=p.created_at,
    )


@router.delete("/{product_id}", status_code=204)
async def deactivate_product(
    product_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    p = await db.get(Product, product_id)
    if not p:
        raise HTTPException(404, "Product not found")
    p.status = ProductStatus.INACTIVE
    await create_audit_log(
        db, current_user.id, "PRODUCT_DEACTIVATED",
        entity_type="product", entity_id=p.id,
        description=f"Product '{p.name}' deactivated",
    )
    await db.commit()
