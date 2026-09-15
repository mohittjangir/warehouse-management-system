# Warehouse Inventory Management System (WIMS)

A production-grade, full-stack warehouse inventory management system with real-time stock tracking, FIFO batch management, and complete audit trails.

## 🚀 Features

- **Dual Portals**: Admin and Inventory Staff with role-based access
- **FIFO Inventory**: Oldest stock consumed first, batch-level tracking
- **Carton/Unit Model**: Supports full cartons + partial (loose) units
- **Real-time Dashboards**: Live stats, charts, and activity feeds
- **Stock In / Stock Out**: Atomic transactions with validation
- **Inventory Adjustments**: Admin-controlled corrections with audit trail
- **Reports**: Stock, ageing (0-30/31-60/61-90/90+ days), movement reports
- **CSV Export**: All reports downloadable
- **Audit Logs**: Every action tracked with user, time, and details
- **Master Data**: Products, categories, units, warehouses, locations, suppliers, customers

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, TypeScript, Tailwind CSS v4 |
| State | React Query, React Hook Form, Zod |
| Charts | Recharts |
| Backend | Python 3.11+, FastAPI, SQLAlchemy 2.0 (async) |
| Auth | JWT (python-jose), bcrypt (passlib) |
| Database | SQLite (dev) / PostgreSQL (prod) |
| Testing | pytest, pytest-asyncio |

## 📁 Project Structure

```
warehouse-management-system/
├── frontend/          # React + Vite + TypeScript + Tailwind
├── backend/           # FastAPI + SQLAlchemy + Alembic
│   ├── app/
│   │   ├── api/v1/endpoints/  # Route handlers
│   │   ├── models/            # SQLAlchemy models
│   │   ├── schemas/           # Pydantic schemas
│   │   ├── services/          # Business logic (inventory engine)
│   │   ├── core/              # Config, security, auth dependencies
│   │   └── db/                # Database, session, seed data
│   └── tests/                 # pytest test suite
├── .env.example
└── README.md
```

## ⚡ Quick Start

### Backend

```bash
cd backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start the server (SQLite auto-configured for dev)
uvicorn app.main:app --reload --port 8000
```

The backend will auto-create the database and seed it with sample data on first run.

API Docs: http://localhost:8000/docs
ReDoc: http://localhost:8000/redoc

### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start dev server
npm run dev
```

App: http://localhost:5173

## 🔑 Default Development Credentials

> ⚠️ Change these in production!

| Role | Email | Password |
|------|-------|----------|
| **Admin** | admin@warehouse.com | Admin@123456 |
| **Staff** | rahul@warehouse.com | Staff@123456 |
| **Staff** | amit@warehouse.com | Staff@123456 |

## 🗄 Database

### SQLite (Default — Zero Setup)
```bash
DATABASE_URL=sqlite+aiosqlite:///./warehouse.db
```

### PostgreSQL (Production)
```bash
DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/warehouse_db
```

### Environment Variables
Copy `.env.example` to `.env` and configure:

```
DATABASE_URL=sqlite+aiosqlite:///./warehouse.db
SECRET_KEY=your-secret-key-min-32-chars
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=480
CORS_ORIGINS=http://localhost:5173
```

## 🧪 Testing

```bash
cd backend
source venv/bin/activate
pytest tests/ -v
```

Tests cover:
- Stock In (100 + 50 = 150)
- Stock Out (150 - 30 = 120)
- Insufficient Stock (100 - 150 = ERROR)
- Carton Calculation (5 cartons × 50 = 250)
- Partial Carton (230 units = 4 cartons + 30 loose)
- FIFO (Batch A=100, Batch B=200, Out=120 → A depleted, B=180)
- Transaction Rollback

## 📊 Seed Data

Pre-loaded on first startup:
- **1 Admin** user + **2 Inventory Staff** users
- **3 Categories**: Packaging, Protective Materials, Containers
- **3 Units**: Piece, Roll, Meter
- **2 Warehouses** + **5 Storage Locations**
- **3 Suppliers** + **3 Customers**
- **8 Products** with realistic stock levels
- **Multiple batches** with varying ages (5 to 90 days old)

## 🔗 API Endpoints

```
POST /api/auth/login          Login
GET  /api/auth/me             Current user

GET  /api/products            List products (with inventory)
POST /api/products            Create product (Admin)
GET  /api/categories          List categories
POST /api/categories          Create category (Admin)

POST /api/stock-in            Record stock receipt
POST /api/stock-out           Dispatch stock (FIFO)
POST /api/inventory/adjustment Admin adjustment

GET  /api/inventory           Current inventory balances
GET  /api/stock-movements     Movement ledger
GET  /api/batches             Batch list

GET  /api/dashboard/admin     Admin dashboard stats
GET  /api/dashboard/inventory Staff dashboard stats

GET  /api/reports/stock       Stock report
GET  /api/reports/ageing      Stock ageing report
GET  /api/reports/movements   Movement report
GET  /api/reports/export/csv/{type}  CSV download

GET  /api/users               List users (Admin)
POST /api/users               Create user (Admin)
GET  /api/audit-logs          Audit log (Admin)
```

## 🐳 Docker (Production)

```bash
docker-compose up -d
```

Services: PostgreSQL + FastAPI backend + Vite frontend

## 🔐 Security

- Passwords hashed with bcrypt
- JWT tokens (8-hour expiry by default)
- Role-based access control (Admin / Inventory Staff)
- SQL injection protection via SQLAlchemy ORM
- CORS configured
- No passwords exposed in API responses
- All secrets via environment variables

## 📈 Business Rules

1. **No Negative Inventory**: Stock out rejected if quantity exceeds available
2. **FIFO**: Oldest batches consumed first
3. **Atomic Transactions**: All stock operations use DB transactions
4. **Immutable History**: No deleting stock transactions (use adjustments)
5. **Base Unit Arithmetic**: All quantities stored as individual units; carton display calculated
6. **Partial Carton Support**: e.g. 230 units = 4 cartons + 30 loose pieces
