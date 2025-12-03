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

export interface Attachment {
  url: string;
  file_name: string;
  file_type: string;
  file_size: number;
  uploaded_at?: string;
}

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
  // Backward compatibility: image_url cũ vẫn hoạt động
  image_url?: string;
  // Mới: mảng ảnh (tối đa 5)
  image_urls?: string[];
  // Mới: mảng tài liệu
  attachments?: Attachment[];
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
  // Backward compatibility
  image_url?: string;
  // Mới: mảng ảnh (tối đa 5)
  image_urls?: string[];
  // Mới: mảng metadata tài liệu
  attachments?: Attachment[];
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
      const errorMessage = errorData.detail || `HTTP ${response.status}: ${response.statusText}`;
      const error = new Error(errorMessage);
      // Lưu status code vào error để có thể kiểm tra sau
      (error as any).status = response.status;
      throw error;
    }
    
    return await response.json();
  } catch (error: any) {
    // Không log lỗi 404 cho comments endpoint vì có thể post không tồn tại hoặc chưa có comments
    const isComments404 = error.status === 404 && endpoint.includes('/comments');
    if (!isComments404) {
      // Chỉ log error trong development
      if (import.meta.env.DEV) {
        console.error(`API Error [${method} ${endpoint}]:`, error);
      }
    }
    
    // Thêm thông tin chi tiết hơn cho error
    if (error.status === 401) {
      error.message = 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
    } else if (error.status === 403) {
      error.message = 'Bạn không có quyền thực hiện hành động này.';
    } else if (error.status === 404) {
      error.message = error.message || 'Không tìm thấy tài nguyên.';
    } else if (error.status === 500) {
      error.message = 'Lỗi server. Vui lòng thử lại sau.';
    }
    
    throw error;
  }
}

// ==================== POSTS API ====================

export const postsAPI = {
  async getAll(filters?: {
    subject?: string;
    author_id?: string;
    limit?: number;
    offset?: number;
  }): Promise<Post[]> {
    const params = new URLSearchParams();
    if (filters?.subject) params.append("subject", filters.subject);
    if (filters?.author_id) params.append("author_id", filters.author_id);
    if (filters?.limit) params.append("limit", filters.limit.toString());
    if (typeof filters?.offset === 'number') params.append("offset", filters.offset.toString());
    
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
    try {
      return await apiRequest<Comment[]>(
      `/api/posts/${postId}/comments${query ? `?${query}` : ''}`,
      { requireAuth: false }
    );
    } catch (error: any) {
      // Nếu lỗi 404, trả về mảng rỗng thay vì throw error
      if (error.status === 404 || error.message?.includes('404') || error.message?.includes('Not Found')) {
        return [];
      }
      throw error;
    }
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

// ==================== UPLOADS API ====================

export const uploadsAPI = {
  async uploadDocument(file: File): Promise<Attachment> {
    const formData = new FormData();
    formData.append("file", file);
    
    const headers = await getHeaders(true);
    // Xóa Content-Type để browser tự set với boundary cho multipart/form-data
    delete (headers as any)["Content-Type"];
    
    const response = await fetch(`${API_BASE_URL}/api/uploads/doc`, {
      method: "POST",
      headers,
      body: formData,
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: response.statusText }));
      throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  },

  async uploadImage(file: File): Promise<Attachment> {
    const formData = new FormData();
    formData.append("file", file);
    
    const headers = await getHeaders(true);
    delete (headers as any)["Content-Type"];
    
    const response = await fetch(`${API_BASE_URL}/api/uploads/image`, {
      method: "POST",
      headers,
      body: formData,
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: response.statusText }));
      throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
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

