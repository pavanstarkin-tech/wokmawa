import { createFileRoute, Outlet, useNavigate, useLocation, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { ref, onValue, query, limitToLast } from "firebase/database";
import { 
  LayoutDashboard, ShoppingCart, ListOrdered, ChefHat, 
  Settings, FolderKanban, Users, Gift, Package, 
  BarChart3, ShieldCheck, Printer, LogOut, Menu, 
  ChevronLeft, ChevronRight, Bell, Search, AlertCircle, Wifi, WifiOff, Database, Laptop, Building2
} from "lucide-react";
import syncManager from "@/services/sync/SyncManager";
import sessionManager from "@/services/session/SessionManager";
import printerManager from "@/modules/printer/services/PrinterManager";

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
  const [newOrderPopup, setNewOrderPopup] = useState<any>(null);
  const [lastOrderTime, setLastOrderTime] = useState(Date.now());
  const [processedOrderIds] = useState(() => new Set<string>());

  const isLoginPage = location.pathname === "/admin/login";
  const cashierName = sessionManager.getActiveShift()?.cashierName || "Head Cashier";

  useEffect(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('admin_session') === 'true') {
      setIsAuthenticated(true);
      setLoading(false);
      return;
    }

    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (user || (typeof window !== 'undefined' && localStorage.getItem('admin_session') === 'true')) {
        setIsAuthenticated(true);
        if (typeof window !== 'undefined') localStorage.setItem('admin_session', 'true');
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

  // Listen to new orders for popup notifications & automatic ESC/POS printing
  useEffect(() => {
    if (!isAuthenticated) return;
    const ordersRef = ref(db, "restaurant/orders");
    const q = query(ordersRef, limitToLast(1));
    const unsub = onValue(q, (snapshot) => {
      snapshot.forEach((child) => {
        const order = child.val();
        if (order && order.createdAt) {
          const orderTime = new Date(order.createdAt).getTime();
          if (orderTime > lastOrderTime) {
            const orderId = child.key || order.id;

            if (orderId && !processedOrderIds.has(orderId)) {
              processedOrderIds.add(orderId);
              setNewOrderPopup({ id: orderId, ...order });
              setLastOrderTime(orderTime);

              // Auto-print incoming Customer QR orders (they don't carry cashierName)
              if (!order.cashierName) {
                console.log(`[AutoPrint] Generating automated print jobs for new customer order: ${orderId}`);
                
                // 1. Dispatch Kitchen Copy (KOT)
                printerManager.printKOT({
                  kotNumber: `KOT-${orderId}`,
                  tableId: order.tableId || "T1",
                  orderType: "dine-in",
                  items: order.items || [],
                  instructions: order.notes || ""
                });

                // 2. Dispatch Customer Receipt Copy (Counter Bill)
                printerManager.printReceipt({
                  billNumber: `PK-${orderId}`,
                  tableId: order.tableId || "T1",
                  customerName: order.customerName || "Dine-in Guest",
                  customerPhone: order.mobile || "",
                  items: (order.items || []).map((i: any) => ({
                    name: i.name,
                    quantity: i.quantity,
                    price: i.price || 0
                  })),
                  subtotal: order.subtotal || 0,
                  discount: order.discount || 0,
                  tax: order.tax || 0,
                  grandTotal: order.total || 0,
                  cashierName: "QR Auto-Print"
                });
              }
            }
          }
        }
      });
    });
    return () => unsub();
  }, [isAuthenticated, lastOrderTime, processedOrderIds]);

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
    { label: "Analysis Hub", to: "/admin/analysis", icon: BarChart3 },
    { label: "Devices", to: "/admin/printers", icon: Printer },
    { label: "Staff Control", to: "/admin/staff", icon: Users },
    { label: "Settings", to: "/admin/settings", icon: Settings },
  ];

  return (
    <div className="flex flex-col lg:flex-row h-screen overflow-hidden bg-[#080808] text-white">
      
      {/* Sidebar for authenticated routes */}
      {!isLoginPage && (
        <aside 
          className={`border-b lg:border-b-0 lg:border-r border-[#27272A] bg-[#101010] p-4 lg:p-5 flex flex-col shrink-0 lg:h-screen lg:overflow-y-auto no-scrollbar transition-all duration-300 ${
            sidebarCollapsed ? "w-full lg:w-20" : "w-full lg:w-64"
          }`}
        >
          <div className="flex items-center justify-between mb-4 lg:mb-8 shrink-0">
            <div className={`flex items-center gap-2.5 transition-opacity duration-300 ${sidebarCollapsed ? "lg:opacity-0 lg:hidden" : ""}`}>
              <img
                src="/assets/logo.png"
                alt="WOKMAWA"
                className="h-8 w-auto object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/wokmawa/assets/logo.png';
                }}
              />
              <div className="flex flex-col">
                <h2 className="text-base font-black font-display text-white tracking-wider">WOKMAWA</h2>
                <span className="text-[9px] font-bold tracking-[0.2em] text-[#D4AF37] uppercase -mt-0.5">RESTAURANT OS</span>
              </div>
            </div>
            
            <button 
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="hidden lg:grid h-8 w-8 place-items-center rounded-xl bg-[#1A1A1A] hover:bg-[#252525] border border-[#27272A] text-[#A1A1AA] hover:text-[#D4AF37] transition-all cursor-pointer"
            >
              {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>
          </div>
          
          <nav className="flex lg:flex-col gap-1.5 overflow-x-auto lg:overflow-y-auto no-scrollbar pb-2 lg:pb-0">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className="shrink-0 flex items-center gap-3 rounded-xl px-3.5 py-2.5 lg:py-2.8 text-xs font-bold transition-all text-[#A1A1AA] hover:text-white hover:bg-[#1A1A1A] [&.active]:bg-gradient-to-r [&.active]:from-[#F7D360] [&.active]:via-[#E5B83B] [&.active]:to-[#D4A328] [&.active]:text-black [&.active]:shadow-[0_0_15px_rgba(212,175,55,0.3)] active:scale-98"
                  title={item.label}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className={`transition-opacity duration-300 ${sidebarCollapsed ? "lg:opacity-0 lg:hidden" : ""}`}>
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto pt-6 hidden lg:flex flex-col gap-3 shrink-0">
            <div className={`p-3 bg-[#181818] border border-[#27272A] rounded-2xl ${sidebarCollapsed ? "items-center" : ""}`}>
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[#F7D360] to-[#D4A328] flex items-center justify-center text-[11px] font-black text-black shadow-sm">
                  {cashierName.substring(0, 2).toUpperCase()}
                </div>
                {!sidebarCollapsed && (
                  <div className="min-w-0">
                    <span className="block text-xs font-black text-white truncate">{cashierName}</span>
                    <span className="block text-[9px] text-[#D4AF37] uppercase tracking-wider font-semibold">Active Session</span>
                  </div>
                )}
              </div>
            </div>

            <button 
              onClick={async () => {
                if (typeof window !== 'undefined') {
                  localStorage.removeItem('admin_session');
                  localStorage.removeItem('admin_user');
                }
                try {
                  await signOut(auth);
                } catch (e) {}
                setIsAuthenticated(false);
                navigate({ to: "/admin/login" });
              }}
              className="w-full flex items-center gap-3 rounded-xl px-4 py-2.5 text-xs font-bold text-red-400 hover:bg-red-500/15 border border-red-500/20 active:scale-98 transition-all cursor-pointer"
            >
              <LogOut className="h-4.5 w-4.5 shrink-0" />
              <span className={sidebarCollapsed ? "lg:opacity-0 lg:hidden" : ""}>Logout Shift</span>
            </button>
          </div>
        </aside>
      )}

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden bg-[#080808]">
        
        {/* Top Navbar */}
        {!isLoginPage && (
          <header className="h-16 border-b border-[#27272A] bg-[#0E0E0E] px-4 md:px-8 flex items-center justify-between shrink-0 select-none">
            {/* Left: Breadcrumb / Search */}
            <div className="flex items-center gap-3 flex-1 max-w-md">
              <span className="text-xs font-bold text-[#71717A]">WOKMAWA OS</span>
              <span className="text-[#3F3F46] text-xs">/</span>
              <span className="text-xs font-black text-[#D4AF37] uppercase tracking-wider">
                {location.pathname.split("/").pop()?.replace("-", " ")}
              </span>
            </div>

            {/* Right: Controls & Notifications */}
            <div className="flex items-center gap-4">
              
              {/* Network Status Badge */}
              <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-bold ${
                isOnline 
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" 
                  : "bg-red-500/10 border-red-500/30 text-red-400 animate-pulse"
              }`}>
                {isOnline ? (
                  <>
                    <Wifi className="h-3 w-3" />
                    <span>ONLINE POS</span>
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
                  className="h-9 w-9 grid place-items-center rounded-xl bg-[#181818] hover:bg-[#222222] border border-[#27272A] text-[#A1A1AA] hover:text-[#D4AF37] relative cursor-pointer transition-all"
                >
                  <Bell className="h-4 w-4" />
                  {notifications.length > 0 && (
                    <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-[#D4AF37] shadow-[0_0_6px_#D4AF37]" />
                  )}
                </button>

                {/* Notifications Popup */}
                {notificationsOpen && (
                  <div className="absolute right-0 mt-2.5 w-64 bg-[#141414] border border-[#27272A] rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.8)] p-4 z-50">
                    <h4 className="text-xs font-black text-white mb-3 flex items-center gap-1.5">
                      <AlertCircle className="h-4 w-4 text-[#D4AF37]" /> System Alerts
                    </h4>
                    <ul className="space-y-2 max-h-48 overflow-y-auto">
                      {notifications.map((n) => (
                        <li key={n.id} className="text-[10px] bg-[#1E1E1E] border border-[#2A2A2A] p-2 rounded-xl text-[#E4E4E7]">
                          {n.text}
                        </li>
                      ))}
                    </ul>
                    {notifications.length === 0 && (
                      <p className="text-[10px] text-[#71717A] text-center py-4">No new notifications</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </header>
        )}

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-[#080808]">
          <Outlet />
        </main>
      </div>

      {newOrderPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-card rounded-3xl border border-border/60 shadow-2xl w-full max-w-md p-6 space-y-4 animate-in zoom-in-95 duration-200 text-brown-deep">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <span className="text-[9px] font-black uppercase text-gold tracking-widest bg-gold/10 px-2 py-0.5 rounded">New Incoming Order</span>
                <h3 className="text-base font-black text-brown-deep mt-1">Table {newOrderPopup.tableId || "Dine-in"}</h3>
              </div>
              <button 
                onClick={() => setNewOrderPopup(null)}
                className="px-2.5 py-1 bg-muted hover:bg-muted/80 rounded-lg border text-muted-foreground text-[10px] font-bold"
              >
                Dismiss
              </button>
            </div>

            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {newOrderPopup.items?.map((it: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between gap-3 border-b border-dashed border-border/30 pb-2 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-muted overflow-hidden border border-border shrink-0">
                      {it.image ? (
                        <img src={it.image} alt={it.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-[10px] font-black text-gold bg-gold/10">PK</div>
                      )}
                    </div>
                    <div>
                      <h4 className="font-bold text-brown-deep text-[11px] leading-tight">{it.name}</h4>
                      {it.notes && <span className="text-[9px] italic text-red-500 font-bold block mt-0.5">* {it.notes}</span>}
                    </div>
                  </div>
                  <span className="bg-gold/10 text-gold font-bold text-[11px] px-2 py-0.5 rounded shadow-sm shrink-0">
                    x{it.quantity}
                  </span>
                </div>
              ))}
            </div>

            <div className="border-t pt-3 flex justify-between items-center text-[10px] font-bold text-muted-foreground">
              <span>Total items: {newOrderPopup.items?.reduce((sum: number, i: any) => sum + (i.quantity || 1), 0)}</span>
              <span>Amount: ₹{newOrderPopup.grandTotal || newOrderPopup.total}</span>
            </div>
            
            <button
              onClick={() => setNewOrderPopup(null)}
              className="w-full py-2.5 bg-brown-deep text-gold rounded-xl font-bold uppercase tracking-wider text-[10px] shadow-md hover:opacity-95"
            >
              Confirm / Dismiss Notification
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
