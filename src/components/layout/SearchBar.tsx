import { Camera, Clock, Search, TrendingUp, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useCatalogue } from "../../hooks/useCatalogue";
import { useLocalStorage } from "../../hooks/useLocalStorage";
import { cn, uniqueBy } from "../../lib/utils";

const MAX_RECENT = 8;

/** Builds a suggestion list from product names, brands and tags. */
function useSuggestions(term: string) {
  const { data: catalogue = [] } = useCatalogue();

  return useMemo(() => {
    const query = term.trim().toLowerCase();
    if (query.length < 1) return [];
    const pool = uniqueBy(
      catalogue.flatMap((p) => [p.name, p.brand ?? "", ...p.tags]).filter((s) => s.length > 2),
      (s) => s.toLowerCase(),
    );
    return pool
      .filter((s) => s.toLowerCase().includes(query))
      .sort((a, b) => Number(b.toLowerCase().startsWith(query)) - Number(a.toLowerCase().startsWith(query)) || a.length - b.length)
      .slice(0, 8);
  }, [catalogue, term]);
}

/** Trending chips shown in the empty dropdown - derived from real tags. */
function useTrending() {
  const { data: catalogue = [] } = useCatalogue();
  return useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of catalogue) {
      for (const tag of p.tags) {
        if (tag.length > 2 && tag.toLowerCase() !== "all") counts.set(tag, (counts.get(tag) ?? 0) + 1);
      }
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([tag]) => tag);
  }, [catalogue]);
}

export function SearchBar({
  className,
  size = "md",
  autoFocus = false,
}: {
  className?: string;
  size?: "sm" | "md";
  autoFocus?: boolean;
}) {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [term, setTerm] = useState(params.get("q") ?? "");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [recent, setRecent] = useLocalStorage<string[]>("temu-clone:recent-searches", []);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const suggestions = useSuggestions(term);
  const trending = useTrending();
  const options = term.trim() ? suggestions : recent;

  // Keep the field in sync when the URL query changes (back/forward nav).
  useEffect(() => setTerm(params.get("q") ?? ""), [params]);

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, []);

  const submit = (value: string) => {
    const query = value.trim();
    if (!query) return;
    setRecent((current) => [query, ...current.filter((r) => r.toLowerCase() !== query.toLowerCase())].slice(0, MAX_RECENT));
    setOpen(false);
    setActiveIndex(-1);
    inputRef.current?.blur();
    navigate(`/search?q=${encodeURIComponent(query)}`);
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!options.length) return;
      setOpen(true);
      setActiveIndex((i) => {
        const next = event.key === "ArrowDown" ? i + 1 : i - 1;
        return (next + options.length) % options.length;
      });
    } else if (event.key === "Enter") {
      event.preventDefault();
      submit(activeIndex >= 0 && options[activeIndex] ? options[activeIndex] : term);
    } else if (event.key === "Escape") {
      setOpen(false);
      setActiveIndex(-1);
    }
  };

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      <form
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          submit(term);
        }}
        className={cn(
          "flex w-full items-center rounded-pill border-2 border-brand bg-white pl-4 pr-1 transition-shadow",
          size === "md" ? "h-11" : "h-9",
        )}
      >
        <label htmlFor="site-search" className="sr-only">
          Search products on Temu
        </label>
        <input
          ref={inputRef}
          id="site-search"
          type="search"
          value={term}
          autoFocus={autoFocus}
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
          aria-controls="search-suggestions"
          aria-autocomplete="list"
          placeholder="Search on Temu"
          onChange={(event) => {
            setTerm(event.target.value);
            setOpen(true);
            setActiveIndex(-1);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          className="min-w-0 flex-1 bg-transparent text-md text-ink outline-none placeholder:text-ink-4 [&::-webkit-search-cancel-button]:hidden"
        />
        {term && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => {
              setTerm("");
              inputRef.current?.focus();
            }}
            className="mr-1 rounded-full p-1 text-ink-4 hover:text-ink-2"
          >
            <X className="h-4 w-4" />
          </button>
        )}
        <span aria-hidden className="mr-2 hidden h-5 w-px bg-line md:block" />
        <button
          type="button"
          aria-label="Search by image"
          className="mr-1 hidden rounded-full p-1.5 text-ink-2 hover:bg-surface-muted md:block"
        >
          <Camera className="h-[18px] w-[18px]" />
        </button>
        <button
          type="submit"
          aria-label="Search"
          className={cn(
            "grid shrink-0 place-items-center rounded-pill bg-brand text-white transition-colors hover:bg-brand-600",
            size === "md" ? "h-8 w-14" : "h-7 w-12",
          )}
        >
          <Search className="h-4 w-4" strokeWidth={2.6} />
        </button>
      </form>

      {open && (
        <div
          id="search-suggestions"
          role="listbox"
          className="absolute inset-x-0 top-[calc(100%+6px)] z-50 animate-slide-down overflow-hidden rounded-xl border border-line bg-white py-1.5 shadow-pop"
        >
          {options.length > 0 && (
            <>
              {!term.trim() && (
                <div className="flex items-center justify-between px-3 py-1.5">
                  <span className="text-sm font-semibold text-ink-3">Recent searches</span>
                  <button
                    type="button"
                    onClick={() => setRecent([])}
                    className="text-sm text-ink-3 hover:text-brand"
                  >
                    Clear
                  </button>
                </div>
              )}
              <ul>
                {options.map((option, index) => (
                  <li key={option}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={index === activeIndex}
                      onMouseEnter={() => setActiveIndex(index)}
                      onClick={() => submit(option)}
                      className={cn(
                        "flex w-full items-center gap-2.5 px-3 py-2 text-left text-md text-ink",
                        index === activeIndex && "bg-surface-muted",
                      )}
                    >
                      {term.trim() ? (
                        <Search className="h-4 w-4 shrink-0 text-ink-4" />
                      ) : (
                        <Clock className="h-4 w-4 shrink-0 text-ink-4" />
                      )}
                      <span className="truncate">{option}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}

          {!term.trim() && trending.length > 0 && (
            <div className="border-t border-line-2 px-3 pb-2 pt-2.5">
              <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-ink-3">
                <TrendingUp className="h-3.5 w-3.5" /> Trending now
              </p>
              <div className="flex flex-wrap gap-1.5">
                {trending.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => submit(tag)}
                    className="rounded-pill bg-surface-muted px-2.5 py-1 text-sm text-ink-2 hover:bg-brand-50 hover:text-brand"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          )}

          {term.trim() && !options.length && (
            <p className="px-3 py-3 text-md text-ink-3">
              Press Enter to search for &ldquo;{term.trim()}&rdquo;
            </p>
          )}
        </div>
      )}
    </div>
  );
}
