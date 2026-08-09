import { useEffect, useState } from "react";
import { ImageOff } from "lucide-react";
import { cn } from "../../lib/utils";

/**
 * Product imagery comes from many third-party hosts (ibb.co, dummyjson, bing
 * thumbnails), so broken URLs are expected. This wrapper adds:
 *  - a shimmer placeholder until the bitmap decodes
 *  - a graceful fallback tile when the host fails
 *  - native lazy loading + async decoding for long grids
 */
export function SmartImage({
  src,
  alt,
  className,
  wrapperClassName,
  eager = false,
  sizes,
}: {
  src?: string;
  alt: string;
  className?: string;
  wrapperClassName?: string;
  eager?: boolean;
  sizes?: string;
}) {
  const [state, setState] = useState<"loading" | "ready" | "error">(src ? "loading" : "error");

  // Reset when the gallery swaps to a different image.
  useEffect(() => setState(src ? "loading" : "error"), [src]);

  return (
    <span className={cn("relative block overflow-hidden bg-white", wrapperClassName)}>
      {state === "loading" && <span className="skeleton absolute inset-0" />}
      {state === "error" ? (
        <span className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-surface-sunken text-ink-4">
          <ImageOff className="h-6 w-6" strokeWidth={1.5} />
          <span className="px-2 text-center text-2xs">Image unavailable</span>
        </span>
      ) : (
        <img
          src={src}
          alt={alt}
          sizes={sizes}
          loading={eager ? "eager" : "lazy"}
          decoding="async"
          referrerPolicy="no-referrer"
          onLoad={() => setState("ready")}
          onError={() => setState("error")}
          className={cn(
            "h-full w-full object-cover transition-opacity duration-200",
            state === "ready" ? "opacity-100" : "opacity-0",
            className,
          )}
        />
      )}
    </span>
  );
}
