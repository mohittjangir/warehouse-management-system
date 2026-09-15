from fastapi import APIRouter
from app.api.v1.endpoints import auth, users, masters, products, inventory, dashboard

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(users.router, prefix="/users", tags=["Users"])
api_router.include_router(masters.router, prefix="", tags=["Masters"])
api_router.include_router(products.router, prefix="/products", tags=["Products"])
api_router.include_router(inventory.router, prefix="", tags=["Inventory"])
api_router.include_router(dashboard.router, prefix="", tags=["Dashboard & Reports"])
