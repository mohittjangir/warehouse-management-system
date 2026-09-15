from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr, field_validator
from app.models.models import UserRole, UserStatus


# ─── Auth ────────────────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: int
    name: str
    email: str
    role: UserRole


# ─── User ────────────────────────────────────────────────────────────────────

class UserBase(BaseModel):
    name: str
    email: EmailStr
    role: UserRole = UserRole.INVENTORY_STAFF


class UserCreate(UserBase):
    password: str

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v


class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    role: Optional[UserRole] = None
    status: Optional[UserStatus] = None


class UserPasswordReset(BaseModel):
    new_password: str

    @field_validator("new_password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v


class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    role: UserRole
    status: UserStatus
    created_at: datetime

    model_config = {"from_attributes": True}


# ─── Category ────────────────────────────────────────────────────────────────

class CategoryBase(BaseModel):
    name: str
    description: Optional[str] = None
    status: bool = True


class CategoryCreate(CategoryBase):
    pass


class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[bool] = None


class CategoryResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    status: bool
    created_at: datetime

    model_config = {"from_attributes": True}


# ─── Unit ────────────────────────────────────────────────────────────────────

class UnitBase(BaseModel):
    name: str
    short_code: str


class UnitCreate(UnitBase):
    pass


class UnitUpdate(BaseModel):
    name: Optional[str] = None
    short_code: Optional[str] = None


class UnitResponse(BaseModel):
    id: int
    name: str
    short_code: str

    model_config = {"from_attributes": True}


# ─── Warehouse ───────────────────────────────────────────────────────────────

class WarehouseBase(BaseModel):
    name: str
    code: str
    address: Optional[str] = None
    status: bool = True


class WarehouseCreate(WarehouseBase):
    pass


class WarehouseUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    address: Optional[str] = None
    status: Optional[bool] = None


class WarehouseResponse(BaseModel):
    id: int
    name: str
    code: str
    address: Optional[str]
    status: bool

    model_config = {"from_attributes": True}


# ─── Storage Location ────────────────────────────────────────────────────────

class StorageLocationBase(BaseModel):
    warehouse_id: int
    name: str
    code: str
    description: Optional[str] = None
    status: bool = True


class StorageLocationCreate(StorageLocationBase):
    pass


class StorageLocationUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    description: Optional[str] = None
    status: Optional[bool] = None


class StorageLocationResponse(BaseModel):
    id: int
    warehouse_id: int
    name: str
    code: str
    description: Optional[str]
    status: bool

    model_config = {"from_attributes": True}


# ─── Supplier ────────────────────────────────────────────────────────────────

class SupplierBase(BaseModel):
    name: str
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    status: bool = True


class SupplierCreate(SupplierBase):
    pass


class SupplierUpdate(BaseModel):
    name: Optional[str] = None
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    status: Optional[bool] = None


class SupplierResponse(BaseModel):
    id: int
    name: str
    contact_person: Optional[str]
    phone: Optional[str]
    email: Optional[str]
    address: Optional[str]
    status: bool

    model_config = {"from_attributes": True}


# ─── Customer ────────────────────────────────────────────────────────────────

class CustomerBase(BaseModel):
    name: str
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    status: bool = True


class CustomerCreate(CustomerBase):
    pass


class CustomerUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    status: Optional[bool] = None


class CustomerResponse(BaseModel):
    id: int
    name: str
    phone: Optional[str]
    email: Optional[str]
    address: Optional[str]
    status: bool

    model_config = {"from_attributes": True}


# ─── Product ─────────────────────────────────────────────────────────────────

class ProductBase(BaseModel):
    sku: str
    name: str
    product_code: Optional[str] = None
    category_id: Optional[int] = None
    unit_id: Optional[int] = None
    description: Optional[str] = None
    items_per_carton: int = 1
    minimum_stock: float = 0
    maximum_stock: Optional[float] = None
    reorder_level: float = 0


class ProductCreate(ProductBase):
    @field_validator("items_per_carton")
    @classmethod
    def items_per_carton_positive(cls, v: int) -> int:
        if v <= 0:
            raise ValueError("Items per carton must be greater than 0")
        return v


class ProductUpdate(BaseModel):
    sku: Optional[str] = None
    name: Optional[str] = None
    product_code: Optional[str] = None
    category_id: Optional[int] = None
    unit_id: Optional[int] = None
    description: Optional[str] = None
    items_per_carton: Optional[int] = None
    minimum_stock: Optional[float] = None
    maximum_stock: Optional[float] = None
    reorder_level: Optional[float] = None
    status: Optional[str] = None


class ProductResponse(BaseModel):
    id: int
    sku: str
    name: str
    product_code: Optional[str]
    category_id: Optional[int]
    category_name: Optional[str] = None
    unit_id: Optional[int]
    unit_name: Optional[str] = None
    unit_short_code: Optional[str] = None
    description: Optional[str]
    items_per_carton: int
    minimum_stock: float
    maximum_stock: Optional[float]
    reorder_level: float
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}


class ProductWithInventory(ProductResponse):
    total_quantity: float = 0
    cartons: int = 0
    loose_units: float = 0
    stock_status: str = "OUT_OF_STOCK"


# ─── Batch ───────────────────────────────────────────────────────────────────

class BatchResponse(BaseModel):
    id: int
    product_id: int
    batch_number: str
    manufacturing_date: Optional[datetime]
    expiry_date: Optional[datetime]
    received_date: datetime
    initial_quantity: float
    remaining_quantity: float
    warehouse_id: int
    location_id: Optional[int]
    status: str
    age_days: Optional[int] = None

    model_config = {"from_attributes": True}


# ─── Stock In ────────────────────────────────────────────────────────────────

class StockInRequest(BaseModel):
    product_id: int
    warehouse_id: int
    location_id: Optional[int] = None
    supplier_id: Optional[int] = None
    batch_number: str
    carton_quantity: float = 0
    unit_quantity: float = 0
    manufacturing_date: Optional[datetime] = None
    expiry_date: Optional[datetime] = None
    reference_number: Optional[str] = None
    remarks: Optional[str] = None

    @field_validator("manufacturing_date", "expiry_date")
    @classmethod
    def make_naive(cls, v: Optional[datetime]) -> Optional[datetime]:
        if v and v.tzinfo:
            return v.replace(tzinfo=None)
        return v

    @field_validator("carton_quantity", "unit_quantity")
    @classmethod
    def non_negative(cls, v: float) -> float:
        if v < 0:
            raise ValueError("Quantity must be non-negative")
        return v


class StockOutRequest(BaseModel):
    product_id: int
    warehouse_id: int
    location_id: Optional[int] = None
    customer_id: Optional[int] = None
    quantity: float  # total base units
    reference_number: Optional[str] = None
    remarks: Optional[str] = None
    reason: Optional[str] = None

    @field_validator("quantity")
    @classmethod
    def quantity_positive(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("Quantity must be greater than 0")
        return v


class AdjustmentRequest(BaseModel):
    product_id: int
    warehouse_id: int
    location_id: Optional[int] = None
    quantity: float  # can be negative for reduction
    reason: str
    reference_number: Optional[str] = None
    remarks: Optional[str] = None


class StockTransactionResponse(BaseModel):
    id: int
    transaction_number: str
    transaction_type: str
    product_id: int
    product_name: Optional[str] = None
    product_sku: Optional[str] = None
    batch_id: Optional[int]
    batch_number: Optional[str] = None
    quantity: float
    carton_quantity: Optional[float]
    unit_quantity: Optional[float]
    previous_balance: float
    new_balance: float
    warehouse_id: Optional[int]
    warehouse_name: Optional[str] = None
    location_id: Optional[int]
    location_name: Optional[str] = None
    supplier_id: Optional[int]
    supplier_name: Optional[str] = None
    customer_id: Optional[int]
    customer_name: Optional[str] = None
    reference_number: Optional[str]
    user_id: int
    user_name: Optional[str] = None
    remarks: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}


# ─── Inventory ───────────────────────────────────────────────────────────────

class InventoryBalanceResponse(BaseModel):
    product_id: int
    sku: str
    product_name: str
    category_name: Optional[str]
    warehouse_id: Optional[int]
    warehouse_name: Optional[str]
    location_id: Optional[int]
    location_name: Optional[str]
    total_quantity: float
    cartons: int
    loose_units: float
    items_per_carton: int
    stock_status: str
    reorder_level: float
    minimum_stock: float
    oldest_batch_date: Optional[datetime] = None

    model_config = {"from_attributes": True}


# ─── Dashboard ───────────────────────────────────────────────────────────────

class AdminDashboardResponse(BaseModel):
    total_products: int
    total_stock: float
    total_cartons: int
    stock_in_today: float
    stock_out_today: float
    low_stock_count: int
    out_of_stock_count: int
    stock_movement_chart: List[dict]
    inventory_by_category: List[dict]
    recent_activity: List[dict]


class InventoryDashboardResponse(BaseModel):
    total_products: int
    available_stock: float
    total_cartons: int
    stock_in_today: float
    stock_out_today: float
    low_stock_count: int
    out_of_stock_count: int
    recent_stock_in: List[dict]
    recent_stock_out: List[dict]
    low_stock_products: List[dict]


# ─── Audit Log ───────────────────────────────────────────────────────────────

class AuditLogResponse(BaseModel):
    id: int
    user_id: Optional[int]
    user_name: Optional[str] = None
    action: str
    entity_type: Optional[str]
    entity_id: Optional[int]
    description: Optional[str]
    old_value: Optional[dict]
    new_value: Optional[dict]
    ip_address: Optional[str]
    timestamp: datetime

    model_config = {"from_attributes": True}


# ─── Pagination ──────────────────────────────────────────────────────────────

class PaginatedResponse(BaseModel):
    items: List
    total: int
    page: int
    page_size: int
    total_pages: int
