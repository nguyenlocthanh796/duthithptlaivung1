"""
Firestore database connection and utilities
"""
import os
from typing import Optional, Dict, Any, List
from google.cloud import firestore
from google.oauth2 import service_account
from app.config import settings
import json


class FirestoreDB:
    """Firestore database connection manager"""
    
    def __init__(self):
        self.db: Optional[firestore.Client] = None
        self._initialize()
    
    def _initialize(self):
        """Initialize Firestore client"""
        try:
            # Method 1: Use service account credentials file
            credentials_path = settings.FIREBASE_CREDENTIALS_PATH
            
            # Resolve path: check relative to current dir, then relative to backend dir
            if not os.path.isabs(credentials_path):
                # Try current directory first
                if not os.path.exists(credentials_path):
                    # Try relative to backend directory
                    backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
                    backend_credentials_path = os.path.join(backend_dir, credentials_path)
                    if os.path.exists(backend_credentials_path):
                        credentials_path = backend_credentials_path
            
            if os.path.exists(credentials_path):
                credentials = service_account.Credentials.from_service_account_file(
                    credentials_path
                )
                self.db = firestore.Client(
                    project=settings.FIREBASE_PROJECT_ID,
                    credentials=credentials
                )
                # Use ASCII-safe message for Windows compatibility
                try:
                    print(f"[OK] Firestore connected using credentials file: {credentials_path}")
                except UnicodeEncodeError:
                    print(f"[OK] Firestore connected using credentials file")
            
            # Method 2: Use environment variable with JSON credentials
            elif os.getenv("FIREBASE_CREDENTIALS_JSON"):
                credentials_json = json.loads(os.getenv("FIREBASE_CREDENTIALS_JSON"))
                credentials = service_account.Credentials.from_service_account_info(
                    credentials_json
                )
                self.db = firestore.Client(
                    project=settings.FIREBASE_PROJECT_ID,
                    credentials=credentials
                )
                try:
                    print("[OK] Firestore connected using environment variable")
                except UnicodeEncodeError:
                    print("[OK] Firestore connected")
            
            # Method 3: Use default credentials (for Cloud Run deployment)
            else:
                self.db = firestore.Client(project=settings.FIREBASE_PROJECT_ID)
                try:
                    print("[OK] Firestore connected using default credentials")
                except UnicodeEncodeError:
                    print("[OK] Firestore connected")
                
        except Exception as e:
            try:
                print(f"[ERROR] Error connecting to Firestore: {str(e)}")
            except UnicodeEncodeError:
                print(f"[ERROR] Error connecting to Firestore: {repr(e)}")
            raise
    
    def get_collection(self, collection_name: str):
        """Get a Firestore collection reference"""
        if not self.db:
            raise Exception("Firestore not initialized")
        return self.db.collection(collection_name)
    
    def get_document(self, collection_name: str, document_id: str):
        """Get a Firestore document reference"""
        if not self.db:
            raise Exception("Firestore not initialized")
        return self.db.collection(collection_name).document(document_id)
    
    # CRUD Operations
    
    def create(self, collection_name: str, data: Dict[str, Any], doc_id: Optional[str] = None) -> str:
        """Create a new document"""
        collection_ref = self.get_collection(collection_name)
        if doc_id:
            collection_ref.document(doc_id).set(data)
            return doc_id
        else:
            doc_ref = collection_ref.add(data)
            return doc_ref[1].id
    
    def read(self, collection_name: str, doc_id: str) -> Optional[Dict[str, Any]]:
        """Read a document by ID"""
        doc_ref = self.get_document(collection_name, doc_id)
        doc = doc_ref.get()
        if doc.exists:
            return {"id": doc.id, **doc.to_dict()}
        return None
    
    def update(self, collection_name: str, doc_id: str, data: Dict[str, Any]) -> bool:
        """Update a document"""
        doc_ref = self.get_document(collection_name, doc_id)
        doc = doc_ref.get()
        if doc.exists:
            doc_ref.update(data)
            return True
        return False
    
    def delete(self, collection_name: str, doc_id: str) -> bool:
        """Delete a document"""
        doc_ref = self.get_document(collection_name, doc_id)
        doc = doc_ref.get()
        if doc.exists:
            doc_ref.delete()
            return True
        return False
    
    def query(self, collection_name: str, filters: Optional[List[tuple]] = None, 
              order_by: Optional[str] = None, limit: Optional[int] = None) -> List[Dict[str, Any]]:
        """
        Query documents with filters
        filters: List of tuples [(field, operator, value), ...]
        operators: ==, <, <=, >, >=, !=, in, array-contains
        """
        collection_ref = self.get_collection(collection_name)
        query = collection_ref
        
        if filters:
            for field, operator, value in filters:
                if operator == "==":
                    query = query.where(field, "==", value)
                elif operator == "<":
                    query = query.where(field, "<", value)
                elif operator == "<=":
                    query = query.where(field, "<=", value)
                elif operator == ">":
                    query = query.where(field, ">", value)
                elif operator == ">=":
                    query = query.where(field, ">=", value)
                elif operator == "!=":
                    query = query.where(field, "!=", value)
                elif operator == "in":
                    query = query.where(field, "in", value)
                elif operator == "array-contains":
                    query = query.where(field, "array-contains", value)
        
        if order_by:
            query = query.order_by(order_by)
        
        if limit:
            query = query.limit(limit)
        
        docs = query.stream()
        return [{"id": doc.id, **doc.to_dict()} for doc in docs]
    
    def get_all(self, collection_name: str) -> List[Dict[str, Any]]:
        """Get all documents from a collection"""
        return self.query(collection_name)


# Global database instance
db = FirestoreDB()

