import { createFileRoute, Outlet, useNavigate, useLocation, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";

export const Route = createFileRoute("/admin")({
  component: AdminLayout,
});

function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const isLoginPage = location.pathname === "/admin/login";

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user && user.email === "admin@gmail.com") {
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
        if (!isLoginPage) {
          navigate({ to: "/admin/login", replace: true });
        }
      }
      setLoading(false);
    });
    return () => unsub();
  }, [navigate, isLoginPage]);

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gold border-t-transparent" />
      </div>
    );
  }

  // If not authenticated, but we are on the login page, let the login page render!
  if (!isAuthenticated && !isLoginPage) return null;

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-background">
      {/* Sidebar for authenticated routes */}
      {!isLoginPage && (
        <aside className="w-full lg:w-64 border-b lg:border-b-0 lg:border-r border-border/60 bg-card p-4 lg:p-6 flex flex-col shrink-0">
          <div className="mb-4 lg:mb-10 shrink-0">
            <h2 className="text-xl lg:text-2xl font-bold text-brown-deep">Paakashala</h2>
            <p className="text-[10px] lg:text-xs font-bold tracking-widest text-gold uppercase mt-1">Admin Portal</p>
          </div>
          
          <nav className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0 no-scrollbar items-center lg:items-stretch">
            <Link to="/admin/dashboard" className="shrink-0 flex items-center gap-2 lg:gap-3 rounded-xl px-4 py-2.5 lg:py-3 text-sm font-semibold transition-colors [&.active]:bg-brown-gradient [&.active]:text-cream hover:bg-gold/5 text-brown-deep/80">
              Dashboard
            </Link>
            <Link to="/admin/orders" className="shrink-0 flex items-center gap-2 lg:gap-3 rounded-xl px-4 py-2.5 lg:py-3 text-sm font-semibold transition-colors [&.active]:bg-brown-gradient [&.active]:text-cream hover:bg-gold/5 text-brown-deep/80">
              Live Orders
            </Link>
            <Link to="/admin/menu" className="shrink-0 flex items-center gap-2 lg:gap-3 rounded-xl px-4 py-2.5 lg:py-3 text-sm font-semibold transition-colors [&.active]:bg-brown-gradient [&.active]:text-cream hover:bg-gold/5 text-brown-deep/80">
              Menu Manager
            </Link>
            <Link to="/admin/tables" className="shrink-0 flex items-center gap-2 lg:gap-3 rounded-xl px-4 py-2.5 lg:py-3 text-sm font-semibold transition-colors [&.active]:bg-brown-gradient [&.active]:text-cream hover:bg-gold/5 text-brown-deep/80">
              Tables & QR
            </Link>
            <Link to="/admin/offers" className="shrink-0 flex items-center gap-2 lg:gap-3 rounded-xl px-4 py-2.5 lg:py-3 text-sm font-semibold transition-colors [&.active]:bg-brown-gradient [&.active]:text-cream hover:bg-gold/5 text-brown-deep/80">
              Offers & Promo
            </Link>
            <Link to="/admin/updates" className="shrink-0 flex items-center gap-2 lg:gap-3 rounded-xl px-4 py-2.5 lg:py-3 text-sm font-semibold transition-colors [&.active]:bg-brown-gradient [&.active]:text-cream hover:bg-gold/5 text-brown-deep/80">
              Latest Updates
            </Link>
            <Link to="/admin/settings" className="shrink-0 flex items-center gap-2 lg:gap-3 rounded-xl px-4 py-2.5 lg:py-3 text-sm font-semibold transition-colors [&.active]:bg-brown-gradient [&.active]:text-cream hover:bg-gold/5 text-brown-deep/80">
              Settings
            </Link>
          </nav>
        </aside>
      )}

      {/* Main Content */}
      <main className={`flex-1 ${isLoginPage ? "" : "p-4 md:p-8 h-[calc(100vh-140px)] lg:h-screen overflow-y-auto"}`}>
        <Outlet />
      </main>
    </div>
  );
}
