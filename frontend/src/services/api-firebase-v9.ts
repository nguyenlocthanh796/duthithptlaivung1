/**
 * API Service với Firebase v9+ (modular) integration
 * Sử dụng file này nếu bạn dùng Firebase v9+ modular SDK
 * 
 * Cách dùng:
 * 1. Import file này thay vì api.ts
 * 2. Pass auth instance vào initAPI(auth)
 */

import { Auth } from 'firebase/auth';
import { Post, PostCreate, Exam, ExamCreate, Document, DocumentCreate } from './api';

const API_BASE_URL = 
  process.env.REACT_APP_API_URL || 
  process.env.VITE_API_URL || 
  process.env.NEXT_PUBLIC_API_URL ||
  "http://35.223.145.48:8000";

let firebaseAuth: Auth | null = null;

/**
 * Khởi tạo API với Firebase Auth instance
 * Gọi hàm này một lần khi app khởi động
 */
export function initAPI(auth: Auth) {
  firebaseAuth = auth;
}

/**
 * Lấy Firebase ID Token
 */
async function getAuthToken(): Promise<string | null> {
  try {
    if (!firebaseAuth?.currentUser) {
      return null;
    }
    return await firebaseAuth.currentUser.getIdToken();
  } catch (error) {
    console.error("Error getting auth token:", error);
    return null;
  }
}

/**
 * Tạo headers với authentication
 */
async function getHeaders(includeAuth = true): Promise<HeadersInit> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  
  if (includeAuth) {
    const token = await getAuthToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }
  
  return headers;
}

/**
 * Generic API request helper
 */
async function apiRequest<T>(
  endpoint: string,
  options: {
    method?: string;
    body?: any;
    requireAuth?: boolean;
  } = {}
): Promise<T> {
  const { method = "GET", body, requireAuth = true } = options;
  
  const headers = await getHeaders(requireAuth);
  
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: response.statusText }));
      throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`API Error [${method} ${endpoint}]:`, error);
    throw error;
  }
}

// Export lại các API functions giống như api.ts
export const postsAPI = {
  async getAll(filters?: { subject?: string; author_id?: string; limit?: number }): Promise<Post[]> {
    const params = new URLSearchParams();
    if (filters?.subject) params.append("subject", filters.subject);
    if (filters?.author_id) params.append("author_id", filters.author_id);
    if (filters?.limit) params.append("limit", filters.limit.toString());
    
    const query = params.toString();
    return apiRequest<Post[]>(`/api/posts${query ? `?${query}` : ""}`, { requireAuth: false });
  },
  
  async getById(postId: string): Promise<Post> {
    return apiRequest<Post>(`/api/posts/${postId}`, { requireAuth: false });
  },
  
  async create(postData: PostCreate): Promise<Post> {
    return apiRequest<Post>("/api/posts", {
      method: "POST",
      body: postData,
      requireAuth: true,
    });
  },
  
  async like(postId: string): Promise<{ message: string; likes: number }> {
    return apiRequest(`/api/posts/${postId}/like`, {
      method: "POST",
      requireAuth: true,
    });
  },
  
  async react(
    postId: string,
    reaction: "like" | "love" | "care" | "haha" | "wow" | "sad" | "angry" = "like",
    userId?: string
  ): Promise<any> {
    return apiRequest(`/api/posts/${postId}/reaction`, {
      method: "POST",
      body: {
        user_id: userId,
        reaction: reaction,
      },
      requireAuth: true,
    });
  },
};

export const examsAPI = {
  async getAll(filters?: { subject?: string; difficulty?: string; limit?: number }): Promise<Exam[]> {
    const params = new URLSearchParams();
    if (filters?.subject) params.append("subject", filters.subject);
    if (filters?.difficulty) params.append("difficulty", filters.difficulty);
    if (filters?.limit) params.append("limit", filters.limit.toString());
    
    const query = params.toString();
    return apiRequest<Exam[]>(`/api/exams${query ? `?${query}` : ""}`, { requireAuth: false });
  },
  
  async getById(examId: string): Promise<Exam> {
    return apiRequest<Exam>(`/api/exams/${examId}`, { requireAuth: false });
  },
  
  async create(examData: ExamCreate): Promise<Exam> {
    return apiRequest<Exam>("/api/exams", {
      method: "POST",
      body: examData,
      requireAuth: true,
    });
  },
  
  async update(examId: string, examData: ExamCreate): Promise<Exam> {
    return apiRequest<Exam>(`/api/exams/${examId}`, {
      method: "PUT",
      body: examData,
      requireAuth: true,
    });
  },
  
  async delete(examId: string): Promise<{ message: string }> {
    return apiRequest(`/api/exams/${examId}`, {
      method: "DELETE",
      requireAuth: true,
    });
  },
};

export const documentsAPI = {
  async getAll(filters?: { category?: string; subject?: string; limit?: number }): Promise<Document[]> {
    const params = new URLSearchParams();
    if (filters?.category) params.append("category", filters.category);
    if (filters?.subject) params.append("subject", filters.subject);
    if (filters?.limit) params.append("limit", filters.limit.toString());
    
    const query = params.toString();
    return apiRequest<Document[]>(`/api/documents${query ? `?${query}` : ""}`, { requireAuth: false });
  },
  
  async getById(documentId: string): Promise<Document> {
    return apiRequest<Document>(`/api/documents/${documentId}`, { requireAuth: false });
  },
  
  async create(documentData: DocumentCreate): Promise<Document> {
    return apiRequest<Document>("/api/documents", {
      method: "POST",
      body: documentData,
      requireAuth: true,
    });
  },
  
  async download(documentId: string): Promise<{ message: string; downloads: number }> {
    return apiRequest(`/api/documents/${documentId}/download`, {
      method: "POST",
      requireAuth: true,
    });
  },
  
  async delete(documentId: string): Promise<{ message: string }> {
    return apiRequest(`/api/documents/${documentId}`, {
      method: "DELETE",
      requireAuth: true,
    });
  },
};

export default {
  posts: postsAPI,
  exams: examsAPI,
  documents: documentsAPI,
  API_BASE_URL,
};

