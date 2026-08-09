import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Footer } from "./Footer";
import { Header } from "./Header";
import { MobileNavigation } from "./MobileNavigation";

/** Jump to the top on navigation, except when the browser restores a position. */
function useScrollToTop() {
  const { pathname, search } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [pathname, search]);
}

/**
 * The default storefront shell: header + category nav, page content, footer and
 * (on small screens) the fixed bottom tab bar. `pb-14` reserves room for it.
 */
export function Layout() {
  useScrollToTop();
  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-[100] focus:rounded focus:bg-white focus:px-3 focus:py-2 focus:text-md focus:font-semibold focus:shadow-pop"
      >
        Skip to main content
      </a>
      <Header />
      <main id="main" className="flex-1 pb-14 md:pb-0">
        <Outlet />
      </main>
      <Footer />
      <MobileNavigation />
    </div>
  );
}

/** Distraction-free shell used by checkout, payment and auth pages. */
export function FocusLayout({ children }: { children: React.ReactNode }) {
  useScrollToTop();
  return (
    <div className="flex min-h-dvh flex-col bg-surface-muted">
      <main id="main" className="flex-1">
        {children}
      </main>
    </div>
  );
}
