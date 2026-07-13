import { createFileRoute, Outlet, useNavigate, useLocation, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { 
  LayoutDashboard, ShoppingCart, ListOrdered, ChefHat, 
  Settings, FolderKanban, Users, Gift, Package, 
  BarChart3, ShieldCheck, Printer, LogOut, Menu, 
  ChevronLeft, ChevronRight, Bell, Search, AlertCircle, Wifi, WifiOff, Database
} from "lucide-react";
import syncManager from "@/services/sync/SyncManager";
import sessionManager from "@/services/session/SessionManager";

export const Route = createFileRoute("/admin")({
  component: AdminLayout,
});

function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  // Custom layout states
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(syncManager.getOnlineStatus());
  const [notifications, setNotifications] = useState([
    { id: 1, text: "Main printer ready.", type: "info" },
    { id: 2, text: "Shift opened successfully.", type: "success" }
  ]);

  const isLoginPage = location.pathname === "/admin/login";
  const cashierName = sessionManager.getActiveShift()?.cashierName || "Head Cashier";

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (user) => {
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

    return () => unsubAuth();
  }, [navigate, isLoginPage]);

  // Keep network status synced
  useEffect(() => {
    const handleStatus = () => {
      setIsOnline(navigator.onLine);
    };
    window.addEventListener("online", handleStatus);
    window.addEventListener("offline", handleStatus);
    return () => {
      window.removeEventListener("online", handleStatus);
      window.removeEventListener("offline", handleStatus);
    };
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gold border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated && !isLoginPage) return null;

  const menuItems = [
    { label: "Dashboard", to: "/admin/dashboard", icon: LayoutDashboard },
    { label: "POS Billing", to: "/admin/pos-billing", icon: ShoppingCart },
    { label: "Live Orders", to: "/admin/orders", icon: ListOrdered },
    { label: "Kitchen Display (KDS)", to: "/admin/kds", icon: ChefHat },
    { label: "Tables & QRs", to: "/admin/tables", icon: FolderKanban },
    { label: "Menu CRUD", to: "/admin/menu", icon: FolderKanban },
    { label: "Offers", to: "/admin/offers", icon: Gift },
    { label: "Printer Manager", to: "/admin/printers", icon: Printer },
    { label: "Restaurant ERP", to: "/admin/erp", icon: Package },
    { label: "Database Ops", to: "/admin/database", icon: Database },
    { label: "Settings", to: "/admin/settings", icon: Settings },
  ];

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-background">
      
      {/* Sidebar for authenticated routes */}
      {!isLoginPage && (
        <aside 
          className={`border-b lg:border-b-0 lg:border-r border-border/60 bg-card p-4 lg:p-6 flex flex-col shrink-0 transition-all duration-300 ${
            sidebarCollapsed ? "w-full lg:w-20" : "w-full lg:w-64"
          }`}
        >
          <div className="flex items-center justify-between mb-4 lg:mb-10 shrink-0">
            <div className={`flex flex-col transition-opacity duration-300 ${sidebarCollapsed ? "lg:opacity-0 lg:hidden" : ""}`}>
              <h2 className="text-xl font-bold text-brown-deep tracking-tight">Paakashala</h2>
              <span className="text-[10px] font-black tracking-[0.2em] text-gold uppercase mt-0.5">RESTAURANT OS</span>
            </div>
            
            <button 
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="hidden lg:grid h-8 w-8 place-items-center rounded-xl bg-background hover:bg-gold/5 border border-border/60 text-muted-foreground hover:text-gold"
            >
              {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>
          </div>
          
          <nav className="flex lg:flex-col gap-1.5 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0 no-scrollbar">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className="shrink-0 flex items-center gap-3 rounded-xl px-4 py-2.5 lg:py-3 text-xs font-bold transition-all [&.active]:bg-brown-gradient [&.active]:text-cream hover:bg-gold/5 text-brown-deep/80 hover:text-gold active:scale-98"
                  title={item.label}
                >
                  <Icon className="h-4.5 w-4.5 shrink-0" />
                  <span className={`transition-opacity duration-300 ${sidebarCollapsed ? "lg:opacity-0 lg:hidden" : ""}`}>
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto pt-6 hidden lg:flex flex-col gap-3">
            <div className={`p-3 bg-cream/35 border border-gold/10 rounded-2xl ${sidebarCollapsed ? "items-center" : ""}`}>
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-full bg-gold-gradient flex items-center justify-center text-[10px] font-black text-brown-deep shadow-sm">
                  {cashierName.substring(0, 2).toUpperCase()}
                </div>
                {!sidebarCollapsed && (
                  <div className="min-w-0">
                    <span className="block text-[10px] font-black text-brown-deep truncate">{cashierName}</span>
                    <span className="block text-[9px] text-muted-foreground uppercase tracking-wider font-semibold">Active Cashier</span>
                  </div>
                )}
              </div>
            </div>

            <button 
              onClick={() => signOut(auth)}
              className="w-full flex items-center gap-3 rounded-xl px-4 py-2.5 text-xs font-bold text-red-600 hover:bg-red-500/10 active:scale-98 transition-all"
            >
              <LogOut className="h-4.5 w-4.5 shrink-0" />
              <span className={sidebarCollapsed ? "lg:opacity-0 lg:hidden" : ""}>Logout Shift</span>
            </button>
          </div>
        </aside>
      )}

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Top Navbar */}
        {!isLoginPage && (
          <header className="h-16 border-b border-border/60 bg-card px-4 md:px-8 flex items-center justify-between shrink-0 select-none">
            {/* Left: Breadcrumb / Search */}
            <div className="flex items-center gap-3 flex-1 max-w-md">
              <span className="text-xs font-bold text-muted-foreground">Admin</span>
              <span className="text-muted-foreground/45 text-xs">/</span>
              <span className="text-xs font-black text-brown-deep uppercase tracking-wider">
                {location.pathname.split("/").pop()?.replace("-", " ")}
              </span>
            </div>

            {/* Right: Controls & Notifications */}
            <div className="flex items-center gap-4">
              
              {/* Network Status Badge */}
              <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-bold ${
                isOnline 
                  ? "bg-green-50 border-green-200/50 text-green-700" 
                  : "bg-red-50 border-red-200/50 text-red-700 animate-pulse"
              }`}>
                {isOnline ? (
                  <>
                    <Wifi className="h-3 w-3" />
                    <span>ONLINE</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="h-3 w-3" />
                    <span>OFFLINE CACHE</span>
                  </>
                )}
              </div>

              {/* Notification Center */}
              <div className="relative">
                <button 
                  onClick={() => setNotificationsOpen(!notificationsOpen)}
                  className="h-10 w-10 grid place-items-center rounded-xl bg-background hover:bg-gold/5 border border-border/60 text-muted-foreground hover:text-gold relative cursor-pointer"
                >
                  <Bell className="h-4.5 w-4.5" />
                  {notifications.length > 0 && (
                    <span className="absolute top-2.5 right-2.5 h-2 w-2 rounded-full bg-gold" />
                  )}
                </button>

                {/* Notifications Popup */}
                {notificationsOpen && (
                  <div className="absolute right-0 mt-2.5 w-64 bg-card border border-border/60 rounded-2xl shadow-luxe p-4 z-50">
                    <h4 className="text-xs font-black text-brown-deep mb-3 flex items-center gap-1.5">
                      <AlertCircle className="h-4 w-4 text-gold" /> System Notifications
                    </h4>
                    <ul className="space-y-2.5 max-h-48 overflow-y-auto">
                      {notifications.map((n) => (
                        <li key={n.id} className="text-[10px] bg-background border border-border/40 p-2 rounded-xl text-brown-deep">
                          {n.text}
                        </li>
                      ))}
                    </ul>
                    {notifications.length === 0 && (
                      <p className="text-[10px] text-muted-foreground text-center py-4">No new notifications</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </header>
        )}

        {/* Main Content Area */}
        <main className={`flex-1 overflow-y-auto p-4 md:p-8 bg-background`}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
export default AdminLayout;
