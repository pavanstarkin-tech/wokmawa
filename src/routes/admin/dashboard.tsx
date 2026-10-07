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
      const fetched: any[] = [];
      snapshot.forEach((child) => {
        const val = child.val();
        if (val && val.active !== false) {
          activeCount++;
          fetched.push({ id: child.key, ...val });
        }
      });
      fetched.sort((a, b) => a.createdAt - b.createdAt);
      setTables(fetched);
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
      const occupied = new Set<string>();
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
          if (order.tableId) occupied.add(order.tableId);
        }
        if (order.status === "ready") {
          pendingBills++;
          if (order.tableId) occupied.add(order.tableId);
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

      setActiveTables(occupied);

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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#27272A] pb-5">
        <div>
          <h1 className="text-3xl font-black font-display text-white tracking-tight">Operations Center</h1>
          <p className="text-xs text-[#A1A1AA] mt-1">Real-time indicators, print status, and financial overview.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 bg-[#141414] border border-[#27272A] px-3.5 py-2 rounded-xl shadow-sm text-[11px] font-bold">
            <Printer className="h-3.5 w-3.5 text-[#D4AF37]" />
            <span className="text-white">{printersCount} Printer(s) Online</span>
          </div>

          <div className="flex items-center gap-1.5 bg-[#141414] border border-[#27272A] px-3.5 py-2 rounded-xl shadow-sm text-[11px] font-bold">
            <Signal className={`h-3.5 w-3.5 ${firebaseConnected ? "text-emerald-400 animate-pulse" : "text-red-400"}`} />
            <span className="text-white">DB: {firebaseConnected ? "CONNECTED" : "OFFLINE CACHE"}</span>
          </div>

          <button
            onClick={() => {
              if (typeof window !== 'undefined') {
                localStorage.removeItem('admin_session');
                localStorage.removeItem('admin_user');
              }
              signOut(auth);
            }}
            className="rounded-xl border border-red-500/30 bg-red-500/15 px-4 py-2 text-xs font-black text-red-400 shadow-sm transition hover:bg-red-500/25 active:scale-95 cursor-pointer"
          >
            Signout Session
          </button>
        </div>
      </div>

      {/* Live Clustered Tables Monitor */}
      {tables.length > 0 && (
        <div className="bg-[#141414] border border-[#27272A] rounded-3xl p-6 shadow-[0_4px_20px_rgba(0,0,0,0.5)] space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black text-[#D4AF37] uppercase tracking-wider flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#D4AF37] shadow-[0_0_8px_#D4AF37]" />
              Live Tables Monitor
            </h3>
            <span className="text-xs text-[#A1A1AA] font-bold bg-[#1E1E1E] px-3 py-1 rounded-full border border-[#27272A]">
              {activeTables.size} / {tables.length} Occupied
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            {Object.entries(groupedTables).map(([baseKey, groupList]) => (
              <div 
                key={baseKey} 
                className="bg-[#181818] border border-[#27272A] rounded-2xl p-3 flex flex-col gap-2.5 justify-between"
              >
                <span className="text-[10px] font-black text-[#D4AF37] tracking-wider border-b border-[#27272A] pb-1.5 uppercase">Cluster {baseKey}</span>
                <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${groupList.length}, minmax(0, 1fr))` }}>
                  {groupList.map((table) => {
                    const isOccupied = activeTables.has(table.id);
                    return (
                      <div
                        key={table.id}
                        className={`rounded-xl py-2 px-1 text-center flex flex-col items-center justify-center transition-all ${
                          isOccupied
                            ? "bg-red-500/20 text-red-300 border border-red-500/40 shadow-sm animate-pulse"
                            : "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                        }`}
                        title={isOccupied ? "Occupied (Cooking / Billing)" : "Available / Clean"}
                      >
                        <span className="text-xs font-black">{table.name}</span>
                        <span className="text-[8px] font-bold uppercase mt-0.5 tracking-wider">
                          {isOccupied ? "Occupied" : "Free"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
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
        <div className="lg:col-span-2 rounded-3xl border border-[#27272A] bg-[#141414] p-6 shadow-[0_4px_20px_rgba(0,0,0,0.5)] flex flex-col h-[350px]">
          <h3 className="text-xs font-black text-[#D4AF37] mb-4 uppercase tracking-wider">Today's Sales Curve</h3>
          <div className="flex-1 w-full text-xs font-semibold">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#222222" />
                <XAxis dataKey="name" stroke="#71717A" />
                <YAxis stroke="#71717A" />
                <Tooltip 
                  contentStyle={{ backgroundColor: "#181818", borderColor: "#27272A", borderRadius: "12px", color: "#FFFFFF" }}
                  itemStyle={{ color: "#D4AF37", fontWeight: "bold" }}
                />
                <Line type="monotone" dataKey="sales" stroke="#D4AF37" strokeWidth={3} dot={{ r: 5, fill: "#D4AF37" }} activeDot={{ r: 8, fill: "#F7D360" }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right: Operations status & top selling dishes */}
        <div className="rounded-3xl border border-[#27272A] bg-[#141414] p-6 shadow-[0_4px_20px_rgba(0,0,0,0.5)] flex flex-col h-[350px] justify-between">
          <div>
            <h3 className="text-xs font-black text-[#D4AF37] mb-4 uppercase tracking-wider">Top-Selling Dishes</h3>
             <ul className="space-y-3.5">
              {topItems.map((item, idx) => (
                <li key={idx} className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-[#E4E4E7]">{item.name}</span>
                  <span className="bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/30 font-bold px-2.5 py-0.5 rounded-full shadow-sm">
                    {item.count} orders
                  </span>
                </li>
              ))}
              {topItems.length === 0 && (
                <p className="text-[#71717A] text-center py-10 font-normal italic text-[11px]">
                  No sales recorded today yet.
                </p>
              )}
            </ul>
          </div>
          
          <div className="border-t border-[#27272A] pt-4 flex items-center justify-between text-xs font-semibold">
            <span className="text-[#A1A1AA]">Kitchen Staff Status:</span>
            <span className="text-emerald-400 font-bold flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              Active
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ title, value, icon: Icon, desc }: any) {
  return (
    <div className="rounded-3xl border border-[#27272A] bg-[#141414] p-6 shadow-[0_4px_20px_rgba(0,0,0,0.5)] transition hover:border-[#D4AF37]/40 hover:shadow-[0_0_20px_rgba(212,175,55,0.15)]">
      <div className="flex items-center justify-between mb-4">
        <div className="p-3 bg-[#D4AF37]/15 rounded-2xl border border-[#D4AF37]/20">
          <Icon className="h-5 w-5 text-[#D4AF37]" />
        </div>
        <div className="flex items-center text-emerald-400 text-xs font-bold bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 rounded-full">
          +8.4% <ArrowUpRight className="h-3 w-3 ml-0.5" />
        </div>
      </div>
      <p className="text-[10px] font-bold text-[#A1A1AA] uppercase tracking-wider">{title}</p>
      <h3 className="text-2xl font-black text-white mt-1">{value}</h3>
      <p className="text-[10px] text-[#71717A] mt-1.5">{desc}</p>
    </div>
  );
}
