"""
Seed data for development and testing.
Creates default admin, staff users, master data, and sample inventory.
"""
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.database import AsyncSessionLocal
from app.models.models import (
    User, UserRole, UserStatus, Category, Unit, Warehouse,
    StorageLocation, Supplier, Customer, Product, ProductStatus,
    Batch, BatchStatus, InventoryBalance,
)
from app.core.security import get_password_hash


async def seed_data():
    async with AsyncSessionLocal() as db:
        try:
            # Check if already seeded
            result = await db.execute(select(User).where(User.email == "admin@warehouse.com"))
            if result.scalar_one_or_none():
                return  # Already seeded

            # ─── Users ───────────────────────────────────────────────
            admin = User(
                name="System Admin",
                email="admin@warehouse.com",
                password_hash=get_password_hash("Admin@123456"),
                role=UserRole.ADMIN,
                status=UserStatus.ACTIVE,
            )
            staff1 = User(
                name="Rahul Sharma",
                email="rahul@warehouse.com",
                password_hash=get_password_hash("Staff@123456"),
                role=UserRole.INVENTORY_STAFF,
                status=UserStatus.ACTIVE,
            )
            staff2 = User(
                name="Amit Kumar",
                email="amit@warehouse.com",
                password_hash=get_password_hash("Staff@123456"),
                role=UserRole.INVENTORY_STAFF,
                status=UserStatus.ACTIVE,
            )
            db.add_all([admin, staff1, staff2])
            await db.flush()

            # ─── Categories ──────────────────────────────────────────
            cat_packaging = Category(name="Packaging", description="Packaging materials and boxes", status=True)
            cat_protective = Category(name="Protective Materials", description="Bubble wrap, foam etc.", status=True)
            cat_containers = Category(name="Containers", description="Plastic and storage containers", status=True)
            db.add_all([cat_packaging, cat_protective, cat_containers])
            await db.flush()

            # ─── Units ───────────────────────────────────────────────
            unit_piece = Unit(name="Piece", short_code="PCS")
            unit_roll = Unit(name="Roll", short_code="ROL")
            unit_meter = Unit(name="Meter", short_code="MTR")
            db.add_all([unit_piece, unit_roll, unit_meter])
            await db.flush()

            # ─── Warehouses ──────────────────────────────────────────
            wh1 = Warehouse(name="Main Warehouse", code="WH-001", address="Plot 12, Industrial Area, Mumbai", status=True)
            wh2 = Warehouse(name="Secondary Warehouse", code="WH-002", address="Plot 45, Storage Zone, Pune", status=True)
            db.add_all([wh1, wh2])
            await db.flush()

            # ─── Storage Locations ───────────────────────────────────
            loc1 = StorageLocation(warehouse_id=wh1.id, name="Rack A - Shelf 1", code="A1", description="Front rack, top shelf", status=True)
            loc2 = StorageLocation(warehouse_id=wh1.id, name="Rack A - Shelf 2", code="A2", description="Front rack, bottom shelf", status=True)
            loc3 = StorageLocation(warehouse_id=wh1.id, name="Rack B - Shelf 1", code="B1", description="Back rack, top shelf", status=True)
            loc4 = StorageLocation(warehouse_id=wh2.id, name="Zone 1 - Row 1", code="Z1R1", description="Main storage zone", status=True)
            loc5 = StorageLocation(warehouse_id=wh2.id, name="Zone 1 - Row 2", code="Z1R2", description="Secondary storage zone", status=True)
            db.add_all([loc1, loc2, loc3, loc4, loc5])
            await db.flush()

            # ─── Suppliers ───────────────────────────────────────────
            sup1 = Supplier(name="PackMart Industries", contact_person="Vikram Mehta", phone="+91-9876543210", email="vikram@packmart.com", address="123 Industrial Rd, Delhi", status=True)
            sup2 = Supplier(name="Box World Pvt Ltd", contact_person="Priya Singh", phone="+91-9876543211", email="priya@boxworld.com", address="456 Commerce St, Mumbai", status=True)
            sup3 = Supplier(name="SafePack Co.", contact_person="Rajan Gupta", phone="+91-9876543212", email="rajan@safepack.com", address="789 Logistics Park, Chennai", status=True)
            db.add_all([sup1, sup2, sup3])
            await db.flush()

            # ─── Customers ───────────────────────────────────────────
            cust1 = Customer(name="Flipkart Logistics", phone="+91-8765432100", email="logistics@flipkart.com", address="Flipkart Campus, Bangalore", status=True)
            cust2 = Customer(name="Amazon India", phone="+91-8765432101", email="supply@amazon.in", address="Amazon Warehouse, Hyderabad", status=True)
            cust3 = Customer(name="Meesho Pvt Ltd", phone="+91-8765432102", email="ops@meesho.com", address="Meesho HQ, Bangalore", status=True)
            db.add_all([cust1, cust2, cust3])
            await db.flush()

            # ─── Products ────────────────────────────────────────────
            products = [
                Product(sku="SB-001", name="Small Packaging Box", product_code="PKG-S", category_id=cat_packaging.id, unit_id=unit_piece.id, description="Small corrugated packaging box 20x15x10cm", items_per_carton=50, minimum_stock=100, maximum_stock=5000, reorder_level=200, status=ProductStatus.ACTIVE),
                Product(sku="MB-002", name="Medium Packaging Box", product_code="PKG-M", category_id=cat_packaging.id, unit_id=unit_piece.id, description="Medium corrugated packaging box 30x25x20cm", items_per_carton=25, minimum_stock=80, maximum_stock=3000, reorder_level=150, status=ProductStatus.ACTIVE),
                Product(sku="LB-003", name="Large Packaging Box", product_code="PKG-L", category_id=cat_packaging.id, unit_id=unit_piece.id, description="Large corrugated packaging box 45x35x30cm", items_per_carton=10, minimum_stock=50, maximum_stock=2000, reorder_level=100, status=ProductStatus.ACTIVE),
                Product(sku="PT-004", name="Packaging Tape (48mm)", product_code="TAPE-48", category_id=cat_packaging.id, unit_id=unit_roll.id, description="Brown packaging tape 48mm x 100m", items_per_carton=36, minimum_stock=50, maximum_stock=2000, reorder_level=100, status=ProductStatus.ACTIVE),
                Product(sku="BW-005", name="Bubble Wrap Roll", product_code="BWRAP-1", category_id=cat_protective.id, unit_id=unit_roll.id, description="Anti-static bubble wrap 1m x 50m per roll", items_per_carton=5, minimum_stock=20, maximum_stock=500, reorder_level=40, status=ProductStatus.ACTIVE),
                Product(sku="PC-006", name="Plastic Container (2L)", product_code="CONT-2L", category_id=cat_containers.id, unit_id=unit_piece.id, description="Airtight 2L plastic container with lid", items_per_carton=12, minimum_stock=60, maximum_stock=1200, reorder_level=120, status=ProductStatus.ACTIVE),
                Product(sku="PC-007", name="Plastic Container (5L)", product_code="CONT-5L", category_id=cat_containers.id, unit_id=unit_piece.id, description="Heavy duty 5L container", items_per_carton=6, minimum_stock=30, maximum_stock=600, reorder_level=60, status=ProductStatus.ACTIVE),
                Product(sku="FP-008", name="Foam Padding Sheet", product_code="FOAM-1", category_id=cat_protective.id, unit_id=unit_piece.id, description="5mm foam padding sheet 60x40cm", items_per_carton=100, minimum_stock=200, maximum_stock=10000, reorder_level=400, status=ProductStatus.ACTIVE),
            ]
            db.add_all(products)
            await db.flush()

            # ─── Sample Batches & Inventory ──────────────────────────
            # Helper: create batch + update balance
            async def make_batch(product_id, batch_num, qty, wh_id, loc_id, days_ago):
                received = datetime.utcnow() - timedelta(days=days_ago)
                batch = Batch(
                    product_id=product_id,
                    batch_number=batch_num,
                    received_date=received,
                    initial_quantity=qty,
                    remaining_quantity=qty,
                    warehouse_id=wh_id,
                    location_id=loc_id,
                    status=BatchStatus.ACTIVE,
                )
                db.add(batch)
                await db.flush()

                # Update or create balance
                bal_result = await db.execute(
                    select(InventoryBalance).where(
                        InventoryBalance.product_id == product_id,
                        InventoryBalance.warehouse_id == wh_id,
                        InventoryBalance.location_id == loc_id,
                    )
                )
                bal = bal_result.scalar_one_or_none()
                if bal:
                    bal.total_quantity += qty
                else:
                    bal = InventoryBalance(
                        product_id=product_id,
                        warehouse_id=wh_id,
                        location_id=loc_id,
                        total_quantity=qty,
                    )
                    db.add(bal)

            # Small Box - 1000 pieces (20 cartons) in WH1
            await make_batch(products[0].id, "SB-2026-01", 500, wh1.id, loc1.id, 45)
            await make_batch(products[0].id, "SB-2026-02", 500, wh1.id, loc1.id, 15)

            # Medium Box - 500 pieces in WH1
            await make_batch(products[1].id, "MB-2026-01", 250, wh1.id, loc2.id, 30)
            await make_batch(products[1].id, "MB-2026-02", 250, wh1.id, loc2.id, 10)

            # Large Box - low stock (30 pieces, reorder=100)
            await make_batch(products[2].id, "LB-2026-01", 30, wh1.id, loc3.id, 20)

            # Packaging Tape - 180 rolls
            await make_batch(products[3].id, "PT-2026-01", 108, wh1.id, loc1.id, 25)
            await make_batch(products[3].id, "PT-2026-02", 72, wh2.id, loc4.id, 5)

            # Bubble Wrap - 50 rolls (at reorder level)
            await make_batch(products[4].id, "BW-2026-01", 25, wh1.id, loc2.id, 60)
            await make_batch(products[4].id, "BW-2026-02", 25, wh2.id, loc4.id, 20)

            # Plastic Container 2L - 600 pieces
            await make_batch(products[5].id, "PC-2026-01", 360, wh1.id, loc3.id, 35)
            await make_batch(products[5].id, "PC-2026-02", 240, wh2.id, loc5.id, 10)

            # Plastic Container 5L - 0 pieces (out of stock)
            # No batches — remains out of stock

            # Foam Padding - 800 pieces (8 cartons)
            await make_batch(products[7].id, "FP-2026-01", 500, wh1.id, loc1.id, 90)
            await make_batch(products[7].id, "FP-2026-02", 300, wh1.id, loc2.id, 45)

            await db.commit()
            print("✅ Seed data created successfully")
            print("   Admin: admin@warehouse.com / Admin@123456")
            print("   Staff: rahul@warehouse.com / Staff@123456")
            print("   Staff: amit@warehouse.com  / Staff@123456")

        except Exception as e:
            await db.rollback()
            print(f"⚠️  Seed data skipped or failed: {e}")
