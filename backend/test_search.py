from app.db.database import SessionLocal
from app.models.models import User
from app.api.v1.endpoints.search import global_search

db = SessionLocal()
admin = db.query(User).filter_by(email="admin@warehouse.com").first()
print("admin found:", admin is not None)

try:
    res = global_search(q="SKU-1024", db=db, current_user=admin)
    print("SUCCESS")
except Exception as e:
    import traceback
    traceback.print_exc()
