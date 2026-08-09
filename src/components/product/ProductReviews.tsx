import { BadgeCheck, MessageSquare } from "lucide-react";
import { useMemo, useState } from "react";
import { formatRating, formatRelative } from "../../lib/format";
import type { Product } from "../../types/product";
import { Button } from "../ui/Button";
import { Rating } from "../ui/Rating";
import { SectionHeader } from "../ui/SectionHeader";

const INITIAL_VISIBLE = 4;

/**
 * Review block driven by `productReviewsList` (falling back to the single
 * `reviews` map). The star breakdown is computed from the reviews that exist -
 * nothing is invented when a product has none.
 */
export function ProductReviews({ product }: { product: Product }) {
  const [visible, setVisible] = useState(INITIAL_VISIBLE);
  const [starFilter, setStarFilter] = useState<number | null>(null);

  const breakdown = useMemo(() => {
    const buckets = [5, 4, 3, 2, 1].map((star) => ({
      star,
      count: product.reviews.filter((r) => Math.round(r.rating) === star).length,
    }));
    return buckets;
  }, [product.reviews]);

  const filtered = useMemo(
    () => (starFilter === null ? product.reviews : product.reviews.filter((r) => Math.round(r.rating) === starFilter)),
    [product.reviews, starFilter],
  );

  if (!product.reviews.length) {
    return (
      <section className="rounded-card bg-white px-3 py-3.5 md:px-4">
        <SectionHeader title="Customer reviews" />
        <div className="flex items-center gap-3 py-4">
          <MessageSquare className="h-6 w-6 text-ink-4" strokeWidth={1.5} />
          <div>
            <p className="text-md font-medium text-ink">No reviews yet</p>
            <p className="text-sm text-ink-3">Be the first to review this item after your purchase.</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-card bg-white px-3 py-3.5 md:px-4">
      <SectionHeader
        title="Customer reviews"
        subtitle={`${product.reviews.length} review${product.reviews.length === 1 ? "" : "s"} from verified shoppers`}
      />

      <div className="grid gap-5 md:grid-cols-[240px_minmax(0,1fr)]">
        {/* Score summary + star breakdown */}
        <div>
          <div className="flex items-end gap-2">
            <span className="text-4xl font-extrabold leading-none text-ink">{formatRating(product.rating)}</span>
            <span className="pb-1 text-md text-ink-3">/ 5</span>
          </div>
          <Rating value={product.rating} size="md" className="mt-1.5" />

          <ul className="mt-3 space-y-1">
            {breakdown.map(({ star, count }) => {
              const pct = product.reviews.length ? (count / product.reviews.length) * 100 : 0;
              const active = starFilter === star;
              return (
                <li key={star}>
                  <button
                    type="button"
                    disabled={count === 0}
                    onClick={() => setStarFilter(active ? null : star)}
                    className="flex w-full items-center gap-2 text-left disabled:cursor-default"
                  >
                    <span className={`w-8 shrink-0 text-sm ${active ? "font-bold text-brand" : "text-ink-2"}`}>
                      {star}★
                    </span>
                    <span className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-pill bg-line-2">
                      <span className="block h-full rounded-pill bg-[#FFA700]" style={{ width: `${pct}%` }} />
                    </span>
                    <span className="w-6 shrink-0 text-right text-sm text-ink-4">{count}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Review list */}
        <div>
          {starFilter !== null && (
            <button
              type="button"
              onClick={() => setStarFilter(null)}
              className="mb-2 text-sm font-medium text-brand hover:underline"
            >
              Clear {starFilter}★ filter
            </button>
          )}

          <ul className="divide-y divide-line-2">
            {filtered.slice(0, visible).map((review) => (
              <li key={review.id} className="py-3 first:pt-0">
                <div className="flex items-center gap-2">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-surface-sunken text-sm font-bold text-ink-2">
                    {review.customerName.charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 text-md font-medium text-ink">
                      <span className="truncate">{review.customerName}</span>
                      {review.verifiedPurchase && (
                        <span className="inline-flex shrink-0 items-center gap-0.5 text-xs font-medium text-trust">
                          <BadgeCheck className="h-3.5 w-3.5" /> Verified
                        </span>
                      )}
                    </p>
                    <p className="flex items-center gap-2">
                      <Rating value={review.rating} size="xs" />
                      <span className="text-xs text-ink-4">{formatRelative(review.createdAt)}</span>
                    </p>
                  </div>
                </div>
                {review.title && <p className="mt-2 text-md font-semibold text-ink">{review.title}</p>}
                {review.comment && <p className="mt-1 text-md leading-relaxed text-ink-2">{review.comment}</p>}
              </li>
            ))}
          </ul>

          {filtered.length > visible && (
            <Button variant="outline" size="sm" className="mt-3" onClick={() => setVisible((v) => v + 4)}>
              Show more reviews
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}
