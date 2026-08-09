import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "../../lib/utils";
import { SmartImage } from "../ui/SmartImage";

/**
 * Temu's PDP gallery: a vertical thumbnail column beside a large square image on
 * desktop (thumbnail hover swaps the main image, mouse-move zooms), and a
 * swipeable full-width pager with dots on mobile.
 */
export function ProductGallery({ images, alt }: { images: string[]; alt: string }) {
  const [index, setIndex] = useState(0);
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => setIndex(0), [images]);

  const count = images.length;
  const go = (next: number) => setIndex(((next % count) + count) % count);

  // Keep the mobile scroll pager and the dot indicator in sync.
  const onScroll = () => {
    const track = trackRef.current;
    if (!track) return;
    setIndex(Math.round(track.scrollLeft / track.clientWidth));
  };

  return (
    <div className="md:grid md:grid-cols-[76px_minmax(0,1fr)] md:gap-3">
      {/* Desktop thumbnails */}
      {count > 1 && (
        <div className="no-scrollbar hidden max-h-[520px] flex-col gap-2 overflow-y-auto md:flex">
          {images.map((image, i) => (
            <button
              key={`${image}-${i}`}
              type="button"
              onMouseEnter={() => setIndex(i)}
              onClick={() => setIndex(i)}
              aria-label={`Show image ${i + 1} of ${count}`}
              aria-current={i === index}
              className={cn(
                "shrink-0 overflow-hidden rounded-lg border-2 transition-colors",
                i === index ? "border-brand" : "border-transparent hover:border-line",
              )}
            >
              <SmartImage src={image} alt="" wrapperClassName="aspect-square w-full bg-surface-sunken" />
            </button>
          ))}
        </div>
      )}

      {/* Desktop main image with hover zoom */}
      <div className="relative hidden md:block">
        <div
          className="relative aspect-square w-full overflow-hidden rounded-card bg-surface-sunken"
          onMouseMove={(event) => {
            const rect = event.currentTarget.getBoundingClientRect();
            setZoom({
              x: ((event.clientX - rect.left) / rect.width) * 100,
              y: ((event.clientY - rect.top) / rect.height) * 100,
            });
          }}
          onMouseLeave={() => setZoom(null)}
        >
          <SmartImage
            src={images[index]}
            alt={alt}
            eager
            wrapperClassName="h-full w-full"
            className={cn("object-contain transition-transform duration-200", zoom && "scale-[1.8]")}
          />
          {zoom && (
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{ transformOrigin: `${zoom.x}% ${zoom.y}%` }}
            />
          )}
        </div>
        {!zoom && (
          <p className="mt-1.5 text-center text-xs text-ink-4">Hover the image to zoom</p>
        )}
      </div>

      {/* Mobile swipeable pager */}
      <div className="relative md:hidden">
        <div
          ref={trackRef}
          onScroll={onScroll}
          className="no-scrollbar flex w-full snap-x snap-mandatory overflow-x-auto"
        >
          {images.map((image, i) => (
            <div key={`${image}-${i}`} className="w-full shrink-0 snap-center">
              <SmartImage
                src={image}
                alt={i === 0 ? alt : ""}
                eager={i === 0}
                wrapperClassName="aspect-square w-full bg-surface-sunken"
                className="object-contain"
              />
            </div>
          ))}
        </div>

        {count > 1 && (
          <>
            <span className="absolute bottom-2 right-2 rounded-pill bg-black/55 px-2 py-0.5 text-xs font-medium text-white">
              {index + 1}/{count}
            </span>
            <button
              type="button"
              aria-label="Previous image"
              onClick={() => {
                const next = (index - 1 + count) % count;
                trackRef.current?.scrollTo({ left: next * (trackRef.current?.clientWidth ?? 0), behavior: "smooth" });
                go(next);
              }}
              className="absolute left-1 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full bg-white/75 text-ink"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              aria-label="Next image"
              onClick={() => {
                const next = (index + 1) % count;
                trackRef.current?.scrollTo({ left: next * (trackRef.current?.clientWidth ?? 0), behavior: "smooth" });
                go(next);
              }}
              className="absolute right-1 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full bg-white/75 text-ink"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
