import enum
from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime, Text,
    ForeignKey, Enum as SAEnum, Index, JSON
)
from sqlalchemy.orm import relationship
from app.db.database import Base


class UserRole(str, enum.Enum):
    ADMIN = "ADMIN"
    INVENTORY_STAFF = "INVENTORY_STAFF"


class UserStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"


class ProductStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"


class StockStatus(str, enum.Enum):
    HEALTHY = "HEALTHY"
    LOW_STOCK = "LOW_STOCK"
    OUT_OF_STOCK = "OUT_OF_STOCK"
    OVERSTOCK = "OVERSTOCK"


class TransactionType(str, enum.Enum):
    STOCK_IN = "STOCK_IN"
    STOCK_OUT = "STOCK_OUT"
    ADJUSTMENT = "ADJUSTMENT"
    TRANSFER = "TRANSFER"


class BatchStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    DEPLETED = "DEPLETED"
    EXPIRED = "EXPIRED"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(SAEnum(UserRole), nullable=False, default=UserRole.INVENTORY_STAFF)
    status = Column(SAEnum(UserStatus), nullable=False, default=UserStatus.ACTIVE)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    stock_transactions = relationship("StockTransaction", back_populates="user")
    audit_logs = relationship("AuditLog", back_populates="user")


class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    description = Column(Text, nullable=True)
    status = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    products = relationship("Product", back_populates="category")


class Unit(Base):
    __tablename__ = "units"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True, nullable=False)
    short_code = Column(String(10), unique=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    products = relationship("Product", back_populates="unit")


class Warehouse(Base):
    __tablename__ = "warehouses"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    code = Column(String(20), unique=True, nullable=False)
    address = Column(Text, nullable=True)
    status = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    locations = relationship("StorageLocation", back_populates="warehouse")
    batches = relationship("Batch", back_populates="warehouse")
    stock_transactions = relationship("StockTransaction", back_populates="warehouse")
    inventory_balances = relationship("InventoryBalance", back_populates="warehouse")


class StorageLocation(Base):
    __tablename__ = "storage_locations"

    id = Column(Integer, primary_key=True, index=True)
    warehouse_id = Column(Integer, ForeignKey("warehouses.id"), nullable=False)
    name = Column(String(100), nullable=False)
    code = Column(String(20), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    warehouse = relationship("Warehouse", back_populates="locations")
    batches = relationship("Batch", back_populates="location")
    stock_transactions = relationship("StockTransaction", back_populates="location")
    inventory_balances = relationship("InventoryBalance", back_populates="location")

    __table_args__ = (Index("ix_storage_locations_warehouse_id", "warehouse_id"),)


class Supplier(Base):
    __tablename__ = "suppliers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    contact_person = Column(String(100), nullable=True)
    phone = Column(String(20), nullable=True)
    email = Column(String(255), nullable=True)
    address = Column(Text, nullable=True)
    status = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    stock_transactions = relationship("StockTransaction", back_populates="supplier")


class Customer(Base):
    __tablename__ = "customers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    phone = Column(String(20), nullable=True)
    email = Column(String(255), nullable=True)
    address = Column(Text, nullable=True)
    status = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    stock_transactions = relationship("StockTransaction", back_populates="customer")


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    sku = Column(String(50), unique=True, nullable=False, index=True)
    name = Column(String(200), nullable=False)
    product_code = Column(String(50), nullable=True)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=True)
    unit_id = Column(Integer, ForeignKey("units.id"), nullable=True)
    description = Column(Text, nullable=True)
    items_per_carton = Column(Integer, nullable=False, default=1)
    minimum_stock = Column(Float, nullable=False, default=0)
    maximum_stock = Column(Float, nullable=True, default=0)
    reorder_level = Column(Float, nullable=False, default=0)
    status = Column(SAEnum(ProductStatus), nullable=False, default=ProductStatus.ACTIVE)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    category = relationship("Category", back_populates="products")
    unit = relationship("Unit", back_populates="products")
    batches = relationship("Batch", back_populates="product")
    stock_transactions = relationship("StockTransaction", back_populates="product")
    inventory_balances = relationship("InventoryBalance", back_populates="product")

    __table_args__ = (
        Index("ix_products_category_id", "category_id"),
        Index("ix_products_status", "status"),
    )


class Batch(Base):
    __tablename__ = "batches"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False, index=True)
    batch_number = Column(String(100), nullable=False, index=True)
    manufacturing_date = Column(DateTime, nullable=True)
    expiry_date = Column(DateTime, nullable=True)
    received_date = Column(DateTime, nullable=False, default=datetime.utcnow)
    initial_quantity = Column(Float, nullable=False)
    remaining_quantity = Column(Float, nullable=False)
    warehouse_id = Column(Integer, ForeignKey("warehouses.id"), nullable=False)
    location_id = Column(Integer, ForeignKey("storage_locations.id"), nullable=True)
    status = Column(SAEnum(BatchStatus), nullable=False, default=BatchStatus.ACTIVE)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    product = relationship("Product", back_populates="batches")
    warehouse = relationship("Warehouse", back_populates="batches")
    location = relationship("StorageLocation", back_populates="batches")
    stock_transactions = relationship("StockTransaction", back_populates="batch")

    __table_args__ = (
        Index("ix_batches_product_warehouse", "product_id", "warehouse_id"),
        Index("ix_batches_status", "status"),
        Index("ix_batches_received_date", "received_date"),
    )


class StockTransaction(Base):
    __tablename__ = "stock_transactions"

    id = Column(Integer, primary_key=True, index=True)
    transaction_number = Column(String(50), unique=True, nullable=False, index=True)
    transaction_type = Column(SAEnum(TransactionType), nullable=False, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False, index=True)
    batch_id = Column(Integer, ForeignKey("batches.id"), nullable=True, index=True)
    quantity = Column(Float, nullable=False)  # base units
    carton_quantity = Column(Float, nullable=True)
    unit_quantity = Column(Float, nullable=True)  # loose units
    previous_balance = Column(Float, nullable=False, default=0)
    new_balance = Column(Float, nullable=False, default=0)
    warehouse_id = Column(Integer, ForeignKey("warehouses.id"), nullable=True)
    location_id = Column(Integer, ForeignKey("storage_locations.id"), nullable=True)
    supplier_id = Column(Integer, ForeignKey("suppliers.id"), nullable=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=True)
    reference_number = Column(String(100), nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    remarks = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    product = relationship("Product", back_populates="stock_transactions")
    batch = relationship("Batch", back_populates="stock_transactions")
    warehouse = relationship("Warehouse", back_populates="stock_transactions")
    location = relationship("StorageLocation", back_populates="stock_transactions")
    supplier = relationship("Supplier", back_populates="stock_transactions")
    customer = relationship("Customer", back_populates="stock_transactions")
    user = relationship("User", back_populates="stock_transactions")

    __table_args__ = (
        Index("ix_stock_transactions_product_type", "product_id", "transaction_type"),
    )


class InventoryBalance(Base):
    __tablename__ = "inventory_balances"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    warehouse_id = Column(Integer, ForeignKey("warehouses.id"), nullable=True)
    location_id = Column(Integer, ForeignKey("storage_locations.id"), nullable=True)
    total_quantity = Column(Float, nullable=False, default=0)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    product = relationship("Product", back_populates="inventory_balances")
    warehouse = relationship("Warehouse", back_populates="inventory_balances")
    location = relationship("StorageLocation", back_populates="inventory_balances")

    __table_args__ = (
        Index("ix_inventory_balances_product_warehouse", "product_id", "warehouse_id"),
    )


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    action = Column(String(100), nullable=False, index=True)
    entity_type = Column(String(50), nullable=True)
    entity_id = Column(Integer, nullable=True)
    old_value = Column(JSON, nullable=True)
    new_value = Column(JSON, nullable=True)
    description = Column(Text, nullable=True)
    ip_address = Column(String(50), nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)

    user = relationship("User", back_populates="audit_logs")
