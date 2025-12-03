"""
Enhanced SQL Database with advanced features for large-scale data management:
- Connection pooling
- Query optimization
- Indexing
- Caching
- Batch operations
- Full-text search
"""
import os
import json
import hashlib
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List, Tuple
from uuid import uuid4
from functools import lru_cache
from collections import OrderedDict

from sqlalchemy import (
    create_engine,
    Column,
    String,
    DateTime,
    Text,
    Index,
    select,
    func,
    and_,
    or_,
    desc,
    asc,
    event,
)
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from sqlalchemy.pool import QueuePool, StaticPool
from sqlalchemy.engine import Engine

# Simple in-memory cache (can be replaced with Redis)
_cache: OrderedDict = OrderedDict()
_cache_max_size = 1000
_cache_ttl = 300  # 5 minutes


def _get_cache_key(collection: str, doc_id: Optional[str] = None, query_hash: Optional[str] = None) -> str:
    """Generate cache key"""
    if doc_id:
        return f"{collection}:{doc_id}"
    if query_hash:
        return f"{collection}:query:{query_hash}"
    return f"{collection}:all"


def _get_from_cache(key: str) -> Optional[Any]:
    """Get from cache with TTL check"""
    if key not in _cache:
        return None
    value, timestamp = _cache[key]
    if datetime.now() - timestamp > timedelta(seconds=_cache_ttl):
        _cache.pop(key, None)
        return None
    # Move to end (LRU)
    _cache.move_to_end(key)
    return value


def _set_cache(key: str, value: Any):
    """Set cache with LRU eviction"""
    _cache[key] = (value, datetime.now())
    _cache.move_to_end(key)
    # Evict oldest if over limit
    while len(_cache) > _cache_max_size:
        _cache.popitem(last=False)


def _clear_cache(collection: Optional[str] = None):
    """Clear cache for collection or all"""
    if collection:
        keys_to_remove = [k for k in _cache.keys() if k.startswith(f"{collection}:")]
        for k in keys_to_remove:
            _cache.pop(k, None)
    else:
        _cache.clear()


DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./app.db")
# Connection pool settings
POOL_SIZE = int(os.getenv("DB_POOL_SIZE", "10"))
MAX_OVERFLOW = int(os.getenv("DB_MAX_OVERFLOW", "20"))
POOL_TIMEOUT = int(os.getenv("DB_POOL_TIMEOUT", "30"))
POOL_RECYCLE = int(os.getenv("DB_POOL_RECYCLE", "3600"))

# Engine configuration
if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
        pool_pre_ping=True,
    )
else:
    # PostgreSQL, MySQL, etc.
    engine = create_engine(
        DATABASE_URL,
        poolclass=QueuePool,
        pool_size=POOL_SIZE,
        max_overflow=MAX_OVERFLOW,
        pool_timeout=POOL_TIMEOUT,
        pool_recycle=POOL_RECYCLE,
        pool_pre_ping=True,
        echo=os.getenv("SQL_ECHO", "false").lower() == "true",
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


class CollectionDocument(Base):
    """
    Enhanced collection/document model with indexes.
    """

    __tablename__ = "collection_documents"

    id = Column(String, primary_key=True, index=True)
    collection = Column(String, index=True, nullable=False)
    data = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, index=True)

    # Composite indexes for common queries
    __table_args__ = (
        Index("idx_collection_created", "collection", "created_at"),
        Index("idx_collection_updated", "collection", "updated_at"),
        Index("idx_collection_id", "collection", "id"),
    )


# Create indexes on startup
@event.listens_for(Engine, "connect")
def set_sqlite_pragma(dbapi_conn, connection_record):
    """Enable SQLite optimizations"""
    if DATABASE_URL.startswith("sqlite"):
        cursor = dbapi_conn.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")  # Write-Ahead Logging
        cursor.execute("PRAGMA synchronous=NORMAL")  # Faster writes
        cursor.execute("PRAGMA cache_size=10000")  # Larger cache
        cursor.execute("PRAGMA temp_store=MEMORY")  # Temp tables in memory
        cursor.execute("PRAGMA mmap_size=268435456")  # 256MB memory-mapped I/O
        cursor.close()


Base.metadata.create_all(bind=engine)


class EnhancedSQLDatabase:
    """
    Enhanced database wrapper with:
    - Connection pooling
    - Query optimization
    - Caching
    - Batch operations
    - Full-text search
    """

    def __init__(self):
        self.engine = engine
        self._session_factory = SessionLocal

    def _get_session(self) -> Session:
        """Get database session from pool"""
        return self._session_factory()

    def _load_data(self, row: CollectionDocument) -> Dict[str, Any]:
        """Load JSON data from row"""
        try:
            payload = json.loads(row.data) if row.data else {}
        except Exception:
            payload = {}
        return {"id": row.id, **payload}

    def _dump_data(self, data: Dict[str, Any]) -> str:
        """Dump data to JSON string"""
        return json.dumps(data or {})

    def _hash_query(self, collection: str, filters: Optional[List], order_by: Optional[str], limit: Optional[int]) -> str:
        """Generate hash for query caching"""
        query_str = f"{collection}:{filters}:{order_by}:{limit}"
        return hashlib.md5(query_str.encode()).hexdigest()

    # ==================== CRUD Operations ====================

    def create(
        self,
        collection_name: str,
        data: Dict[str, Any],
        doc_id: Optional[str] = None,
    ) -> str:
        """Create a new document with cache invalidation"""
        if not doc_id:
            doc_id = str(uuid4())

        now_iso = datetime.utcnow().isoformat()
        data = dict(data or {})
        data.setdefault("createdAt", now_iso)
        data.setdefault("updatedAt", now_iso)

        row = CollectionDocument(
            id=doc_id,
            collection=collection_name,
            data=self._dump_data(data),
        )

        with self._get_session() as session:
            session.add(row)
            session.commit()

        # Invalidate cache
        _clear_cache(collection_name)
        return doc_id

    def read(self, collection_name: str, doc_id: str, use_cache: bool = True) -> Optional[Dict[str, Any]]:
        """Read document with caching"""
        cache_key = _get_cache_key(collection_name, doc_id)
        
        if use_cache:
            cached = _get_from_cache(cache_key)
            if cached is not None:
                return cached

        with self._get_session() as session:
            stmt = (
                select(CollectionDocument)
                .where(
                    and_(
                        CollectionDocument.collection == collection_name,
                        CollectionDocument.id == doc_id,
                    )
                )
                .limit(1)
            )
            row = session.scalar(stmt)
            if not row:
                return None
            
            result = self._load_data(row)
            if use_cache:
                _set_cache(cache_key, result)
            return result

    def update(self, collection_name: str, doc_id: str, data: Dict[str, Any]) -> bool:
        """Update document with cache invalidation"""
        with self._get_session() as session:
            stmt = (
                select(CollectionDocument)
                .where(
                    and_(
                        CollectionDocument.collection == collection_name,
                        CollectionDocument.id == doc_id,
                    )
                )
                .limit(1)
            )
            row = session.scalar(stmt)
            if not row:
                return False

            existing = self._load_data(row)
            existing.pop("id", None)
            existing.update(data or {})
            existing["updatedAt"] = datetime.utcnow().isoformat()

            row.data = self._dump_data(existing)
            row.updated_at = datetime.utcnow()
            session.add(row)
            session.commit()

        # Invalidate cache
        _clear_cache(collection_name)
        return True

    def delete(self, collection_name: str, doc_id: str) -> bool:
        """Delete document with cache invalidation"""
        with self._get_session() as session:
            stmt = (
                select(CollectionDocument)
                .where(
                    and_(
                        CollectionDocument.collection == collection_name,
                        CollectionDocument.id == doc_id,
                    )
                )
                .limit(1)
            )
            row = session.scalar(stmt)
            if not row:
                return False
            session.delete(row)
            session.commit()

        # Invalidate cache
        _clear_cache(collection_name)
        return True

    # ==================== Query Operations ====================

    def query(
        self,
        collection_name: str,
        filters: Optional[List[Tuple[str, str, Any]]] = None,
        order_by: Optional[str] = None,
        limit: Optional[int] = None,
        offset: Optional[int] = None,
        use_cache: bool = True,
    ) -> List[Dict[str, Any]]:
        """
        Optimized query with caching and better pagination.
        """
        # Check cache for queries
        if use_cache and limit and limit <= 100:  # Only cache small queries
            query_hash = self._hash_query(collection_name, filters, order_by, limit)
            cache_key = _get_cache_key(collection_name, query_hash=query_hash)
            cached = _get_from_cache(cache_key)
            if cached is not None:
                return cached

        with self._get_session() as session:
            stmt = select(CollectionDocument).where(
                CollectionDocument.collection == collection_name
            )

            # Apply filters with optimized JSON extraction
            if filters:
                conditions = []
                for field, operator, value in filters:
                    json_path = f"$.{field}"
                    col = func.json_extract(CollectionDocument.data, json_path)

                    if operator == "==":
                        conditions.append(col == json.dumps(value))
                    elif operator == "!=":
                        conditions.append(col != json.dumps(value))
                    elif operator == "<":
                        conditions.append(col < json.dumps(value))
                    elif operator == "<=":
                        conditions.append(col <= json.dumps(value))
                    elif operator == ">":
                        conditions.append(col > json.dumps(value))
                    elif operator == ">=":
                        conditions.append(col >= json.dumps(value))
                    elif operator == "in":
                        # IN operator for arrays
                        if isinstance(value, list):
                            conditions.append(col.in_([json.dumps(v) for v in value]))
                    elif operator == "contains":
                        # Contains operator for strings
                        conditions.append(col.contains(str(value)))

                if conditions:
                    stmt = stmt.where(and_(*conditions))

            # Optimized ordering
            if order_by:
                json_path = f"$.{order_by}"
                order_col = func.json_extract(CollectionDocument.data, json_path)
                # Default to descending for timestamps
                if order_by in ("createdAt", "created_at", "updatedAt", "updated_at"):
                    stmt = stmt.order_by(desc(order_col))
                else:
                    stmt = stmt.order_by(desc(order_col))
            else:
                # Default order by created_at desc
                stmt = stmt.order_by(desc(CollectionDocument.created_at))

            # Pagination
            if offset:
                stmt = stmt.offset(offset)
            if limit:
                stmt = stmt.limit(limit)

            rows = session.scalars(stmt).all()
            result = [self._load_data(row) for row in rows]

            # Cache result
            if use_cache and limit and limit <= 100:
                _set_cache(cache_key, result)

            return result

    def count(
        self,
        collection_name: str,
        filters: Optional[List[Tuple[str, str, Any]]] = None,
    ) -> int:
        """Count documents with filters"""
        with self._get_session() as session:
            stmt = select(func.count(CollectionDocument.id)).where(
                CollectionDocument.collection == collection_name
            )

            if filters:
                conditions = []
                for field, operator, value in filters:
                    json_path = f"$.{field}"
                    col = func.json_extract(CollectionDocument.data, json_path)

                    if operator == "==":
                        conditions.append(col == json.dumps(value))
                    elif operator == "!=":
                        conditions.append(col != json.dumps(value))
                    # Add more operators as needed

                if conditions:
                    stmt = stmt.where(and_(*conditions))

            return session.scalar(stmt) or 0

    # ==================== Batch Operations ====================

    def batch_create(
        self,
        collection_name: str,
        documents: List[Dict[str, Any]],
    ) -> List[str]:
        """Batch create multiple documents"""
        now_iso = datetime.utcnow().isoformat()
        rows = []
        doc_ids = []

        for data in documents:
            doc_id = str(uuid4())
            doc_ids.append(doc_id)
            data = dict(data or {})
            data.setdefault("createdAt", now_iso)
            data.setdefault("updatedAt", now_iso)

            rows.append(
                CollectionDocument(
                    id=doc_id,
                    collection=collection_name,
                    data=self._dump_data(data),
                )
            )

        with self._get_session() as session:
            session.add_all(rows)
            session.commit()

        _clear_cache(collection_name)
        return doc_ids

    def batch_update(
        self,
        collection_name: str,
        updates: List[Tuple[str, Dict[str, Any]]],  # List of (doc_id, data)
    ) -> int:
        """Batch update multiple documents"""
        updated_count = 0
        now_iso = datetime.utcnow().isoformat()

        with self._get_session() as session:
            for doc_id, data in updates:
                stmt = (
                    select(CollectionDocument)
                    .where(
                        and_(
                            CollectionDocument.collection == collection_name,
                            CollectionDocument.id == doc_id,
                        )
                    )
                    .limit(1)
                )
                row = session.scalar(stmt)
                if row:
                    existing = self._load_data(row)
                    existing.pop("id", None)
                    existing.update(data or {})
                    existing["updatedAt"] = now_iso

                    row.data = self._dump_data(existing)
                    row.updated_at = datetime.utcnow()
                    session.add(row)
                    updated_count += 1

            session.commit()

        if updated_count > 0:
            _clear_cache(collection_name)
        return updated_count

    # ==================== Full-Text Search ====================

    def search(
        self,
        collection_name: str,
        search_term: str,
        fields: Optional[List[str]] = None,
        limit: Optional[int] = 50,
    ) -> List[Dict[str, Any]]:
        """
        Full-text search in JSON fields.
        For SQLite: uses LIKE operator
        For PostgreSQL: can use full-text search indexes
        """
        if not search_term:
            return []

        search_lower = search_term.lower()
        fields = fields or ["content", "title", "name"]

        with self._get_session() as session:
            stmt = select(CollectionDocument).where(
                CollectionDocument.collection == collection_name
            )

            # Build search conditions
            conditions = []
            for field in fields:
                json_path = f"$.{field}"
                col = func.json_extract(CollectionDocument.data, json_path)
                # Use LIKE for case-insensitive search
                conditions.append(func.lower(col.cast(String)).contains(search_lower))

            if conditions:
                stmt = stmt.where(or_(*conditions))

            stmt = stmt.order_by(desc(CollectionDocument.updated_at))
            if limit:
                stmt = stmt.limit(limit)

            rows = session.scalars(stmt).all()
            return [self._load_data(row) for row in rows]

    # ==================== Utility Methods ====================

    def get_all(self, collection_name: str) -> List[Dict[str, Any]]:
        """Get all documents (use with caution for large collections)"""
        return self.query(collection_name, limit=None)

    def health_check(self) -> bool:
        """Health check with connection pool test"""
        try:
            with self._get_session() as session:
                session.execute(select(func.count(CollectionDocument.id)).limit(1))
            return True
        except Exception:
            return False

    def get_stats(self, collection_name: str) -> Dict[str, Any]:
        """Get collection statistics"""
        with self._get_session() as session:
            total = session.scalar(
                select(func.count(CollectionDocument.id)).where(
                    CollectionDocument.collection == collection_name
                )
            ) or 0

            # Get date range
            date_range = session.execute(
                select(
                    func.min(CollectionDocument.created_at),
                    func.max(CollectionDocument.created_at),
                ).where(CollectionDocument.collection == collection_name)
            ).first()

            return {
                "collection": collection_name,
                "total_documents": total,
                "oldest_document": date_range[0].isoformat() if date_range and date_range[0] else None,
                "newest_document": date_range[1].isoformat() if date_range and date_range[1] else None,
            }

    def clear_cache(self, collection_name: Optional[str] = None):
        """Clear cache manually"""
        _clear_cache(collection_name)


# Enhanced database instance
db = EnhancedSQLDatabase()

