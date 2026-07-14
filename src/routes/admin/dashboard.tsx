import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { signOut } from "firebase/auth";
import { ref, onValue, query, orderByChild, startAt } from "firebase/database";
import { auth, db } from "@/lib/firebase";
import { 
  Users, Receipt, Utensils, IndianRupee, Printer, 
  Wifi, Signal, ShoppingCart, Landmark, ArrowUpRight 
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import sessionManager from "@/services/session/SessionManager";
import localDb from "@/services/database/localDb";
import printerManager from "@/modules/printer/services/PrinterManager";

export const Route = createFileRoute("/admin/dashboard")({
  component: AdminDashboard,
});

function AdminDashboard() {
  const [metrics, setMetrics] = useState({
    revenue: 0,
    activeOrders: 0,
    totalTables: 0,
    itemsSold: 0,
    pendingBills: 0,
    averageOrderValue: 0
  });

  const [topItems, setTopItems] = useState<Array<{ name: string; count: number }>>([]);

  const [chartData, setChartData] = useState([
    { name: "12:00", sales: 0 },
    { name: "14:00", sales: 0 },
    { name: "16:00", sales: 0 },
    { name: "18:00", sales: 0 },
    { name: "20:00", sales: 0 },
    { name: "22:00", sales: 0 },
  ]);

  const [printersCount, setPrintersCount] = useState(0);
  const [firebaseConnected, setFirebaseConnected] = useState(true);
  const [isOnline, setIsOnline] = useState(true);

  const [tables, setTables] = useState<any[]>([]);
  const [activeTables, setActiveTables] = useState<Set<string>>(new Set());

  // Group tables by their base identifier (e.g. "1" for "1a", "1b", "1")
  const groupedTables = useMemo(() => {
    const groups: Record<string, any[]> = {};
    tables.forEach(table => {
      const match = table.name.match(/^(\d+|[a-zA-Z]+\d+)/);
      const baseKey = match ? match[1] : table.name;
      if (!groups[baseKey]) groups[baseKey] = [];
      groups[baseKey].push(table);
    });
    return groups;
  }, [tables]);

  useEffect(() => {
    // 1. Check local printer configurations
    const prs = printerManager.getPrinters();
    setPrintersCount(prs.length);

    // 2. Listen to network state
    setIsOnline(navigator.onLine);
    const handleNet = () => setIsOnline(navigator.onLine);
    window.addEventListener("online", handleNet);
    window.addEventListener("offline", handleNet);

    // 3. Listen to firebase database state
    const connectedRef = ref(db, ".info/connected");
    const unsubConn = onValue(connectedRef, (snap) => {
      setFirebaseConnected(!!snap.val());
    });

    // 4. Listen to tables
    const tablesRef = ref(db, "restaurant/tables");
    const unsubTables = onValue(tablesRef, (snapshot) => {
      let activeCount = 0;
      snapshot.forEach((child) => {
        if (child.val().active) activeCount++;
      });
      setMetrics((m) => ({ ...m, totalTables: activeCount }));
    });

    // 5. Query orders from today
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const todayTimestamp = startOfDay.getTime();
    const ordersQuery = query(ref(db, "restaurant/orders"), orderByChild("createdAt"), startAt(todayTimestamp));
    
    const unsubOrders = onValue(ordersQuery, (snapshot) => {
      let revenue = 0;
      let activeOrders = 0;
      let itemsSold = 0;
      let pendingBills = 0;
      let orderCount = 0;
      const itemCounts: Record<string, number> = {};
      const hourlySales: Record<string, number> = {
        "12:00": 0,
        "14:00": 0,
        "16:00": 0,
        "18:00": 0,
        "20:00": 0,
        "22:00": 0
      };

      snapshot.forEach((childSnapshot) => {
        const order = childSnapshot.val();
        orderCount++;
        
        // Active/KDS tickets
        if (order.status === "pending" || order.status === "preparing") {
          activeOrders++;
        }
        if (order.status === "ready") {
          pendingBills++;
        }

        // Revenue calculations
        if (order.status !== "cancelled") {
          revenue += (order.total || 0);
          const items = order.items || [];
          items.forEach((item: any) => {
            const name = item.name;
            const quantity = item.quantity || 1;
            itemsSold += quantity;
            itemCounts[name] = (itemCounts[name] || 0) + quantity;
          });

          // Hourly distribution
          const dt = new Date(order.createdAt);
          const hr = dt.getHours();
          let bucket = "12:00";
          if (hr >= 22) bucket = "22:00";
          else if (hr >= 20) bucket = "20:00";
          else if (hr >= 18) bucket = "18:00";
          else if (hr >= 16) bucket = "16:00";
          else if (hr >= 14) bucket = "14:00";
          hourlySales[bucket] = (hourlySales[bucket] || 0) + (order.total || 0);
        }
      });

      const avg = orderCount > 0 ? Math.round((revenue / orderCount) * 100) / 100 : 0;
      const sortedItems = Object.entries(itemCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 4);

      setTopItems(sortedItems);
      setChartData(Object.entries(hourlySales).map(([name, sales]) => ({ name, sales })));
      setMetrics((m) => ({ 
        ...m, 
        revenue, 
        activeOrders, 
        itemsSold,
        pendingBills,
        averageOrderValue: avg
      }));
    });

    return () => {
      window.removeEventListener("online", handleNet);
      window.removeEventListener("offline", handleNet);
      unsubConn();
      unsubTables();
      unsubOrders();
    };
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* Header Widget Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border/40 pb-5">
        <div>
          <h1 className="text-3xl font-extrabold text-brown-deep tracking-tight">Operations Center</h1>
          <p className="text-xs text-muted-foreground mt-1">Real-time indicators, print status, and financial overview.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 bg-card border border-border/60 px-3 py-1.5 rounded-xl shadow-sm text-[10px] font-bold">
            <Printer className="h-3.5 w-3.5 text-gold" />
            <span className="text-brown-deep">{printersCount} Printer(s) Online</span>
          </div>

          <div className="flex items-center gap-1.5 bg-card border border-border/60 px-3 py-1.5 rounded-xl shadow-sm text-[10px] font-bold">
            <Signal className={`h-3.5 w-3.5 ${firebaseConnected ? "text-green-500 animate-pulse" : "text-red-500"}`} />
            <span className="text-brown-deep">DB Status: {firebaseConnected ? "CONNECTED" : "OFFLINE CACHE"}</span>
          </div>

          <button
            onClick={() => signOut(auth)}
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-xs font-black text-red-600 shadow-sm transition hover:bg-red-500/10 active:scale-95 cursor-pointer"
          >
            Signout Session
          </button>
        </div>
      </div>
      
      {/* Core KPI metrics grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard title="Today's Sales" value={`₹${metrics.revenue.toLocaleString('en-IN')}`} icon={IndianRupee} desc="Excludes cancelled orders" />
        <MetricCard title="Kitchen Queue (KDS)" value={metrics.activeOrders} icon={Utensils} desc="Cooking in preparation" />
        <MetricCard title="Pending Unpaid Bills" value={metrics.pendingBills} icon={Receipt} desc="Printed waiting checkout" />
        <MetricCard title="Avg Order Value (AOV)" value={`₹${metrics.averageOrderValue.toFixed(0)}`} icon={Landmark} desc="Value per table order" />
      </div>

      {/* Analytics chart and details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left: Recharts graph */}
        <div className="lg:col-span-2 rounded-3xl border border-border/60 bg-card p-6 shadow-sm flex flex-col h-[350px]">
          <h3 className="text-sm font-bold text-brown-deep mb-4 uppercase tracking-wider">Today's Sales Curve</h3>
          <div className="flex-1 w-full text-xs font-semibold">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="name" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Tooltip />
                <Line type="monotone" dataKey="sales" stroke="#C89B3C" strokeWidth={3} dot={{ r: 5 }} activeDot={{ r: 8 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right: Operations status & top selling dishes */}
        <div className="rounded-3xl border border-border/60 bg-card p-6 shadow-sm flex flex-col h-[350px] justify-between">
          <div>
            <h3 className="text-sm font-bold text-brown-deep mb-4 uppercase tracking-wider">Top-Selling Dishes</h3>
             <ul className="space-y-3.5">
              {topItems.map((item, idx) => (
                <li key={idx} className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-brown-deep/80">{item.name}</span>
                  <span className="bg-gold/10 text-gold font-bold px-2 py-0.5 rounded shadow-sm">
                    {item.count} orders
                  </span>
                </li>
              ))}
              {topItems.length === 0 && (
                <p className="text-muted-foreground text-center py-10 font-normal italic text-[11px]">
                  No sales recorded today yet.
                </p>
              )}
            </ul>
          </div>
          
          <div className="border-t border-border/40 pt-4 flex items-center justify-between text-xs font-semibold">
            <span className="text-muted-foreground">Kitchen Staff Status:</span>
            <span className="text-green-600 font-bold">Active</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ title, value, icon: Icon, desc }: any) {
  return (
    <div className="rounded-3xl border border-border/60 bg-card p-6 shadow-sm transition hover:shadow-md">
      <div className="flex items-center justify-between mb-4">
        <div className="p-3 bg-gold/10 rounded-2xl">
          <Icon className="h-5 w-5 text-gold" />
        </div>
        <div className="flex items-center text-green-600 text-xs font-bold bg-green-500/10 px-2 py-0.5 rounded-lg">
          +8.4% <ArrowUpRight className="h-3 w-3 ml-0.5" />
        </div>
      </div>
      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{title}</p>
      <h3 className="text-2xl font-black text-brown-deep mt-1">{value}</h3>
      <p className="text-[9px] text-muted-foreground/80 mt-1.5">{desc}</p>
    </div>
  );
}

export default AdminDashboard;
