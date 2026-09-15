from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.db.database import get_db
from app.models.models import User, UserRole, UserStatus
from app.schemas.schemas import UserCreate, UserUpdate, UserResponse, UserPasswordReset
from app.core.security import get_password_hash
from app.core.dependencies import get_current_user, require_admin
from app.services.inventory_service import create_audit_log

router = APIRouter()


@router.get("/", response_model=List[UserResponse])
async def list_users(
    role: Optional[str] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    query = select(User)
    if role:
        query = query.where(User.role == role)
    if status_filter:
        query = query.where(User.status == status_filter)
    result = await db.execute(query.order_by(User.created_at.desc()))
    return result.scalars().all()


@router.post("/", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    body: UserCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    # Check unique email
    existing = await db.execute(select(User).where(User.email == body.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        name=body.name,
        email=body.email,
        password_hash=get_password_hash(body.password),
        role=body.role,
        status=UserStatus.ACTIVE,
    )
    db.add(user)
    await db.flush()

    await create_audit_log(
        db, current_user.id, "USER_CREATED",
        entity_type="user", entity_id=user.id,
        description=f"User {user.email} created with role {user.role}",
        new_value={"name": user.name, "email": user.email, "role": user.role.value},
    )
    await db.commit()
    await db.refresh(user)
    return user


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.put("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: int,
    body: UserUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    old_val = {"name": user.name, "status": user.status.value}
    if body.name is not None:
        user.name = body.name
    if body.email is not None:
        user.email = body.email
    if body.role is not None:
        user.role = body.role
    if body.status is not None:
        user.status = body.status

    await create_audit_log(
        db, current_user.id, "USER_UPDATED",
        entity_type="user", entity_id=user.id,
        old_value=old_val,
        new_value={"name": user.name, "status": user.status.value},
    )
    await db.commit()
    await db.refresh(user)
    return user


@router.post("/{user_id}/reset-password")
async def reset_password(
    user_id: int,
    body: UserPasswordReset,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.password_hash = get_password_hash(body.new_password)
    await create_audit_log(
        db, current_user.id, "PASSWORD_RESET",
        entity_type="user", entity_id=user.id,
        description=f"Password reset for user {user.email}",
    )
    await db.commit()
    return {"message": "Password reset successfully"}
