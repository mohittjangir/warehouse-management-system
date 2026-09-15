"""Master data endpoints: Categories, Units, Warehouses, Locations, Suppliers, Customers"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.database import get_db
from app.models.models import (
    Category, Unit, Warehouse, StorageLocation, Supplier, Customer, User
)
from app.schemas.schemas import (
    CategoryCreate, CategoryUpdate, CategoryResponse,
    UnitCreate, UnitUpdate, UnitResponse,
    WarehouseCreate, WarehouseUpdate, WarehouseResponse,
    StorageLocationCreate, StorageLocationUpdate, StorageLocationResponse,
    SupplierCreate, SupplierUpdate, SupplierResponse,
    CustomerCreate, CustomerUpdate, CustomerResponse,
)
from app.core.dependencies import require_admin, require_staff_or_admin
from app.services.inventory_service import create_audit_log

router = APIRouter()


# ─── Categories ──────────────────────────────────────────────────────────────

@router.get("/categories", response_model=List[CategoryResponse])
async def list_categories(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_staff_or_admin),
):
    result = await db.execute(select(Category).order_by(Category.name))
    return result.scalars().all()


@router.post("/categories", response_model=CategoryResponse, status_code=201)
async def create_category(
    body: CategoryCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    cat = Category(**body.model_dump())
    db.add(cat)
    await db.flush()
    await create_audit_log(db, current_user.id, "CATEGORY_CREATED",
                           entity_type="category", entity_id=cat.id,
                           description=f"Category '{cat.name}' created")
    await db.commit()
    await db.refresh(cat)
    return cat


@router.put("/categories/{cat_id}", response_model=CategoryResponse)
async def update_category(
    cat_id: int,
    body: CategoryUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    cat = await db.get(Category, cat_id)
    if not cat:
        raise HTTPException(404, "Category not found")
    for k, v in body.model_dump(exclude_none=True).items():
        setattr(cat, k, v)
    await db.commit()
    await db.refresh(cat)
    return cat


@router.delete("/categories/{cat_id}", status_code=204)
async def delete_category(
    cat_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    cat = await db.get(Category, cat_id)
    if not cat:
        raise HTTPException(404, "Category not found")
    cat.status = False
    await db.commit()


# ─── Units ───────────────────────────────────────────────────────────────────

@router.get("/units", response_model=List[UnitResponse])
async def list_units(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_staff_or_admin),
):
    result = await db.execute(select(Unit).order_by(Unit.name))
    return result.scalars().all()


@router.post("/units", response_model=UnitResponse, status_code=201)
async def create_unit(
    body: UnitCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    unit = Unit(**body.model_dump())
    db.add(unit)
    await db.commit()
    await db.refresh(unit)
    return unit


@router.put("/units/{unit_id}", response_model=UnitResponse)
async def update_unit(
    unit_id: int,
    body: UnitUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    unit = await db.get(Unit, unit_id)
    if not unit:
        raise HTTPException(404, "Unit not found")
    for k, v in body.model_dump(exclude_none=True).items():
        setattr(unit, k, v)
    await db.commit()
    await db.refresh(unit)
    return unit


# ─── Warehouses ──────────────────────────────────────────────────────────────

@router.get("/warehouses", response_model=List[WarehouseResponse])
async def list_warehouses(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_staff_or_admin),
):
    result = await db.execute(select(Warehouse).where(Warehouse.status == True).order_by(Warehouse.name))
    return result.scalars().all()


@router.post("/warehouses", response_model=WarehouseResponse, status_code=201)
async def create_warehouse(
    body: WarehouseCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    wh = Warehouse(**body.model_dump())
    db.add(wh)
    await db.flush()
    await create_audit_log(db, current_user.id, "WAREHOUSE_CREATED",
                           entity_type="warehouse", entity_id=wh.id,
                           description=f"Warehouse '{wh.name}' created")
    await db.commit()
    await db.refresh(wh)
    return wh


@router.put("/warehouses/{wh_id}", response_model=WarehouseResponse)
async def update_warehouse(
    wh_id: int,
    body: WarehouseUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    wh = await db.get(Warehouse, wh_id)
    if not wh:
        raise HTTPException(404, "Warehouse not found")
    for k, v in body.model_dump(exclude_none=True).items():
        setattr(wh, k, v)
    await db.commit()
    await db.refresh(wh)
    return wh


# ─── Storage Locations ───────────────────────────────────────────────────────

@router.get("/locations", response_model=List[StorageLocationResponse])
async def list_locations(
    warehouse_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_staff_or_admin),
):
    query = select(StorageLocation).where(StorageLocation.status == True)
    if warehouse_id:
        query = query.where(StorageLocation.warehouse_id == warehouse_id)
    result = await db.execute(query.order_by(StorageLocation.name))
    return result.scalars().all()


@router.post("/locations", response_model=StorageLocationResponse, status_code=201)
async def create_location(
    body: StorageLocationCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    loc = StorageLocation(**body.model_dump())
    db.add(loc)
    await db.commit()
    await db.refresh(loc)
    return loc


@router.put("/locations/{loc_id}", response_model=StorageLocationResponse)
async def update_location(
    loc_id: int,
    body: StorageLocationUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    loc = await db.get(StorageLocation, loc_id)
    if not loc:
        raise HTTPException(404, "Location not found")
    for k, v in body.model_dump(exclude_none=True).items():
        setattr(loc, k, v)
    await db.commit()
    await db.refresh(loc)
    return loc


# ─── Suppliers ───────────────────────────────────────────────────────────────

@router.get("/suppliers", response_model=List[SupplierResponse])
async def list_suppliers(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_staff_or_admin),
):
    result = await db.execute(select(Supplier).where(Supplier.status == True).order_by(Supplier.name))
    return result.scalars().all()


@router.post("/suppliers", response_model=SupplierResponse, status_code=201)
async def create_supplier(
    body: SupplierCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    sup = Supplier(**body.model_dump())
    db.add(sup)
    await db.commit()
    await db.refresh(sup)
    return sup


@router.put("/suppliers/{sup_id}", response_model=SupplierResponse)
async def update_supplier(
    sup_id: int,
    body: SupplierUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    sup = await db.get(Supplier, sup_id)
    if not sup:
        raise HTTPException(404, "Supplier not found")
    for k, v in body.model_dump(exclude_none=True).items():
        setattr(sup, k, v)
    await db.commit()
    await db.refresh(sup)
    return sup


# ─── Customers ───────────────────────────────────────────────────────────────

@router.get("/customers", response_model=List[CustomerResponse])
async def list_customers(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_staff_or_admin),
):
    result = await db.execute(select(Customer).where(Customer.status == True).order_by(Customer.name))
    return result.scalars().all()


@router.post("/customers", response_model=CustomerResponse, status_code=201)
async def create_customer(
    body: CustomerCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    cust = Customer(**body.model_dump())
    db.add(cust)
    await db.commit()
    await db.refresh(cust)
    return cust


@router.put("/customers/{cust_id}", response_model=CustomerResponse)
async def update_customer(
    cust_id: int,
    body: CustomerUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    cust = await db.get(Customer, cust_id)
    if not cust:
        raise HTTPException(404, "Customer not found")
    for k, v in body.model_dump(exclude_none=True).items():
        setattr(cust, k, v)
    await db.commit()
    await db.refresh(cust)
    return cust
