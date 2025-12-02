/**
 * API Service Layer - TypeScript version
 * Kết nối với Backend mới thay thế Firebase/Firestore
 */

// Vite sử dụng import.meta.env thay vì process.env
// Chuẩn hóa để bỏ dấu "/" ở cuối nhằm tránh "//api" gây lỗi 404 trên một số proxy
const RAW_API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  "http://35.223.145.48:8000";

const API_BASE_URL = RAW_API_BASE_URL.replace(/\/+$/, "");

// ==================== TYPES ====================

export interface Post {
  id: string;
  content: string;
  author_id: string;
  author_name: string;
  author_role: string;
  subject?: string;
  grade?: number;
  topic?: string;
  post_type: string;
  likes: number;
  comments: number;
  shares: number;
  created_at: string;
  updated_at: string;
  image_url?: string;
  hasQuestion?: boolean;
  status?: string; // pending | clean | needs_review | rejected
  isEducational?: boolean | null;
  aiTags?: string[];
  aiComment?: string | null;
  reactionCounts?: Record<string, number>;
  userReactions?: Record<string, string>;
}

export interface Comment {
  id: string;
  post_id: string;
  author_id: string;
  author_name: string;
  author_role: string;
  content: string;
  is_ai_generated: boolean;
  created_at: string;
  updated_at: string;
}

export interface CommentCreate {
  content: string;
}

export interface PostCreate {
  content: string;
  subject?: string;
  post_type?: string;
  image_url?: string;
  hasQuestion?: boolean;
  author_id?: string;
  author_name?: string;
  author_email?: string;
  author_role?: string;
}

export interface PostUpdate {
  content?: string;
  subject?: string;
  post_type?: string;
  image_url?: string;
}

export interface Exam {
  id: string;
  title: string;
  subject: string;
  duration: number;
  questions_count: number;
  difficulty: string;
  description?: string;
  is_premium: boolean;
  rating?: number;
  created_at: string;
  updated_at: string;
}

export interface ExamCreate {
  title: string;
  subject: string;
  duration: number;
  questions_count: number;
  difficulty?: string;
  description?: string;
  is_premium?: boolean;
}

export interface Document {
  id: string;
  title: string;
  category: string;
  subject?: string;
  description?: string;
  file_type: string;
  file_size: number;
  author: string;
  downloads: number;
  is_premium: boolean;
  created_at: string;
  updated_at: string;
}

export interface DocumentCreate {
  title: string;
  category: string;
  subject?: string;
  description?: string;
  file_type: string;
  file_size: number;
  author: string;
  author_id?: string;
  is_premium?: boolean;
}

// ==================== AUTH HELPERS ====================

/**
 * Lấy Firebase ID Token từ current user
 * Hỗ trợ cả Firebase v8 (compat) và v9+ (modular)
 */
async function getAuthToken(): Promise<string | null> {
  try {
    if (typeof window === 'undefined') {
      return null;
    }

    // Firebase v9+ (modular) - import từ 'firebase/auth'
    // Sử dụng auth từ firebase config
    const { auth } = await import('../config/firebase');
    if (auth.currentUser) {
      return await auth.currentUser.getIdToken();
    }
    
    return null;
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
export async function apiRequest<T>(
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

// ==================== POSTS API ====================

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
  
  async update(postId: string, data: PostUpdate): Promise<Post> {
    return apiRequest<Post>(`/api/posts/${postId}`, {
      method: "PUT",
      body: data,
      requireAuth: true,
    });
  },
  
  async delete(postId: string): Promise<{ message: string }> {
    return apiRequest<{ message: string }>(`/api/posts/${postId}`, {
      method: "DELETE",
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
    reaction: "idea" | "thinking" | "resource" | "motivation",
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

// ==================== COMMENTS API ====================

export const commentsAPI = {
  async getForPost(postId: string, limit = 50): Promise<Comment[]> {
    const params = new URLSearchParams();
    params.append('limit', String(limit));
    const query = params.toString();
    return apiRequest<Comment[]>(
      `/api/posts/${postId}/comments${query ? `?${query}` : ''}`,
      { requireAuth: false }
    );
  },

  async create(postId: string, data: CommentCreate): Promise<Comment> {
    return apiRequest<Comment>(`/api/posts/${postId}/comments`, {
      method: 'POST',
      body: data,
      requireAuth: true,
    });
  },

  async update(postId: string, commentId: string, data: CommentCreate): Promise<Comment> {
    return apiRequest<Comment>(`/api/posts/${postId}/comments/${commentId}`, {
      method: 'PUT',
      body: data,
      requireAuth: true,
    });
  },

  async delete(postId: string, commentId: string): Promise<{ message: string }> {
    return apiRequest<{ message: string }>(`/api/posts/${postId}/comments/${commentId}`, {
      method: 'DELETE',
      requireAuth: true,
    });
  },
};

// ==================== EXAMS API ====================

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

// ==================== DOCUMENTS API ====================

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

// ==================== HEALTH CHECK ====================

export const healthAPI = {
  async check(): Promise<any> {
    return apiRequest("/health", { requireAuth: false });
  },
  
  async root(): Promise<any> {
    return apiRequest("/", { requireAuth: false });
  },
};

// ==================== ME / PROFILE API ====================

export const meAPI = {
  async overview(): Promise<{
    user: { id: string; name: string };
    stats: { total_posts: number; total_comments: number; favorite_subject: string | null };
    recent_posts: {
      id: string;
      content: string;
      subject?: string;
      created_at?: string;
      comments: number;
      likes: number;
    }[];
  }> {
    return apiRequest("/api/me/overview", {
      method: "GET",
      requireAuth: true,
    });
  },
};

// ==================== EXPORT DEFAULT ====================

export default {
  posts: postsAPI,
  exams: examsAPI,
  documents: documentsAPI,
  health: healthAPI,
  API_BASE_URL,
};

