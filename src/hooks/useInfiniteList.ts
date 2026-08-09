import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Progressive reveal for long product feeds. Instead of paginating Firestore we
 * grow the slice of an already-cached array as a sentinel element scrolls into
 * view - the same "endless feed" behaviour as Temu's recommendation grid.
 */
export function useInfiniteList<T>(items: T[], pageSize = 24) {
  const [visibleCount, setVisibleCount] = useState(pageSize);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Reset when the underlying list changes (new search, new filters).
  useEffect(() => setVisibleCount(pageSize), [items, pageSize]);

  const hasMore = visibleCount < items.length;

  const loadMore = useCallback(
    () => setVisibleCount((current) => Math.min(current + pageSize, items.length)),
    [pageSize, items.length],
  );

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { rootMargin: "600px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, loadMore]);

  return { visible: items.slice(0, visibleCount), hasMore, loadMore, sentinelRef };
}
