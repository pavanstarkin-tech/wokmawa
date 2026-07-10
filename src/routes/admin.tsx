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
    <div className="flex min-h-screen bg-background">
      {/* Sidebar for authenticated routes */}
      {!isLoginPage && (
        <aside className="w-64 border-r border-border/60 bg-card p-6 flex flex-col">
          <div className="mb-10">
            <h2 className="text-2xl font-bold text-brown-deep">Paakashala</h2>
            <p className="text-xs font-bold tracking-widest text-gold uppercase mt-1">Admin Portal</p>
          </div>
          
          <nav className="flex-1 space-y-2">
            <Link to="/admin/dashboard" className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-colors [&.active]:bg-brown-gradient [&.active]:text-cream hover:bg-gold/5 text-brown-deep/80">
              Dashboard
            </Link>
            <Link to="/admin/orders" className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-colors [&.active]:bg-brown-gradient [&.active]:text-cream hover:bg-gold/5 text-brown-deep/80">
              Live Orders
            </Link>
            <Link to="/admin/menu" className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-colors [&.active]:bg-brown-gradient [&.active]:text-cream hover:bg-gold/5 text-brown-deep/80">
              Menu Manager
            </Link>
            <Link to="/admin/tables" className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-colors [&.active]:bg-brown-gradient [&.active]:text-cream hover:bg-gold/5 text-brown-deep/80">
              Tables & QR
            </Link>
          </nav>
        </aside>
      )}

      {/* Main Content */}
      <main className={`flex-1 ${isLoginPage ? "" : "p-8 h-screen overflow-y-auto"}`}>
        <Outlet />
      </main>
    </div>
  );
}
