import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.database import Base, engine
from app.routers import admin, auth, blog, seo, shipments
from app.seed import seed_all


@asynccontextmanager
async def lifespan(app: FastAPI):
    os.makedirs("uploads", exist_ok=True)
    Base.metadata.create_all(bind=engine)
    seed_all()
    yield


app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    description="Logistics management API for Kalebudde Logistics - shipments, "
                "tracking, users, blog and quotes.",
    lifespan=lifespan,
)

app.add_middleware(GZipMiddleware, minimum_size=1000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

app.include_router(auth.router)
app.include_router(shipments.router)
app.include_router(blog.router)
app.include_router(admin.router)
app.include_router(seo.router)


@app.get("/api/health", tags=["health"])
def health():
    return {"status": "ok", "service": settings.PROJECT_NAME}

