/**
 * Admin API Service
 */
import { apiRequest } from './api';

export interface AdminStats {
  users: {
    total: number;
    by_role: Record<string, number>;
  };
  posts: {
    total: number;
    by_subject: Record<string, number>;
    by_status: Record<string, number>;
  };
  comments: {
    total: number;
  };
  timestamp: string;
}

export interface User {
  id: string;
  uid: string;
  email: string;
  name?: string;
  role: string;
  photo_url?: string;
  createdAt?: string;
  updatedAt?: string;
}

export const adminAPI = {
  /**
   * Lấy thống kê tổng quan
   */
  async getStats(): Promise<AdminStats> {
    return apiRequest<AdminStats>('/api/admin/stats', { requireAuth: true });
  },

  /**
   * Lấy danh sách users
   */
  async getUsers(params?: {
    limit?: number;
    offset?: number;
    search?: string;
    role?: string;
  }): Promise<User[]> {
    const queryParams = new URLSearchParams();
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.offset) queryParams.append('offset', params.offset.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.role) queryParams.append('role', params.role);

    const query = queryParams.toString();
    return apiRequest<User[]>(`/api/users/${query ? `?${query}` : ''}`, {
      requireAuth: true,
    });
  },

  /**
   * Cập nhật role của user
   */
  async updateUserRole(userId: string, role: string): Promise<User> {
    return apiRequest<User>(`/api/users/${userId}/role`, {
      method: 'PUT',
      body: { role },
      requireAuth: true,
    });
  },

  /**
   * Xóa user
   */
  async deleteUser(userId: string): Promise<{ message: string }> {
    return apiRequest<{ message: string }>(`/api/users/${userId}`, {
      method: 'DELETE',
      requireAuth: true,
    });
  },

  /**
   * Lấy tất cả posts (admin)
   */
  async getAllPosts(params?: {
    limit?: number;
    offset?: number;
    search?: string;
    subject?: string;
    status?: string;
  }): Promise<any[]> {
    const queryParams = new URLSearchParams();
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.offset) queryParams.append('offset', params.offset.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.subject) queryParams.append('subject', params.subject);
    if (params?.status) queryParams.append('status', params.status);

    const query = queryParams.toString();
    return apiRequest<any[]>(`/api/admin/posts/all${query ? `?${query}` : ''}`, {
      requireAuth: true,
    });
  },

  /**
   * Xóa post (admin)
   */
  async deletePost(postId: string): Promise<{ message: string }> {
    return apiRequest<{ message: string }>(`/api/admin/posts/${postId}`, {
      method: 'DELETE',
      requireAuth: true,
    });
  },

  /**
   * Cập nhật status của post
   */
  async updatePostStatus(
    postId: string,
    status: 'pending' | 'approved' | 'rejected'
  ): Promise<any> {
    return apiRequest<any>(`/api/admin/posts/${postId}/status`, {
      method: 'PUT',
      body: { status },
      requireAuth: true,
    });
  },
};

