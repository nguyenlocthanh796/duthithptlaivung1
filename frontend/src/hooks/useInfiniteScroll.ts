/**
 * Custom hook cho infinite scroll với Intersection Observer
 */
import { useEffect, useRef, useCallback } from 'react';

interface UseInfiniteScrollOptions {
  hasMore: boolean;
  loading: boolean;
  onLoadMore: () => void | Promise<void>;
  rootMargin?: string;
  threshold?: number;
}

export const useInfiniteScroll = ({
  hasMore,
  loading,
  onLoadMore,
  rootMargin = '200px',
  threshold = 0.1,
}: UseInfiniteScrollOptions) => {
  const observerRef = useRef<IntersectionObserver | null>(null);
  const elementRef = useRef<HTMLDivElement | null>(null);

  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [target] = entries;
      if (target.isIntersecting && hasMore && !loading) {
        void onLoadMore();
      }
    },
    [hasMore, loading, onLoadMore]
  );

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    observerRef.current = new IntersectionObserver(handleObserver, {
      rootMargin,
      threshold,
    });

    observerRef.current.observe(element);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [handleObserver, rootMargin, threshold]);

  return elementRef;
};

