"""
FastAPI main application - Enhanced for future development
"""
from fastapi import FastAPI, HTTPException, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from datetime import datetime
import uvicorn
import logging

from app.config import settings
from app.sql_database import db
from app.routers import exams, posts, ai_chat, documents, ai_feed, ai_analysis, me, uploads, users, admin

# Try to import enhanced router
try:
    from app.routers.posts_enhanced import router as posts_enhanced_router
    HAS_ENHANCED_ROUTER = True
except ImportError:
    HAS_ENHANCED_ROUTER = False

# Import middleware
try:
    from app.middleware.rate_limit import RateLimitMiddleware
    from app.middleware.logging import LoggingMiddleware
    from app.middleware.error_handler import (
        http_exception_handler,
        validation_exception_handler,
        general_exception_handler
    )
    HAS_MIDDLEWARE = True
except ImportError:
    HAS_MIDDLEWARE = False

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("api")

app = FastAPI(
    title="DuThi THPT Backend API",
    description="Backend API for DuThi THPT Platform with SQL database and Firebase Auth. Enhanced for large-scale data management.",
    version="2.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
    terms_of_service="https://example.com/terms/",
    contact={
        "name": "API Support",
        "email": "support@example.com",
    },
    license_info={
        "name": "MIT",
    },
)

# CORS Middleware
# Cho phép tất cả origins trong development
import os
is_dev = os.getenv("ENV", "development") == "development"

# Nếu dev mode, cho phép tất cả origins (không dùng credentials)
# Nếu production, dùng ALLOWED_ORIGINS từ config
if is_dev:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],  # Cho phép tất cả trong dev
        allow_credentials=False,  # Phải False khi dùng ["*"]
        allow_methods=["*"],
        allow_headers=["*"],
    )
else:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.ALLOWED_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

# Add enhanced middleware
if HAS_MIDDLEWARE:
    # Logging middleware (first, to log all requests)
    app.add_middleware(LoggingMiddleware)
    
    # Rate limiting middleware (after logging, before processing)
    rate_limit_per_minute = int(os.getenv("RATE_LIMIT_PER_MINUTE", "60"))
    rate_limit_per_hour = int(os.getenv("RATE_LIMIT_PER_HOUR", "1000"))
    app.add_middleware(
        RateLimitMiddleware,
        requests_per_minute=rate_limit_per_minute,
        requests_per_hour=rate_limit_per_hour
    )

# Enhanced error handlers
if HAS_MIDDLEWARE:
    app.add_exception_handler(StarletteHTTPException, http_exception_handler)
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    app.add_exception_handler(Exception, general_exception_handler)

# Include routers
app.include_router(exams.router)
app.include_router(posts.router)  # Original router (backward compatible)
if HAS_ENHANCED_ROUTER:
    app.include_router(posts_enhanced_router)  # Enhanced router with better pagination
app.include_router(ai_chat.router)
app.include_router(documents.router)
app.include_router(ai_feed.router)
app.include_router(ai_analysis.router)
app.include_router(me.router)
app.include_router(uploads.router)
app.include_router(users.router)
app.include_router(admin.router)

# Pydantic Models
class DocumentCreate(BaseModel):
    data: Dict[str, Any]


class DocumentUpdate(BaseModel):
    data: Dict[str, Any]


class QueryRequest(BaseModel):
    filters: Optional[List[Dict[str, Any]]] = None
    order_by: Optional[str] = None
    limit: Optional[int] = None


# Health Check
@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "DuThi THPT Backend API",
        "status": "online",
        "version": "2.0.0",
        "docs": "/api/docs",
        "health": "/health"
    }


@app.get("/health")
async def health_check():
    """Enhanced health check endpoint"""
    try:
        # Test database connection
        db_healthy = db.health_check()
        
        # Get database stats if available
        db_stats = {}
        try:
            if hasattr(db, 'get_stats'):
                db_stats = db.get_stats('posts')
        except:
            pass
        
        health_status = {
            "status": "healthy" if db_healthy else "degraded",
            "timestamp": datetime.now().isoformat(),
            "version": "2.0.0",
            "services": {
                "database": "connected" if db_healthy else "disconnected",
                "api": "operational"
            }
        }
        
        # Check system resources if psutil available
        try:
            import psutil
            cpu_percent = psutil.cpu_percent(interval=0.1)
            memory = psutil.virtual_memory()
            health_status["system"] = {
                "cpu_percent": cpu_percent,
                "memory_percent": memory.percent,
                "memory_available_mb": round(memory.available / (1024 * 1024), 2)
            }
        except ImportError:
            pass  # psutil not available, skip system stats
        
        if db_stats:
            health_status["database_stats"] = db_stats
        
        status_code = 200 if db_healthy else 503
        return JSONResponse(content=health_status, status_code=status_code)
        
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        raise HTTPException(status_code=503, detail=f"Health check failed: {str(e)}")


# Collection Operations
@app.get("/api/collections/{collection_name}")
async def get_collection(
    collection_name: str,
    limit: Optional[int] = None
):
    """Get all documents from a collection"""
    try:
        if limit:
            docs = db.query(collection_name, limit=limit)
        else:
            docs = db.get_all(collection_name)
        return {
            "collection": collection_name,
            "count": len(docs),
            "documents": docs
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/collections/{collection_name}")
async def create_document(
    collection_name: str,
    document: DocumentCreate,
    doc_id: Optional[str] = None
):
    """Create a new document in a collection"""
    try:
        # Add timestamp
        document.data["createdAt"] = datetime.now().isoformat()
        document.data["updatedAt"] = datetime.now().isoformat()
        
        new_doc_id = db.create(collection_name, document.data, doc_id)
        return {
            "message": "Document created successfully",
            "id": new_doc_id,
            "collection": collection_name
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/collections/{collection_name}/{doc_id}")
async def get_document(collection_name: str, doc_id: str):
    """Get a specific document by ID"""
    try:
        doc = db.read(collection_name, doc_id)
        if not doc:
            raise HTTPException(status_code=404, detail="Document not found")
        return doc
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.put("/api/collections/{collection_name}/{doc_id}")
async def update_document(
    collection_name: str,
    doc_id: str,
    document: DocumentUpdate
):
    """Update a document"""
    try:
        # Add updated timestamp
        document.data["updatedAt"] = datetime.now().isoformat()
        
        success = db.update(collection_name, doc_id, document.data)
        if not success:
            raise HTTPException(status_code=404, detail="Document not found")
        return {
            "message": "Document updated successfully",
            "id": doc_id,
            "collection": collection_name
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/collections/{collection_name}/{doc_id}")
async def delete_document(collection_name: str, doc_id: str):
    """Delete a document"""
    try:
        success = db.delete(collection_name, doc_id)
        if not success:
            raise HTTPException(status_code=404, detail="Document not found")
        return {
            "message": "Document deleted successfully",
            "id": doc_id,
            "collection": collection_name
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/collections/{collection_name}/query")
async def query_collection(collection_name: str, query: QueryRequest):
    """Query documents with filters"""
    try:
        # Convert filters format
        filters = None
        if query.filters:
            filters = [
                (f["field"], f.get("operator", "=="), f["value"])
                for f in query.filters
            ]
        
        docs = db.query(
            collection_name,
            filters=filters,
            order_by=query.order_by,
            limit=query.limit
        )
        return {
            "collection": collection_name,
            "count": len(docs),
            "documents": docs
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Error handlers
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """Global exception handler"""
    return JSONResponse(
        status_code=500,
        content={"detail": f"Internal server error: {str(exc)}"}
    )


if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host=settings.FASTAPI_HOST,
        port=settings.FASTAPI_PORT,
        reload=True
    )

