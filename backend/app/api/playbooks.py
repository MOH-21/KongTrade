from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.schemas.auth import UserResponse
from app.schemas.playbook import PlaybookCreateRequest, PlaybookUpdateRequest, PlaybookResponse
from app.api.deps import require_user
from app.services.playbook_service import PlaybookService

router = APIRouter(prefix="/api/playbooks", tags=["playbooks"])


@router.get("", response_model=list[PlaybookResponse])
async def list_playbooks(
    user: UserResponse = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    service = PlaybookService(db)
    return await service.list_playbooks(user_id=user.id)


@router.get("/templates", response_model=list[PlaybookResponse])
async def get_templates(
    db: AsyncSession = Depends(get_db),
):
    service = PlaybookService(db)
    return await service.get_templates()


@router.get("/{playbook_id}", response_model=PlaybookResponse)
async def get_playbook(
    playbook_id: str,
    user: UserResponse = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    service = PlaybookService(db)
    p = await service.get_playbook(playbook_id, user_id=user.id)
    if not p:
        raise HTTPException(status_code=404, detail="Playbook not found")
    return p


@router.post("", response_model=PlaybookResponse, status_code=201)
async def create_playbook(
    request: PlaybookCreateRequest,
    user: UserResponse = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    service = PlaybookService(db)
    return await service.create_playbook(user_id=user.id, data=request)


@router.put("/{playbook_id}", response_model=PlaybookResponse)
async def update_playbook(
    playbook_id: str,
    request: PlaybookUpdateRequest,
    user: UserResponse = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    service = PlaybookService(db)
    p = await service.update_playbook(playbook_id, user_id=user.id, data=request)
    if not p:
        raise HTTPException(status_code=404, detail="Playbook not found")
    return p


@router.delete("/{playbook_id}")
async def delete_playbook(
    playbook_id: str,
    user: UserResponse = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    service = PlaybookService(db)
    success = await service.delete_playbook(playbook_id, user_id=user.id)
    if not success:
        raise HTTPException(status_code=404, detail="Playbook not found")
    return {"message": "Playbook deleted"}
