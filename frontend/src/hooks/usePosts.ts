/**
 * Custom hook cho quản lý posts với pagination và search
 */
import { useState, useEffect, useCallback } from 'react';
import { postsAPI, Post } from '../services/api';
import { postsAPIEnhanced, PostsListParams } from '../services/api-enhanced';

interface UsePostsOptions {
  initialLimit?: number;
  autoLoad?: boolean;
  filters?: PostsListParams;
}

export const usePosts = (options: UsePostsOptions = {}) => {
  const { initialLimit = 20, autoLoad = true, filters = {} } = options;

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);

  const loadPosts = useCallback(async (reset = false) => {
    if (loading || loadingMore) return;

    try {
      if (reset) {
        setLoading(true);
        setOffset(0);
      } else {
        setLoadingMore(true);
      }

      setError(null);

      // Try enhanced API first, fallback to basic
      try {
        const response = await postsAPIEnhanced.getAll({
          ...filters,
          limit: initialLimit,
          offset: reset ? 0 : offset,
        });

        if (response.success && response.data) {
          const newPosts = response.data;
          if (reset) {
            setPosts(newPosts);
          } else {
            setPosts((prev) => [...prev, ...newPosts]);
          }

          setHasMore(response.pagination.has_more);
          setTotal(response.pagination.total);
          setOffset((prev) => prev + newPosts.length);
        }
      } catch (enhancedError) {
        // Fallback to basic API
        const data = await postsAPI.getAll({
          ...filters,
          limit: initialLimit,
          offset: reset ? 0 : offset,
        });

        if (reset) {
          setPosts(data);
        } else {
          setPosts((prev) => [...prev, ...data]);
        }

        setHasMore(data.length === initialLimit);
        setOffset((prev) => prev + data.length);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load posts');
      setHasMore(false);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [filters, initialLimit, offset, loading, loadingMore]);

  const loadMore = useCallback(() => {
    if (!hasMore || loading || loadingMore) return;
    void loadPosts(false);
  }, [hasMore, loading, loadingMore, loadPosts]);

  const refresh = useCallback(() => {
    void loadPosts(true);
  }, [loadPosts]);

  useEffect(() => {
    if (autoLoad) {
      void loadPosts(true);
    }
  }, [autoLoad]); // Only run on mount

  return {
    posts,
    loading,
    loadingMore,
    error,
    hasMore,
    total,
    loadMore,
    refresh,
    reload: refresh,
  };
};
