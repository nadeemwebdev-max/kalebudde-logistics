import re

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import require_staff
from app.models import BlogPost, User
from app.schemas import BlogCreate, BlogListOut, BlogOut, BlogUpdate

router = APIRouter(prefix="/api/blog", tags=["blog"])


def slugify(text: str) -> str:
    s = re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")
    return s[:200] or "post"


@router.get("", response_model=list[BlogListOut])
def list_posts(
    tag: str | None = None,
    q: str | None = None,
    limit: int = Query(12, le=50),
    offset: int = 0,
    db: Session = Depends(get_db),
):
    query = db.query(BlogPost).filter(BlogPost.published.is_(True))
    if tag:
        query = query.filter(BlogPost.tags.ilike(f"%{tag}%"))
    if q:
        like = f"%{q}%"
        query = query.filter(BlogPost.title.ilike(like) | BlogPost.excerpt.ilike(like))
    return query.order_by(BlogPost.published_at.desc()).offset(offset).limit(limit).all()


@router.get("/{slug}", response_model=BlogOut)
def get_post(slug: str, db: Session = Depends(get_db)):
    post = db.query(BlogPost).filter(BlogPost.slug == slug).first()
    if not post or not post.published:
        raise HTTPException(status_code=404, detail="Post not found")
    return post


@router.post("", response_model=BlogOut, status_code=201)
def create_post(
    payload: BlogCreate, db: Session = Depends(get_db), user: User = Depends(require_staff)
):
    slug = payload.slug or slugify(payload.title)
    if db.query(BlogPost).filter(BlogPost.slug == slug).first():
        raise HTTPException(status_code=400, detail="Slug already exists")
    data = payload.model_dump(exclude={"slug"})
    post = BlogPost(slug=slug, **data)
    db.add(post)
    db.commit()
    db.refresh(post)
    return post


@router.patch("/{post_id}", response_model=BlogOut)
def update_post(
    post_id: int,
    payload: BlogUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_staff),
):
    post = db.get(BlogPost, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(post, k, v)
    db.commit()
    db.refresh(post)
    return post


@router.delete("/{post_id}", status_code=204)
def delete_post(
    post_id: int, db: Session = Depends(get_db), user: User = Depends(require_staff)
):
    post = db.get(BlogPost, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    db.delete(post)
    db.commit()
