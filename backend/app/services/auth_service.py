import uuid
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.user import User
from app.utils.security import hash_password, verify_password, create_access_token, create_refresh_token, decode_token
from app.schemas.auth import AuthResponse, UserResponse


class AuthService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def register(self, email: str, password: str, display_name: str) -> AuthResponse:
        existing = await self.db.execute(select(User).where(User.email == email))
        if existing.scalar_one_or_none():
            raise ValueError("Email already registered")

        user = User(
            email=email,
            password_hash=hash_password(password),
            display_name=display_name,
        )
        self.db.add(user)
        await self.db.commit()
        await self.db.refresh(user)

        access_token = create_access_token(str(user.id))
        refresh_token = create_refresh_token(str(user.id))

        return AuthResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            user=UserResponse(
                id=str(user.id),
                email=user.email,
                display_name=user.display_name,
                is_active=user.is_active,
                created_at=user.created_at.isoformat(),
            ),
        )

    async def login(self, email: str, password: str) -> AuthResponse:
        result = await self.db.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()
        if not user or not verify_password(password, user.password_hash):
            raise ValueError("Invalid email or password")
        if not user.is_active:
            raise ValueError("Account is deactivated")

        access_token = create_access_token(str(user.id))
        refresh_token = create_refresh_token(str(user.id))

        return AuthResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            user=UserResponse(
                id=str(user.id),
                email=user.email,
                display_name=user.display_name,
                is_active=user.is_active,
                created_at=user.created_at.isoformat(),
            ),
        )

    async def refresh_token(self, refresh_token_str: str) -> dict:
        payload = decode_token(refresh_token_str)
        if not payload or payload.get("type") != "refresh":
            raise ValueError("Invalid refresh token")

        user_id = payload.get("sub")
        result = await self.db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        if not user or not user.is_active:
            raise ValueError("User not found or inactive")

        new_access = create_access_token(str(user.id))
        new_refresh = create_refresh_token(str(user.id))
        return {"access_token": new_access, "refresh_token": new_refresh}

    async def get_user(self, user_id: str) -> UserResponse | None:
        result = await self.db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        if not user:
            return None
        return UserResponse(
            id=str(user.id),
            email=user.email,
            display_name=user.display_name,
            is_active=user.is_active,
            created_at=user.created_at.isoformat(),
        )
