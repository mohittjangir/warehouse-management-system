"""
Critical inventory logic tests.
Tests: stock-in, stock-out, insufficient stock, carton calc, partial carton, FIFO, rollback.
"""
import pytest
from app.services.inventory_service import (
    calculate_cartons,
    cartons_to_units,
    get_stock_status,
)


# ─── Carton Calculation Tests ─────────────────────────────────────────────────

class TestCartonCalculation:
    def test_full_cartons_no_loose(self):
        cartons, loose = calculate_cartons(250, 50)
        assert cartons == 5
        assert loose == 0

    def test_partial_carton(self):
        cartons, loose = calculate_cartons(230, 50)
        assert cartons == 4
        assert loose == 30

    def test_less_than_one_carton(self):
        cartons, loose = calculate_cartons(30, 50)
        assert cartons == 0
        assert loose == 30

    def test_exact_one_carton(self):
        cartons, loose = calculate_cartons(50, 50)
        assert cartons == 1
        assert loose == 0

    def test_zero_quantity(self):
        cartons, loose = calculate_cartons(0, 50)
        assert cartons == 0
        assert loose == 0

    def test_items_per_carton_one(self):
        cartons, loose = calculate_cartons(100, 1)
        assert cartons == 100
        assert loose == 0

    def test_large_quantity(self):
        cartons, loose = calculate_cartons(1537, 100)
        assert cartons == 15
        assert loose == 37

    def test_stock_in_calculation(self):
        """5 cartons × 50 pieces = 250 pieces"""
        total = cartons_to_units(5, 0, 50)
        assert total == 250

    def test_stock_in_with_loose(self):
        """3 cartons + 15 loose = 165 pieces"""
        total = cartons_to_units(3, 15, 50)
        assert total == 165

    def test_round_trip(self):
        """Convert to units and back to cartons+loose"""
        total = cartons_to_units(4, 30, 50)
        assert total == 230
        cartons, loose = calculate_cartons(230, 50)
        assert cartons == 4
        assert loose == 30


# ─── Stock Status Tests ───────────────────────────────────────────────────────

class TestStockStatus:
    def test_out_of_stock(self):
        assert get_stock_status(0, 100, 200, 5000) == "OUT_OF_STOCK"

    def test_low_stock(self):
        assert get_stock_status(80, 100, 200, 5000) == "LOW_STOCK"

    def test_healthy(self):
        assert get_stock_status(500, 100, 200, 5000) == "HEALTHY"

    def test_overstock(self):
        assert get_stock_status(6000, 100, 200, 5000) == "OVERSTOCK"

    def test_exactly_at_minimum(self):
        assert get_stock_status(100, 100, 200, 5000) == "LOW_STOCK"

    def test_no_maximum_stock(self):
        # Without max, should not be overstock
        status = get_stock_status(99999, 100, 200, None)
        assert status == "HEALTHY"


# ─── Integration Tests (require DB) ──────────────────────────────────────────
# These tests use an in-memory SQLite database via pytest-asyncio

import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy import select
from app.db.database import Base
from app.models.models import (
    User, UserRole, UserStatus, Product, ProductStatus,
    Warehouse, Batch, InventoryBalance, StockTransaction, TransactionType,
)
from app.core.security import get_password_hash


TEST_DB_URL = "sqlite+aiosqlite:///:memory:"


@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(scope="session")
async def test_engine():
    engine = create_async_engine(TEST_DB_URL, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    await engine.dispose()


@pytest.fixture
async def db(test_engine):
    session_factory = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)
    async with session_factory() as session:
        yield session
        await session.rollback()


@pytest.fixture
async def setup_data(db):
    """Create minimal data needed for inventory tests."""
    user = User(
        name="Test Admin", email="test@admin.com",
        password_hash=get_password_hash("Test@123"),
        role=UserRole.ADMIN, status=UserStatus.ACTIVE,
    )
    warehouse = Warehouse(name="Test WH", code="TWH-001", status=True)
    product = Product(
        sku="TEST-001", name="Test Product",
        items_per_carton=50, minimum_stock=100,
        reorder_level=200, status=ProductStatus.ACTIVE,
    )
    db.add_all([user, warehouse, product])
    await db.flush()
    return {"user": user, "warehouse": warehouse, "product": product}


@pytest.mark.asyncio
async def test_stock_in_creates_correct_balance(db, setup_data):
    """Stock In: 0 + 500 = 500 pieces"""
    from app.services.inventory_service import add_stock

    data = setup_data
    async with db.begin():
        txn = await add_stock(
            db=db,
            product_id=data["product"].id,
            warehouse_id=data["warehouse"].id,
            location_id=None,
            carton_quantity=10,
            unit_quantity=0,
            batch_number="TEST-BATCH-001",
            manufacturing_date=None,
            expiry_date=None,
            supplier_id=None,
            reference_number="REF-001",
            remarks="Test stock in",
            user=data["user"],
        )

    assert txn.quantity == 500  # 10 cartons × 50 = 500
    assert txn.new_balance == 500
    assert txn.previous_balance == 0
    assert txn.transaction_type == TransactionType.STOCK_IN

    # Verify balance in DB
    from app.services.inventory_service import get_total_product_quantity
    balance = await get_total_product_quantity(db, data["product"].id)
    assert balance == 500


@pytest.mark.asyncio
async def test_stock_out_reduces_balance(db, setup_data):
    """Stock Out: 500 - 70 = 430"""
    from app.services.inventory_service import add_stock, remove_stock

    data = setup_data
    # First add stock
    async with db.begin():
        await add_stock(
            db=db, product_id=data["product"].id,
            warehouse_id=data["warehouse"].id, location_id=None,
            carton_quantity=10, unit_quantity=0,
            batch_number="TEST-BATCH-OUT-001",
            manufacturing_date=None, expiry_date=None,
            supplier_id=None, reference_number=None, remarks=None,
            user=data["user"],
        )

    # Then remove
    async with db.begin():
        txns = await remove_stock(
            db=db, product_id=data["product"].id,
            warehouse_id=data["warehouse"].id, location_id=None,
            quantity=70, customer_id=None,
            reference_number=None, remarks=None, reason="Test",
            user=data["user"],
        )

    assert len(txns) == 1
    assert txns[0].quantity == 70
    assert txns[0].transaction_type == TransactionType.STOCK_OUT


@pytest.mark.asyncio
async def test_insufficient_stock_raises_error(db, setup_data):
    """Insufficient stock: 100 - 150 = ERROR"""
    from app.services.inventory_service import add_stock, remove_stock

    data = setup_data
    # Add only 100 units (2 cartons)
    async with db.begin():
        await add_stock(
            db=db, product_id=data["product"].id,
            warehouse_id=data["warehouse"].id, location_id=None,
            carton_quantity=2, unit_quantity=0,
            batch_number="TEST-INSUF-001",
            manufacturing_date=None, expiry_date=None,
            supplier_id=None, reference_number=None, remarks=None,
            user=data["user"],
        )

    with pytest.raises(ValueError, match="Insufficient stock"):
        async with db.begin():
            await remove_stock(
                db=db, product_id=data["product"].id,
                warehouse_id=data["warehouse"].id, location_id=None,
                quantity=150,  # More than available
                customer_id=None, reference_number=None,
                remarks=None, reason=None, user=data["user"],
            )


@pytest.mark.asyncio
async def test_fifo_batch_allocation(db, setup_data):
    """FIFO: Batch A=100, Batch B=200, Stock Out 120 → Batch A=0, Batch B=180"""
    from app.services.inventory_service import add_stock, remove_stock
    from app.models.models import BatchStatus

    data = setup_data

    # Batch A (older)
    async with db.begin():
        await add_stock(
            db=db, product_id=data["product"].id,
            warehouse_id=data["warehouse"].id, location_id=None,
            carton_quantity=2, unit_quantity=0,  # 100 units
            batch_number="FIFO-BATCH-A",
            manufacturing_date=None, expiry_date=None,
            supplier_id=None, reference_number=None, remarks=None,
            user=data["user"],
        )

    # Batch B (newer — added after)
    async with db.begin():
        await add_stock(
            db=db, product_id=data["product"].id,
            warehouse_id=data["warehouse"].id, location_id=None,
            carton_quantity=4, unit_quantity=0,  # 200 units
            batch_number="FIFO-BATCH-B",
            manufacturing_date=None, expiry_date=None,
            supplier_id=None, reference_number=None, remarks=None,
            user=data["user"],
        )

    # Stock out 120 units (FIFO should take all of Batch A + 20 from Batch B)
    async with db.begin():
        txns = await remove_stock(
            db=db, product_id=data["product"].id,
            warehouse_id=data["warehouse"].id, location_id=None,
            quantity=120, customer_id=None,
            reference_number=None, remarks=None, reason="FIFO test",
            user=data["user"],
        )

    # Verify batches
    batch_a_r = await db.execute(
        select(Batch).where(Batch.batch_number == "FIFO-BATCH-A",
                            Batch.product_id == data["product"].id)
    )
    batch_a = batch_a_r.scalar_one_or_none()

    batch_b_r = await db.execute(
        select(Batch).where(Batch.batch_number == "FIFO-BATCH-B",
                            Batch.product_id == data["product"].id)
    )
    batch_b = batch_b_r.scalar_one_or_none()

    assert batch_a is not None
    assert batch_a.remaining_quantity == 0
    assert batch_a.status == BatchStatus.DEPLETED

    assert batch_b is not None
    assert batch_b.remaining_quantity == 180  # 200 - 20


@pytest.mark.asyncio
async def test_partial_carton_display(db, setup_data):
    """Partial carton: 230 units → 4 cartons + 30 pieces"""
    from app.services.inventory_service import add_stock, remove_stock, calculate_cartons, get_total_product_quantity

    data = setup_data

    # Add 250 units (5 cartons)
    async with db.begin():
        await add_stock(
            db=db, product_id=data["product"].id,
            warehouse_id=data["warehouse"].id, location_id=None,
            carton_quantity=5, unit_quantity=0,
            batch_number="PARTIAL-BATCH-001",
            manufacturing_date=None, expiry_date=None,
            supplier_id=None, reference_number=None, remarks=None,
            user=data["user"],
        )

    # Remove 20 units
    async with db.begin():
        await remove_stock(
            db=db, product_id=data["product"].id,
            warehouse_id=data["warehouse"].id, location_id=None,
            quantity=20, customer_id=None,
            reference_number=None, remarks=None, reason="Partial test",
            user=data["user"],
        )

    total = await get_total_product_quantity(db, data["product"].id)
    cartons, loose = calculate_cartons(total, data["product"].items_per_carton)

    assert total == 230
    assert cartons == 4
    assert loose == 30
