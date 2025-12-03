/**
 * Users API Service
 */
import { apiRequest } from './api';

export interface UserInfo {
  id: string;
  uid: string;
  email: string;
  name?: string;
  role: string;
  photo_url?: string;
  created_at?: string;
  updated_at?: string;
}

export const usersAPI = {
  /**
   * Lấy thông tin user hiện tại
   */
  async getMe(): Promise<UserInfo> {
    try {
      return await apiRequest<UserInfo>('/api/users/me', { requireAuth: true });
    } catch (error: any) {
      // Nếu 404, có thể endpoint chưa sẵn sàng, throw lại với message rõ ràng hơn
      if (error?.status === 404) {
        throw new Error('Endpoint /api/users/me không tồn tại. Vui lòng kiểm tra backend đã khởi động chưa.');
      }
      throw error;
    }
  },

  /**
   * Cập nhật thông tin user hiện tại
   */
  async updateMe(data: {
    name?: string;
    role?: string;
    photo_url?: string;
  }): Promise<UserInfo> {
    return apiRequest<UserInfo>('/api/users/me', {
      method: 'PUT',
      body: data,
      requireAuth: true,
    });
  },

  /**
   * Lấy thông tin user theo ID
   */
  async getById(userId: string): Promise<UserInfo> {
    return apiRequest<UserInfo>(`/api/users/${userId}`, { requireAuth: false });
  },
};

