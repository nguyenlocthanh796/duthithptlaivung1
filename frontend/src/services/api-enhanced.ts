/**
 * Enhanced API Service với support cho pagination, search, và standardized responses
 */
import { apiRequest } from './api';

// ==================== TYPES ====================

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    has_more: boolean;
    total_pages?: number;
    current_page?: number;
  };
  meta?: Record<string, any>;
}

export interface PostsListParams {
  subject?: string;
  author_id?: string;
  status?: string;
  limit?: number;
  offset?: number;
  search?: string;
}

export interface PostsStats {
  collection: string;
  total_documents: number;
  oldest_document: string | null;
  newest_document: string | null;
  by_status?: {
    approved: number;
    pending: number;
    rejected: number;
  };
}

// ==================== ENHANCED POSTS API ====================

export const postsAPIEnhanced = {
  /**
   * Get posts với enhanced pagination và search
   */
  async getAll(params: PostsListParams = {}): Promise<PaginatedResponse<any>> {
    const queryParams = new URLSearchParams();
    
    if (params.subject && params.subject !== 'all') {
      queryParams.append('subject', params.subject);
    }
    if (params.author_id) {
      queryParams.append('author_id', params.author_id);
    }
    if (params.status) {
      queryParams.append('status', params.status);
    }
    if (params.limit) {
      queryParams.append('limit', params.limit.toString());
    }
    if (params.offset !== undefined) {
      queryParams.append('offset', params.offset.toString());
    }
    if (params.search) {
      queryParams.append('search', params.search);
    }

    const query = queryParams.toString();
    return apiRequest<PaginatedResponse<any>>(
      `/api/posts/${query ? `?${query}` : ''}`,
      { requireAuth: false }
    );
  },

  /**
   * Get posts statistics
   */
  async getStats(): Promise<PostsStats> {
    return apiRequest<PostsStats>('/api/posts/stats', { requireAuth: false });
  },
};

