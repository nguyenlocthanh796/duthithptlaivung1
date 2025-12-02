"""
FastAPI main application
"""
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from datetime import datetime
import uvicorn

from app.config import settings
from app.sql_database import db
from app.routers import exams, posts, ai_chat, documents, ai_feed, ai_analysis


app = FastAPI(
    title="DuThi THPT Backend API",
    description="Backend API for DuThi THPT Platform with SQL database and Firebase Auth",
    version="1.0.0"
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

# Include routers
app.include_router(exams.router)
app.include_router(posts.router)
app.include_router(ai_chat.router)
app.include_router(documents.router)
app.include_router(ai_feed.router)
app.include_router(ai_analysis.router)

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
        "version": "1.0.0"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    try:
        # Test database connection
        if not db.health_check():
            raise Exception("Database health check failed")
        return {
            "status": "healthy",
            "database": "connected",
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Database connection failed: {str(e)}")


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

