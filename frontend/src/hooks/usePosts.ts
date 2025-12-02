/**
 * Custom React Hook để quản lý Posts
 * Ví dụ cách tạo reusable hook với API service
 */
import { useState, useEffect, useCallback } from 'react';
import { postsAPI, Post, PostCreate } from '../services/api';

interface UsePostsOptions {
  subject?: string;
  authorId?: string;
  limit?: number;
  autoLoad?: boolean; // Tự động load khi mount
}

export const usePosts = (options: UsePostsOptions = {}) => {
  const { subject, authorId, limit = 50, autoLoad = true } = options;
  
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(autoLoad);
  const [error, setError] = useState<string | null>(null);

  const loadPosts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const filters: any = { limit };
      if (subject) filters.subject = subject;
      if (authorId) filters.author_id = authorId;
      
      const data = await postsAPI.getAll(filters);
      setPosts(data);
    } catch (err: any) {
      setError(err.message || 'Không thể tải danh sách bài viết');
      console.error('Error loading posts:', err);
    } finally {
      setLoading(false);
    }
  }, [subject, authorId, limit]);

  useEffect(() => {
    if (autoLoad) {
      loadPosts();
    }
  }, [autoLoad, loadPosts]);

  const createPost = useCallback(async (postData: PostCreate) => {
    try {
      setError(null);
      const newPost = await postsAPI.create(postData);
      // Thêm post mới vào đầu danh sách
      setPosts(prev => [newPost, ...prev]);
      return newPost;
    } catch (err: any) {
      setError(err.message || 'Không thể tạo bài viết');
      throw err;
    }
  }, []);

  const likePost = useCallback(async (postId: string) => {
    try {
      await postsAPI.like(postId);
      // Cập nhật số like trong danh sách
      setPosts(prev => prev.map(post => 
        post.id === postId 
          ? { ...post, likes: post.likes + 1 }
          : post
      ));
    } catch (err: any) {
      setError(err.message || 'Không thể like bài viết');
      throw err;
    }
  }, []);

  const reactToPost = useCallback(async (
    postId: string,
    reaction: "idea" | "thinking" | "resource" | "motivation"
  ) => {
    try {
      await postsAPI.react(postId, reaction);
      // Reload để cập nhật reaction counts
      await loadPosts();
    } catch (err: any) {
      setError(err.message || 'Không thể react bài viết');
      throw err;
    }
  }, [loadPosts]);

  return {
    posts,
    loading,
    error,
    loadPosts,
    createPost,
    likePost,
    reactToPost,
  };
};

