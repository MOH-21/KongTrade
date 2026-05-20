from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.services.auth_service import AuthService
from app.schemas.auth import RegisterRequest, LoginRequest, RefreshRequest, AuthResponse, UserResponse
from app.api.deps import require_user

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=AuthResponse, status_code=201)
async def register(request: RegisterRequest, db: AsyncSession = Depends(get_db)):
    auth_service = AuthService(db)
    try:
        return await auth_service.register(
            email=request.email,
            password=request.password,
            display_name=request.display_name,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/login", response_model=AuthResponse)
async def login(request: LoginRequest, db: AsyncSession = Depends(get_db)):
    auth_service = AuthService(db)
    try:
        return await auth_service.login(email=request.email, password=request.password)
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))


@router.post("/refresh")
async def refresh(request: RefreshRequest, db: AsyncSession = Depends(get_db)):
    auth_service = AuthService(db)
    try:
        return await auth_service.refresh_token(request.refresh_token)
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))


@router.post("/logout")
async def logout(user: UserResponse = Depends(require_user)):
    return {"message": "Logged out"}


@router.get("/me", response_model=UserResponse)
async def get_me(user: UserResponse = Depends(require_user)):
    return user
