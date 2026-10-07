import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useLocation,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "WOKMAWA — Master Wok & Fiery Spices" },
      { name: "description", content: "WOKMAWA — Authentic Asian street woks blasted on 400°C open flame with signature volcano spice levels." },
      { name: "author", content: "WOKMAWA" },
      { property: "og:title", content: "WOKMAWA — Master Wok & Fiery Spices" },
      { property: "og:description", content: "WOKMAWA — Authentic Asian street woks blasted on 400°C open flame with signature volcano spice levels." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "WOKMAWA — Master Wok & Fiery Spices" },
      { name: "twitter:description", content: "WOKMAWA — Authentic Asian street woks blasted on 400°C open flame with signature volcano spice levels." },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&family=Inter:wght@300;400;500;600;700&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body suppressHydrationWarning>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

import { recoveryManager } from "../core/recovery/RecoveryManager";
import { backgroundScheduler } from "../core/scheduler/BackgroundScheduler";
import { CommandPalette } from "../components/CommandPalette";
import { LiveOrderPopup } from "../components/LiveOrderPopup";
import { crashReporter } from "../modules/desktop/CrashReporter";

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const location = useLocation();

  // Auto-fullscreen on load and on first user interaction/gesture
  useEffect(() => {
    const triggerFullscreen = () => {
      try {
        const doc = document.documentElement as any;
        if (!document.fullscreenElement && !(document as any).webkitFullscreenElement && !(document as any).mozFullScreenElement && !(document as any).msFullscreenElement) {
          if (doc.requestFullscreen) {
            doc.requestFullscreen().catch(() => {});
          } else if (doc.webkitRequestFullscreen) {
            doc.webkitRequestFullscreen();
          } else if (doc.mozRequestFullScreen) {
            doc.mozRequestFullScreen();
          } else if (doc.msRequestFullscreen) {
            doc.msRequestFullscreen();
          }
        }
      } catch (e) {}
    };

    // Attempt immediately on mount
    triggerFullscreen();

    // Trigger on first user touch / click to comply with browser fullscreen user gesture policy
    const handleFirstInteraction = () => {
      triggerFullscreen();
      window.removeEventListener('click', handleFirstInteraction);
      window.removeEventListener('touchstart', handleFirstInteraction);
      window.removeEventListener('pointerdown', handleFirstInteraction);
    };

    window.addEventListener('click', handleFirstInteraction, { passive: true });
    window.addEventListener('touchstart', handleFirstInteraction, { passive: true });
    window.addEventListener('pointerdown', handleFirstInteraction, { passive: true });

    return () => {
      window.removeEventListener('click', handleFirstInteraction);
      window.removeEventListener('touchstart', handleFirstInteraction);
      window.removeEventListener('pointerdown', handleFirstInteraction);
    };
  }, []);

  // Smooth scroll to top whenever route / page changes
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
  }, [location.pathname]);

  useEffect(() => {
    // Initialise local crash listeners
    crashReporter.initialize();

    // Sequentially boot local SQLite, run migrations, restore queues, start sync engine
    const bootSystem = async () => {
      try {
        await recoveryManager.recoverAll();
        backgroundScheduler.start();
      } catch (err) {
        console.error("[BOOT] Critical POS systems startup failed:", err);
      }
    };
    
    bootSystem();

    return () => {
      backgroundScheduler.stop();
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      {/* Global Background Texture (2.5% Opacity) across all pages */}
      <div
        className="fixed inset-0 pointer-events-none z-[1] bg-repeat bg-center bg-cover opacity-[0.025] select-none"
        style={{ backgroundImage: `url('/assets/sitbg.png')` }}
        aria-hidden="true"
      />

      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <div className="relative z-0 min-h-screen">
        <Outlet />
      </div>
      
      {/* Global Desktop overlays */}
      <CommandPalette />
      <LiveOrderPopup />
    </QueryClientProvider>
  );
}
