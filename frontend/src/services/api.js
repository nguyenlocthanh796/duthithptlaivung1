/**
 * API Service Layer - Kết nối với Backend mới
 * Thay thế Firebase/Firestore bằng REST API
 */

// Vite sử dụng import.meta.env thay vì process.env
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://35.223.145.48:8000";

/**
 * Lấy Firebase ID Token từ current user
 * Sử dụng Firebase v9+ (modular)
 */
async function getAuthToken() {
  try {
    if (typeof window === 'undefined') {
      return null;
    }

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
async function getHeaders(includeAuth = true) {
  const headers = {
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
async function apiRequest(endpoint, options = {}) {
  const { method = "GET", body, requireAuth = true, ...restOptions } = options;
  
  const headers = await getHeaders(requireAuth);
  
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      ...restOptions,
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
  /**
   * Lấy danh sách posts
   * @param {Object} filters - { subject, author_id, limit }
   */
  async getAll(filters = {}) {
    const params = new URLSearchParams();
    if (filters.subject) params.append("subject", filters.subject);
    if (filters.author_id) params.append("author_id", filters.author_id);
    if (filters.limit) params.append("limit", filters.limit);
    
    const query = params.toString();
    return apiRequest(`/api/posts${query ? `?${query}` : ""}`, { requireAuth: false });
  },
  
  /**
   * Lấy post theo ID
   */
  async getById(postId) {
    return apiRequest(`/api/posts/${postId}`, { requireAuth: false });
  },
  
  /**
   * Tạo post mới
   * @param {Object} postData - { content, subject, post_type, image_url, ... }
   */
  async create(postData) {
    return apiRequest("/api/posts", {
      method: "POST",
      body: postData,
      requireAuth: true,
    });
  },
  
  /**
   * Like một post
   */
  async like(postId) {
    return apiRequest(`/api/posts/${postId}/like`, {
      method: "POST",
      requireAuth: true,
    });
  },
  
  /**
   * React to post (like, love, care, haha, wow, sad, angry)
   * @param {string} postId
   * @param {string} reaction - "like" | "love" | "care" | "haha" | "wow" | "sad" | "angry"
   * @param {string} userId - Optional, sẽ lấy từ token nếu không có
   */
  async react(postId, reaction = "like", userId = null) {
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

// ==================== EXAMS API ====================

export const examsAPI = {
  /**
   * Lấy danh sách exams
   * @param {Object} filters - { subject, difficulty, limit }
   */
  async getAll(filters = {}) {
    const params = new URLSearchParams();
    if (filters.subject) params.append("subject", filters.subject);
    if (filters.difficulty) params.append("difficulty", filters.difficulty);
    if (filters.limit) params.append("limit", filters.limit);
    
    const query = params.toString();
    return apiRequest(`/api/exams${query ? `?${query}` : ""}`, { requireAuth: false });
  },
  
  /**
   * Lấy exam theo ID
   */
  async getById(examId) {
    return apiRequest(`/api/exams/${examId}`, { requireAuth: false });
  },
  
  /**
   * Tạo exam mới
   * @param {Object} examData - { title, subject, duration, questions_count, difficulty, ... }
   */
  async create(examData) {
    return apiRequest("/api/exams", {
      method: "POST",
      body: examData,
      requireAuth: true,
    });
  },
  
  /**
   * Cập nhật exam
   */
  async update(examId, examData) {
    return apiRequest(`/api/exams/${examId}`, {
      method: "PUT",
      body: examData,
      requireAuth: true,
    });
  },
  
  /**
   * Xóa exam
   */
  async delete(examId) {
    return apiRequest(`/api/exams/${examId}`, {
      method: "DELETE",
      requireAuth: true,
    });
  },
};

// ==================== DOCUMENTS API ====================

export const documentsAPI = {
  /**
   * Lấy danh sách documents
   * @param {Object} filters - { category, subject, limit }
   */
  async getAll(filters = {}) {
    const params = new URLSearchParams();
    if (filters.category) params.append("category", filters.category);
    if (filters.subject) params.append("subject", filters.subject);
    if (filters.limit) params.append("limit", filters.limit);
    
    const query = params.toString();
    return apiRequest(`/api/documents${query ? `?${query}` : ""}`, { requireAuth: false });
  },
  
  /**
   * Lấy document theo ID
   */
  async getById(documentId) {
    return apiRequest(`/api/documents/${documentId}`, { requireAuth: false });
  },
  
  /**
   * Tạo document mới
   * @param {Object} documentData - { title, category, subject, file_type, file_size, author, ... }
   */
  async create(documentData) {
    return apiRequest("/api/documents", {
      method: "POST",
      body: documentData,
      requireAuth: true,
    });
  },
  
  /**
   * Ghi nhận download document
   */
  async download(documentId) {
    return apiRequest(`/api/documents/${documentId}/download`, {
      method: "POST",
      requireAuth: true,
    });
  },
  
  /**
   * Xóa document
   */
  async delete(documentId) {
    return apiRequest(`/api/documents/${documentId}`, {
      method: "DELETE",
      requireAuth: true,
    });
  },
};

// ==================== HEALTH CHECK ====================

export const healthAPI = {
  async check() {
    return apiRequest("/health", { requireAuth: false });
  },
  
  async root() {
    return apiRequest("/", { requireAuth: false });
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

