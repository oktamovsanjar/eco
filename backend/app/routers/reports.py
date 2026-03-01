"""Reports router - Shikoyatlar CRUD va boshqarish."""

from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from sqlalchemy.orm import selectinload
from app.database import get_db
from app.models.user import User, UserRole
from app.models.report import (
    Report, ReportImage, Comment, Reward,
    ReportCategory, ReportStatus, ReportPriority
)
from app.schemas.report import (
    ReportCreate, ReportUpdate, ReportVerify, ReportResolve,
    ReportResponse, ReportListResponse, MapMarker, ReportStats,
    CommentCreate, CommentResponse, ReportImageResponse
)
from app.utils.auth import get_current_user, get_moderator_user
from app.utils.file_upload import save_upload_file

router = APIRouter(prefix="/api/reports", tags=["Shikoyatlar"])


# ========== Helper ==========

def _build_report_response(report: Report) -> ReportResponse:
    """Report obyektdan response yaratish."""
    comments = []
    try:
        if report.comments:
            for c in report.comments:
                comments.append(CommentResponse(
                    id=c.id,
                    report_id=c.report_id,
                    author_id=c.author_id,
                    author_name=c.author.full_name if c.author else None,
                    author_role=c.author.role.value if c.author and hasattr(c.author.role, 'value') else (c.author.role if c.author else None),
                    content=c.content,
                    is_official=c.is_official,
                    created_at=c.created_at
                ))
    except Exception:
        # Fallback if relationships failed to load properly
        pass

    return ReportResponse(
        id=report.id,
        title=report.title,
        description=report.description,
        category=report.category,
        priority=report.priority,
        latitude=report.latitude,
        longitude=report.longitude,
        address=report.address,
        region=report.region,
        district=report.district,
        status=report.status,
        author_id=report.author_id,
        author_name=report.author.full_name if report.author else None,
        moderator_id=report.moderator_id,
        moderator_comment=report.moderator_comment,
        verified_at=report.verified_at,
        resolution_description=report.resolution_description,
        resolved_at=report.resolved_at,
        points_awarded=report.points_awarded or 0,
        upvotes=report.upvotes or 0,
        views_count=report.views_count or 0,
        images=[ReportImageResponse.model_validate(img) for img in (report.images or [])],
        comments=comments,
        created_at=report.created_at,
        updated_at=report.updated_at
    )


# ========== CRUD ==========

@router.post("/", response_model=ReportResponse, status_code=status.HTTP_201_CREATED)
async def create_report(
    report_data: ReportCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Yangi shikoyat yaratish."""
    new_report = Report(
        title=report_data.title,
        description=report_data.description,
        category=report_data.category,
        priority=report_data.priority,
        latitude=report_data.latitude,
        longitude=report_data.longitude,
        address=report_data.address,
        region=report_data.region,
        district=report_data.district,
        author_id=current_user.id,
        status=ReportStatus.PENDING
    )
    db.add(new_report)

    # Foydalanuvchi hisobot sonini oshirish
    current_user.reports_count += 1

    await db.commit()
    await db.refresh(new_report)

    # Relationships ni yuklash
    result = await db.execute(
        select(Report)
        .options(selectinload(Report.author), selectinload(Report.images),
                 selectinload(Report.comments).selectinload(Comment.author))
        .where(Report.id == new_report.id)
    )
    report = result.scalar_one()
    return _build_report_response(report)


@router.post("/{report_id}/images", response_model=ReportImageResponse)
async def upload_report_image(
    report_id: int,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Shikoyatga rasm yuklash."""
    # Hisobotni tekshirish
    result = await db.execute(select(Report).where(Report.id == report_id))
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail="Hisobot topilmadi")
    if report.author_id != current_user.id and current_user.role not in [UserRole.ADMIN, UserRole.MODERATOR]:
        raise HTTPException(status_code=403, detail="Ruxsat yo'q")

    # Rasmlar sonini tekshirish (max 5)
    img_count = await db.execute(
        select(func.count(ReportImage.id)).where(ReportImage.report_id == report_id)
    )
    if img_count.scalar() >= 5:
        raise HTTPException(status_code=400, detail="Maksimum 5 ta rasm yuklash mumkin")

    # Faylni saqlash
    file_info = await save_upload_file(file)

    # Bazaga yozish
    new_image = ReportImage(
        report_id=report_id,
        image_url=file_info["image_url"],
        thumbnail_url=file_info["thumbnail_url"],
        original_filename=file_info["original_filename"],
        file_size=file_info["file_size"]
    )
    db.add(new_image)
    await db.commit()
    await db.refresh(new_image)

    return ReportImageResponse.model_validate(new_image)


@router.get("/", response_model=list[ReportListResponse])
async def list_reports(
    skip: int = 0,
    limit: int = 50,
    category: Optional[ReportCategory] = None,
    status_filter: Optional[ReportStatus] = Query(None, alias="status"),
    priority: Optional[ReportPriority] = None,
    region: Optional[str] = None,
    search: Optional[str] = None,
    my_reports: bool = False,
    current_user: Optional[User] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Shikoyatlar ro'yxatini olish (filtr bilan)."""
    query = select(Report).options(
        selectinload(Report.author),
        selectinload(Report.images),
        selectinload(Report.comments)
    )

    # Huquqlarni tekshirish: Admin/Moderator bo'lmasa, faqat ma'lum statusdagilarni ko'radi
    is_privileged = current_user and current_user.role in [UserRole.ADMIN, UserRole.MODERATOR, UserRole.ORGANIZATION]
    
    if not is_privileged:
        # Oddiy foydalanuvchilar faqat tasdiqlangan/faol statuslarni ko'radi
        # Ammo o'zlarining hisobotlarini har qanday holatda ko'rishlari mumkin
        if current_user and current_user.username != "guest":
            query = query.where(
                (Report.status.in_([ReportStatus.VERIFIED, ReportStatus.RESOLVED, ReportStatus.IN_PROGRESS])) |
                (Report.author_id == current_user.id)
            )
        else:
            query = query.where(Report.status.in_([ReportStatus.VERIFIED, ReportStatus.RESOLVED, ReportStatus.IN_PROGRESS]))
    

    # Filtrlar
    if my_reports and current_user:
        query = query.where(Report.author_id == current_user.id)
    if category:
        query = query.where(Report.category == category)
    if status_filter:
        query = query.where(Report.status == status_filter)
    if priority:
        query = query.where(Report.priority == priority)
    if region:
        query = query.where(Report.region == region)
    if search:
        query = query.where(
            Report.title.ilike(f"%{search}%") | Report.description.ilike(f"%{search}%")
        )

    query = query.order_by(Report.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    reports = result.scalars().all()

    return [
        ReportListResponse(
            id=r.id,
            title=r.title,
            category=r.category,
            priority=r.priority,
            latitude=r.latitude,
            longitude=r.longitude,
            address=r.address,
            region=r.region,
            district=r.district,
            status=r.status,
            author_name=r.author.full_name if r.author else None,
            upvotes=r.upvotes,
            views_count=r.views_count,
            images_count=len(r.images) if r.images else 0,
            comments_count=len(r.comments) if r.comments else 0,
            created_at=r.created_at
        )
        for r in reports
    ]


@router.get("/map", response_model=list[MapMarker])
async def get_map_markers(
    category: Optional[ReportCategory] = None,
    status_filter: Optional[ReportStatus] = Query(None, alias="status"),
    min_lat: Optional[float] = None,
    max_lat: Optional[float] = None,
    min_lng: Optional[float] = None,
    max_lng: Optional[float] = None,
    current_user: Optional[User] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Xarita uchun marker ma'lumotlarini olish (ochiq API)."""
    query = select(Report)
    
    # Huquqlar
    is_privileged = current_user and current_user.role in [UserRole.ADMIN, UserRole.MODERATOR, UserRole.ORGANIZATION]
    
    if not is_privileged:
        # Oddiy foydalanuvchi/mehmon faqat tasdiqlanganlarni ko'radi
        if current_user and current_user.username != "guest":
            query = query.where(
                (Report.status.in_([ReportStatus.VERIFIED, ReportStatus.RESOLVED, ReportStatus.IN_PROGRESS])) |
                (Report.author_id == current_user.id)
            )
        else:
            query = query.where(Report.status.in_([ReportStatus.VERIFIED, ReportStatus.RESOLVED, ReportStatus.IN_PROGRESS]))
    

    filters = []
    if category:
        filters.append(Report.category == category)
    if status_filter:
        filters.append(Report.status == status_filter)
    if min_lat is not None:
        filters.append(Report.latitude >= min_lat)
    if max_lat is not None:
        filters.append(Report.latitude <= max_lat)
    if min_lng is not None:
        filters.append(Report.longitude >= min_lng)
    if max_lng is not None:
        filters.append(Report.longitude <= max_lng)

    if filters:
        query = query.where(and_(*filters))

    query = query.order_by(Report.created_at.desc()).limit(500)
    result = await db.execute(query)
    reports = result.scalars().all()

    return [
        MapMarker(
            id=r.id,
            title=r.title,
            category=r.category,
            priority=r.priority,
            latitude=r.latitude,
            longitude=r.longitude,
            status=r.status,
            upvotes=r.upvotes,
            created_at=r.created_at
        )
        for r in reports
    ]


@router.get("/stats", response_model=ReportStats)
async def get_stats(db: AsyncSession = Depends(get_db)):
    """Umumiy statistika (ochiq API)."""
    # Total
    total = await db.execute(select(func.count(Report.id)))
    total_count = total.scalar() or 0

    # By status
    status_counts = {}
    for s in ReportStatus:
        count_result = await db.execute(
            select(func.count(Report.id)).where(Report.status == s)
        )
        status_counts[s.value] = count_result.scalar() or 0

    # By category
    category_counts = {}
    for c in ReportCategory:
        count_result = await db.execute(
            select(func.count(Report.id)).where(Report.category == c)
        )
        category_counts[c.value] = count_result.scalar() or 0

    # By priority
    priority_counts = {}
    for p in ReportPriority:
        count_result = await db.execute(
            select(func.count(Report.id)).where(Report.priority == p)
        )
        priority_counts[p.value] = count_result.scalar() or 0

    return ReportStats(
        total_reports=total_count,
        pending=status_counts.get(ReportStatus.PENDING.value, 0),
        under_review=status_counts.get(ReportStatus.UNDER_REVIEW.value, 0),
        verified=status_counts.get(ReportStatus.VERIFIED.value, 0),
        resolved=status_counts.get(ReportStatus.RESOLVED.value, 0),
        rejected=status_counts.get(ReportStatus.REJECTED.value, 0),
        by_category=category_counts,
        by_priority=priority_counts
    )


@router.get("/{report_id}", response_model=ReportResponse)
async def get_report(
    report_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Bitta shikoyatni toliq ko'rish (ochiq API)."""
    from sqlalchemy import update as sql_update

    # 1. Ko'rishlar sonini oshirish (eng birinchi)
    try:
        await db.execute(
            sql_update(Report)
            .where(Report.id == report_id)
            .values(views_count=Report.views_count + 1)
        )
        await db.commit()
    except Exception as e:
        print(f"Update views error: {e}")
        await db.rollback()

    # 2. To'liq ma'lumotni yuklash (commitdan keyin yangi session holatida)
    result = await db.execute(
        select(Report)
        .options(
            selectinload(Report.author),
            selectinload(Report.moderator),
            selectinload(Report.images),
            selectinload(Report.comments).selectinload(Comment.author)
        )
        .where(Report.id == report_id)
    )
    report = result.scalar_one_or_none()
    
    if not report:
        raise HTTPException(status_code=404, detail="Hisobot topilmadi")

    try:
        return _build_report_response(report)
    except Exception as e:
        print(f"Build response error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Serialization error: {str(e)}")


@router.put("/{report_id}", response_model=ReportResponse)
async def update_report(
    report_id: int,
    report_data: ReportUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Shikoyatni yangilash (faqat muallif)."""
    result = await db.execute(
        select(Report)
        .options(selectinload(Report.author), selectinload(Report.images),
                 selectinload(Report.comments).selectinload(Comment.author))
        .where(Report.id == report_id)
    )
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail="Hisobot topilmadi")
    if report.author_id != current_user.id:
        raise HTTPException(status_code=403, detail="Faqat muallif o'zgartirishi mumkin")
    if report.status not in [ReportStatus.PENDING, ReportStatus.REJECTED]:
        raise HTTPException(status_code=400, detail="Faqat kutilayotgan yoki rad etilgan hisobotni o'zgartirish mumkin")

    if report_data.title:
        report.title = report_data.title
    if report_data.description:
        report.description = report_data.description
    if report_data.category:
        report.category = report_data.category
    if report_data.priority:
        report.priority = report_data.priority

    await db.commit()
    await db.refresh(report)
    return _build_report_response(report)


@router.delete("/{report_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_report(
    report_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Shikoyatni o'chirish."""
    result = await db.execute(select(Report).where(Report.id == report_id))
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail="Hisobot topilmadi")
    if report.author_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Ruxsat yo'q")

    await db.delete(report)
    await db.commit()


@router.post("/{report_id}/upvote")
async def upvote_report(
    report_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Shikoyatga ovoz berish (like)."""
    result = await db.execute(select(Report).where(Report.id == report_id))
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail="Hisobot topilmadi")

    report.upvotes += 1
    await db.commit()
    return {"upvotes": report.upvotes}


# ========== Comments ==========

@router.post("/{report_id}/comments", response_model=CommentResponse)
async def add_comment(
    report_id: int,
    comment_data: CommentCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Shikoyatga izoh qo'shish."""
    result = await db.execute(select(Report).where(Report.id == report_id))
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail="Hisobot topilmadi")

    is_official = current_user.role in [UserRole.MODERATOR, UserRole.ADMIN, UserRole.ORGANIZATION]

    new_comment = Comment(
        report_id=report_id,
        author_id=current_user.id,
        content=comment_data.content,
        is_official=is_official
    )
    db.add(new_comment)
    await db.commit()
    await db.refresh(new_comment)

    return CommentResponse(
        id=new_comment.id,
        report_id=new_comment.report_id,
        author_id=new_comment.author_id,
        author_name=current_user.full_name,
        author_role=current_user.role.value,
        content=new_comment.content,
        is_official=new_comment.is_official,
        created_at=new_comment.created_at
    )


# ========== Moderator Actions ==========

@router.put("/{report_id}/verify", response_model=ReportResponse)
async def verify_report(
    report_id: int,
    verify_data: ReportVerify,
    moderator: User = Depends(get_moderator_user),
    db: AsyncSession = Depends(get_db)
):
    """Moderator: Shikoyatni tasdiqlash yoki rad etish."""
    result = await db.execute(
        select(Report)
        .options(selectinload(Report.author), selectinload(Report.images),
                 selectinload(Report.comments).selectinload(Comment.author))
        .where(Report.id == report_id)
    )
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail="Hisobot topilmadi")

    report.status = verify_data.status
    report.moderator_id = moderator.id
    report.moderator_comment = verify_data.moderator_comment
    report.verified_at = datetime.now(timezone.utc)

    # Agar tasdiqlangan bo'lsa, ball berish
    if verify_data.status == ReportStatus.VERIFIED and verify_data.points_to_award:
        author = await db.execute(select(User).where(User.id == report.author_id))
        author_user = author.scalar_one_or_none()
        if author_user:
            author_user.points += verify_data.points_to_award
            author_user.verified_reports_count += 1
            author_user.update_rank()
            report.points_awarded = verify_data.points_to_award

            # Mukofot yozuvi
            reward = Reward(
                user_id=author_user.id,
                points=verify_data.points_to_award,
                reason=f"Hisobot #{report.id} tasdiqlandi",
                report_id=report.id
            )
            db.add(reward)

    await db.commit()
    await db.refresh(report)
    return _build_report_response(report)


@router.put("/{report_id}/resolve", response_model=ReportResponse)
async def resolve_report(
    report_id: int,
    resolve_data: ReportResolve,
    moderator: User = Depends(get_moderator_user),
    db: AsyncSession = Depends(get_db)
):
    """Moderator: Muammoni hal qilindi deb belgilash."""
    result = await db.execute(
        select(Report)
        .options(selectinload(Report.author), selectinload(Report.images),
                 selectinload(Report.comments).selectinload(Comment.author))
        .where(Report.id == report_id)
    )
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail="Hisobot topilmadi")

    report.status = ReportStatus.RESOLVED
    report.resolution_description = resolve_data.resolution_description
    report.resolved_at = datetime.now(timezone.utc)

    # Qo'shimcha ball
    if resolve_data.points_to_award:
        author = await db.execute(select(User).where(User.id == report.author_id))
        author_user = author.scalar_one_or_none()
        if author_user:
            author_user.points += resolve_data.points_to_award
            report.points_awarded += resolve_data.points_to_award

            reward = Reward(
                user_id=author_user.id,
                points=resolve_data.points_to_award,
                reason=f"Hisobot #{report.id} hal qilindi",
                report_id=report.id
            )
            db.add(reward)

    await db.commit()
    await db.refresh(report)
    return _build_report_response(report)


@router.get("/moderator/pending", response_model=list[ReportListResponse])
async def get_pending_reports(
    skip: int = 0,
    limit: int = 50,
    category: Optional[ReportCategory] = None,
    moderator: User = Depends(get_moderator_user),
    db: AsyncSession = Depends(get_db)
):
    """Moderator: Kutilayotgan shikoyatlarni ko'rish."""
    query = select(Report).options(
        selectinload(Report.author),
        selectinload(Report.images),
        selectinload(Report.comments)
    ).where(
        Report.status.in_([ReportStatus.PENDING, ReportStatus.UNDER_REVIEW])
    )

    if category:
        query = query.where(Report.category == category)

    # Tashkilot turi bilan filtr (moderator o'z sohasidagi hisobotlarni ko'radi)
    # Admin bo'lsa barchasini ko'radi
    if moderator.role != UserRole.ADMIN and moderator.organization_type:
        type_to_category = {
            "ekologiya": [ReportCategory.ECOLOGY, ReportCategory.WATER, ReportCategory.AIR,
                         ReportCategory.DEFORESTATION, ReportCategory.WASTE],
            "yol_qurilish": [ReportCategory.ROAD, ReportCategory.CONSTRUCTION],
        }
        allowed = type_to_category.get(moderator.organization_type, list(ReportCategory))
        query = query.where(Report.category.in_(allowed))

    query = query.order_by(Report.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    reports = result.scalars().all()

    return [
        ReportListResponse(
            id=r.id,
            title=r.title,
            category=r.category,
            priority=r.priority,
            latitude=r.latitude,
            longitude=r.longitude,
            address=r.address,
            region=r.region,
            district=r.district,
            status=r.status,
            author_name=r.author.full_name if r.author else None,
            upvotes=r.upvotes,
            views_count=r.views_count,
            images_count=len(r.images) if r.images else 0,
            comments_count=len(r.comments) if r.comments else 0,
            created_at=r.created_at
        )
        for r in reports
    ]
