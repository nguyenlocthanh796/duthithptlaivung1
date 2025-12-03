"""
SQL-based database implementation to replace Firestore.

Default: SQLite file database, but can be switched via DATABASE_URL env.
"""
import os
import json
from datetime import datetime
from typing import Optional, Dict, Any, List, Tuple
from uuid import uuid4

from sqlalchemy import (
    create_engine,
    Column,
    String,
    DateTime,
    Text,
    select,
    func,
)
from sqlalchemy.orm import declarative_base, sessionmaker, Session


DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./app.db")

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {},
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


class CollectionDocument(Base):
    """
    Generic collection/document model.
    Stores Firestore-like documents as JSON in a single table.
    """

    __tablename__ = "collection_documents"

    id = Column(String, primary_key=True, index=True)
    collection = Column(String, index=True)
    data = Column(Text)  # JSON-serialized dict
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


Base.metadata.create_all(bind=engine)


class SQLDatabase:
    """Firestore-like wrapper on top of SQLAlchemy."""

    def __init__(self):
        self.engine = engine

    def _get_session(self) -> Session:
        return SessionLocal()

    # Basic helpers
    def _load_data(self, row: CollectionDocument) -> Dict[str, Any]:
        try:
            payload = json.loads(row.data) if row.data else {}
        except Exception:
            payload = {}
        return {"id": row.id, **payload}

    def _dump_data(self, data: Dict[str, Any]) -> str:
        return json.dumps(data or {})

    # Public API – compatible with previous FirestoreDB where possible

    def get_collection(self, collection_name: str):
        """
        For compatibility only – returns the collection name itself.
        """
        return collection_name

    def get_document(self, collection_name: str, document_id: str):
        """Return a (collection, id) tuple for compatibility."""
        return collection_name, document_id

    def create(
        self,
        collection_name: str,
        data: Dict[str, Any],
        doc_id: Optional[str] = None,
    ) -> str:
        """Create a new document."""
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

        return doc_id

    def read(self, collection_name: str, doc_id: str) -> Optional[Dict[str, Any]]:
        """Read a document by ID."""
        with self._get_session() as session:
            stmt = (
                select(CollectionDocument)
                .where(
                    CollectionDocument.collection == collection_name,
                    CollectionDocument.id == doc_id,
                )
                .limit(1)
            )
            row = session.scalar(stmt)
            if not row:
                return None
            return self._load_data(row)

    def update(self, collection_name: str, doc_id: str, data: Dict[str, Any]) -> bool:
        """Update a document (merge fields)."""
        with self._get_session() as session:
            stmt = (
                select(CollectionDocument)
                .where(
                    CollectionDocument.collection == collection_name,
                    CollectionDocument.id == doc_id,
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
            return True

    def delete(self, collection_name: str, doc_id: str) -> bool:
        """Delete a document."""
        with self._get_session() as session:
            stmt = (
                select(CollectionDocument)
                .where(
                    CollectionDocument.collection == collection_name,
                    CollectionDocument.id == doc_id,
                )
                .limit(1)
            )
            row = session.scalar(stmt)
            if not row:
                return False
            session.delete(row)
            session.commit()
            return True

    def query(
        self,
        collection_name: str,
        filters: Optional[List[Tuple[str, str, Any]]] = None,
        order_by: Optional[str] = None,
        limit: Optional[int] = None,
    ) -> List[Dict[str, Any]]:
        """
        Query documents with simple filters.
        Supported operators: ==, !=, <, <=, >, >=
        (on top-level fields inside the JSON document).
        """
        with self._get_session() as session:
            stmt = select(CollectionDocument).where(
                CollectionDocument.collection == collection_name
            )

            if filters:
                for field, operator, value in filters:
                    json_path = f"$.{field}"
                    col = func.json_extract(CollectionDocument.data, json_path)

                    if operator == "==":
                        stmt = stmt.where(col == json.dumps(value))
                    elif operator == "!=":
                        stmt = stmt.where(col != json.dumps(value))
                    elif operator == "<":
                        stmt = stmt.where(col < json.dumps(value))
                    elif operator == "<=":
                        stmt = stmt.where(col <= json.dumps(value))
                    elif operator == ">":
                        stmt = stmt.where(col > json.dumps(value))
                    elif operator == ">=":
                        stmt = stmt.where(col >= json.dumps(value))

            if order_by:
                json_path = f"$.{order_by}"
                stmt = stmt.order_by(func.json_extract(CollectionDocument.data, json_path))

            if limit:
                stmt = stmt.limit(limit)

            rows = session.scalars(stmt).all()
            return [self._load_data(row) for row in rows]

    def get_all(self, collection_name: str) -> List[Dict[str, Any]]:
        """Get all documents from a collection."""
        return self.query(collection_name)

    def health_check(self) -> bool:
        """Simple health check – try to open a session and run a trivial query."""
        try:
            with self._get_session() as session:
                session.execute(select(func.count(CollectionDocument.id)))
            return True
        except Exception:
            return False


# Global database instance
# Try to use enhanced version if available, fallback to basic
try:
    from app.sql_database_enhanced import EnhancedSQLDatabase
    db = EnhancedSQLDatabase()
except ImportError:
    db = SQLDatabase()


