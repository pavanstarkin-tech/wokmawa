import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { signOut } from "firebase/auth";
import { ref, onValue, query, orderByChild, startAt, get } from "firebase/database";
import { auth, db } from "@/lib/firebase";
import { Users, Receipt, Utensils, IndianRupee, ArrowUpRight } from "lucide-react";

export const Route = createFileRoute("/admin/dashboard")({
  component: AdminDashboard,
});

function AdminDashboard() {
  const [metrics, setMetrics] = useState({
    revenue: 0,
    activeOrders: 0,
    totalTables: 0,
    itemsSold: 0,
  });

  useEffect(() => {
    // 1. Listen to Tables
    const tablesRef = ref(db, "restaurant/tables");
    const unsubTables = onValue(tablesRef, (snapshot) => {
      let activeCount = 0;
      snapshot.forEach((child) => {
        if (child.val().active) activeCount++;
      });
      setMetrics((m) => ({ ...m, totalTables: activeCount }));
    });

    // 2. Listen to Orders (for today)
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const todayTimestamp = startOfDay.getTime();

    // Query orders from today
    const ordersQuery = query(ref(db, "restaurant/orders"), orderByChild("createdAt"), startAt(todayTimestamp));
    
    const unsubOrders = onValue(ordersQuery, (snapshot) => {
      let revenue = 0;
      let activeOrders = 0;
      let itemsSold = 0;

      snapshot.forEach((childSnapshot) => {
        const order = childSnapshot.val();
        
        // Active Orders
        if (order.status === "pending" || order.status === "preparing" || order.status === "ready") {
          activeOrders++;
        }

        // Revenue and Items Sold (only count paid/completed orders for revenue)
        // If they want running revenue, we can include all, but usually revenue is 'paid'. Let's include all non-cancelled.
        if (order.status !== "cancelled") {
          revenue += (order.total || 0);
          const items = order.items || [];
          items.forEach((item: any) => {
            itemsSold += (item.quantity || 1);
          });
        }
      });

      setMetrics((m) => ({ ...m, revenue, activeOrders, itemsSold }));
    });

    return () => {
      unsubTables();
      unsubOrders();
    };
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-brown-deep tracking-tight">Overview</h1>
          <p className="text-muted-foreground mt-1">Real-time pulse of Paakashala.</p>
        </div>
        <button
          onClick={() => signOut(auth)}
          className="rounded-xl border border-border/80 bg-card px-5 py-2.5 text-sm font-bold text-red-600 shadow-sm transition-all hover:bg-red-500/10 active:scale-95"
        >
          Logout
        </button>
      </div>
      
      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard title="Today's Revenue" value={`₹${metrics.revenue.toLocaleString('en-IN')}`} icon={IndianRupee} />
        <MetricCard title="Active Orders" value={metrics.activeOrders} icon={Receipt} />
        <MetricCard title="Active Tables" value={metrics.totalTables} icon={Users} />
        <MetricCard title="Items Sold" value={metrics.itemsSold} icon={Utensils} />
      </div>

      {/* Placeholder for Charts / Recent Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-3xl border border-border/60 bg-card p-8 shadow-luxe h-[400px] flex items-center justify-center">
           <p className="text-muted-foreground font-medium text-lg">Revenue Chart Coming Soon</p>
        </div>
        <div className="rounded-3xl border border-border/60 bg-card p-8 shadow-luxe h-[400px] flex items-center justify-center">
           <p className="text-muted-foreground font-medium text-lg">Recent Activity</p>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ title, value, icon: Icon, trend }: any) {
  return (
    <div className="rounded-3xl border border-border/60 bg-card p-6 shadow-sm transition-all hover:shadow-luxe hover:-translate-y-1">
      <div className="flex items-center justify-between mb-4">
        <div className="p-3 bg-gold/10 rounded-2xl">
          <Icon className="h-6 w-6 text-gold" />
        </div>
        {trend && (
          <div className="flex items-center text-green-600 text-xs font-bold bg-green-500/10 px-2 py-1 rounded-lg">
            {trend} <ArrowUpRight className="h-3 w-3 ml-1" />
          </div>
        )}
      </div>
      <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{title}</p>
      <h3 className="text-3xl font-bold text-brown-deep mt-1">{value}</h3>
    </div>
  );
}
