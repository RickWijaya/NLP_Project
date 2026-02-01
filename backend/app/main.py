"""
FastAPI application entry point.
RAG Service for Customer Service AI Chatbot.
"""

import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import Response

from app.config import get_settings
from app.database import init_db, close_db, async_session_maker
from app.routers import auth, admin, chat, analytics
from app.utils.logger import logger

settings = get_settings()


async def seed_database():
    """Create initial admin account and sample data if they don't exist."""
    from sqlalchemy import select
    from app.models.document import Admin, Document, DocumentStatus
    from app.auth.jwt_handler import get_password_hash
    
    async with async_session_maker() as db:
        # Check if admin already exists
        result = await db.execute(select(Admin).where(Admin.username == "admin"))
        existing_admin = result.scalar_one_or_none()
        
        if not existing_admin:
            # Create initial admin account
            admin_user = Admin(
                username="admin",
                email="admin@example.com",
                hashed_password=get_password_hash("admin123"),
                tenant_id="default_tenant",
                is_active=True
            )
            db.add(admin_user)
            await db.commit()
            await db.refresh(admin_user)
            logger.info("Initial admin account created (username: admin, password: admin123)")
        else:
            # Update password to ensure it's correct (fixes any seeding issues)
            existing_admin.hashed_password = get_password_hash("admin123")
            await db.commit()
            logger.info("Admin account password reset to admin123")



@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler for startup and shutdown."""
    # Startup
    logger.info("Starting RAG Service...")
    
    # Create necessary directories
    Path(settings.upload_dir).mkdir(parents=True, exist_ok=True)
    Path(settings.chroma_persist_dir).mkdir(parents=True, exist_ok=True)
    
    # Initialize database tables
    await init_db()
    logger.info("Database initialized")
    
    # Seed initial admin account and data
    try:
        await seed_database()
    except Exception as e:
        logger.warning(f"Could not seed database: {e}")
    
    # Pre-load embedding model (optional, for faster first query)
    try:
        from app.modules.embedding import embedding_generator
        _ = embedding_generator.model  # Trigger lazy loading
        logger.info("Embedding model loaded")
    except Exception as e:
        logger.warning(f"Could not pre-load embedding model: {e}")
    
    logger.info("RAG Service started successfully")
    
    yield
    
    # Shutdown
    logger.info("Shutting down RAG Service...")
    await close_db()
    logger.info("RAG Service shutdown complete")


# Create FastAPI application
app = FastAPI(
    title="RAG Service",
    description="Retrieval-Augmented Generation API for Customer Service AI Chatbot",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files for admin UI
static_dir = Path(__file__).parent.parent / "static"
if static_dir.exists():
    app.mount("/static", StaticFiles(directory=str(static_dir)), name="static")

# Include routers
app.include_router(auth.router)
app.include_router(admin.router)
app.include_router(chat.router)
app.include_router(analytics.router)


@app.get("/")
async def root():
    """Root endpoint with service information."""
    return {
        "service": "RAG Service",
        "version": "1.0.0",
        "description": "Customer Service AI Chatbot RAG Pipeline",
        "docs": "/docs",
        "admin_ui": "/static/admin.html"
    }


@app.get("/health")
async def health():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "rag-service",
        "version": "1.0.0"
    }


@app.get("/favicon.ico")
async def favicon():
    """Return empty favicon to prevent 404."""
    # Simple 1x1 transparent PNG
    return Response(content=b'', media_type="image/x-icon")


if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=settings.port,
        reload=settings.debug
    )
