from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.schemas.auth import UserResponse
from app.schemas.journal import TagCreateRequest, TagResponse
from app.api.deps import require_user
from app.services.journal_service import JournalService

router = APIRouter(prefix="/api/tags", tags=["tags"])


@router.get("", response_model=list[TagResponse])
async def list_tags(
    user: UserResponse = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    service = JournalService(db)
    return await service.list_tags(user_id=user.id)


@router.post("", response_model=TagResponse, status_code=201)
async def create_tag(
    request: TagCreateRequest,
    user: UserResponse = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    service = JournalService(db)
    return await service.create_tag(user_id=user.id, data=request)


@router.put("/{tag_id}", response_model=TagResponse)
async def update_tag(
    tag_id: str,
    request: TagCreateRequest,
    user: UserResponse = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    service = JournalService(db)
    tag = await service.update_tag(tag_id, user_id=user.id, data=request)
    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found")
    return tag


@router.delete("/{tag_id}")
async def delete_tag(
    tag_id: str,
    user: UserResponse = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    service = JournalService(db)
    success = await service.delete_tag(tag_id, user_id=user.id)
    if not success:
        raise HTTPException(status_code=404, detail="Tag not found")
    return {"message": "Tag deleted"}
