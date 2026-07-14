import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { ref, onValue } from "firebase/database";
import { db } from "@/lib/firebase";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line, AreaChart, Area, Legend
} from "recharts";
import { 
  TrendingUp, ShoppingBag, DollarSign, Award, Download, Calendar, 
  BrainCircuit, Search, ChevronRight, BarChart3, ArrowUpRight, ArrowDownRight,
  TrendingDown, Percent
} from "lucide-react";
import { format, startOfDay, subDays, startOfWeek, startOfMonth, isSameDay } from "date-fns";

export const Route = createFileRoute("/admin/analysis")({
  component: AdminAnalysis,
});

type Order = {
  id: string;
  tableId: string;
  items: Array<{ name: string; quantity: number; price: number }>;
  subtotal?: number;
  discount?: number;
  tax?: number;
  total: number;
  status: "pending" | "preparing" | "ready" | "paid" | "cancelled";
  createdAt: number;
  customerName?: string;
  mobile?: string;
};

type TimeFilter = "daily" | "weekly" | "monthly" | "all";

function AdminAnalysis() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("daily");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [mounted, setMounted] = useState(false);

  // Set mounted on client load
  useEffect(() => {
    setMounted(true);
  }, []);

  // Load all historical orders from Firebase Realtime Database
  useEffect(() => {
    const ordersRef = ref(db, "restaurant/orders");
    const unsub = onValue(ordersRef, (snapshot) => {
      const fetched: Order[] = [];
      snapshot.forEach((child) => {
        fetched.push({ id: child.key as string, ...child.val() });
      });
      // Sort latest first
      fetched.sort((a, b) => b.createdAt - a.createdAt);
      setOrders(fetched);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // Filter orders based on selected time filter (Daily: last 7 days, Weekly: last 4 weeks, Monthly: last 6 months)
  const filteredOrders = useMemo(() => {
    const now = new Date();
    return orders.filter(order => {
      if (!order.createdAt) return false;
      const orderDate = new Date(order.createdAt);
      if (isNaN(orderDate.getTime())) return false;
      
      // Status filter
      if (statusFilter !== "all" && order.status !== statusFilter) return false;
      
      // Search term filter
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const customerMatch = order.customerName?.toLowerCase().includes(term);
        const idMatch = order.id.toLowerCase().includes(term);
        const itemMatch = order.items?.some(i => i.name.toLowerCase().includes(term));
        if (!customerMatch && !idMatch && !itemMatch) return false;
      }

      if (timeFilter === "daily") {
        return orderDate >= subDays(now, 7);
      } else if (timeFilter === "weekly") {
        return orderDate >= subDays(now, 30);
      } else if (timeFilter === "monthly") {
        return orderDate >= subDays(now, 180);
      }
      return true;
    });
  }, [orders, timeFilter, searchTerm, statusFilter]);

  // Aggregate Key Performance Indicators (KPIs)
  const kpis = useMemo(() => {
    const paidOrders = filteredOrders.filter(o => o.status === "paid");
    const totalSales = paidOrders.reduce((sum, o) => sum + (o.total || 0), 0);
    // Simulate estimated profit margin at 65% (35% standard food ingredients & labor cost)
    const estimatedCost = totalSales * 0.35;
    const netProfit = totalSales - estimatedCost;
    
    const count = paidOrders.length;
    const averageOrder = count > 0 ? totalSales / count : 0;

    return {
      totalSales,
      netProfit,
      completedCount: count,
      averageOrder
    };
  }, [filteredOrders]);

  // Chart Data: Sales trend based on selected timeframe
  const salesTrendData = useMemo(() => {
    const paid = [...orders].filter(o => o.status === "paid").reverse();
    const groups: Record<string, { sales: number; profit: number }> = {};

    paid.forEach(o => {
      if (!o.createdAt) return;
      const date = new Date(o.createdAt);
      if (isNaN(date.getTime())) return;
      let key = "";
      if (timeFilter === "daily" || timeFilter === "all") {
        key = format(date, "dd MMM");
      } else if (timeFilter === "weekly") {
        const start = startOfWeek(date);
        key = `Wk ${format(start, "dd MM")}`;
      } else {
        key = format(date, "MMM yyyy");
      }

      if (!groups[key]) groups[key] = { sales: 0, profit: 0 };
      groups[key].sales += o.total;
      groups[key].profit += o.total * 0.65; // 65% profit margin
    });

    return Object.entries(groups).map(([label, data]) => ({
      name: label,
      sales: Math.round(data.sales),
      profit: Math.round(data.profit)
    })).slice(-10); // Keep last 10 data points for clean rendering
  }, [orders, timeFilter]);

  // Chart Data: Highest selling menu items
  const topSellingItems = useMemo(() => {
    const counts: Record<string, { name: string; quantity: number; revenue: number }> = {};

    filteredOrders.filter(o => o.status === "paid").forEach(o => {
      o.items?.forEach(item => {
        if (item && item.name) {
          if (!counts[item.name]) {
            counts[item.name] = { name: item.name, quantity: 0, revenue: 0 };
          }
          counts[item.name].quantity += item.quantity || 1;
          counts[item.name].revenue += (item.quantity || 1) * (item.price || 0);
        }
      });
    });

    return Object.values(counts)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 7); // Top 7 items
  }, [filteredOrders]);

  // AI Recommendation Engine: Predictive next day item prep suggestion based on historical day-of-week averages
  const nextDaySuggestions = useMemo(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowDayOfWeek = tomorrow.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const tomorrowName = dayNames[tomorrowDayOfWeek];

    // Find all historical orders that occurred on this specific day of the week
    const matchingDayOrders = orders.filter(o => {
      if (o.status !== "paid" || !o.createdAt) return false;
      const d = new Date(o.createdAt);
      return !isNaN(d.getTime()) && d.getDay() === tomorrowDayOfWeek;
    });

    // Group dates to find how many unique matching weekdays are present in history (to compute average)
    const uniqueDates = new Set(
      matchingDayOrders
        .map(o => {
          const d = new Date(o.createdAt);
          return isNaN(d.getTime()) ? "" : format(d, "yyyy-MM-dd");
        })
        .filter(Boolean)
    );
    const occurrencesCount = Math.max(uniqueDates.size, 1);

    const itemTotals: Record<string, number> = {};
    matchingDayOrders.forEach(o => {
      o.items?.forEach(item => {
        if (item && item.name) {
          if (!itemTotals[item.name]) itemTotals[item.name] = 0;
          itemTotals[item.name] += item.quantity || 1;
        }
      });
    });

    return Object.entries(itemTotals)
      .map(([name, total]) => {
        // Average quantity sold per matching weekday + 10% safety buffer for forecasting
        const average = total / occurrencesCount;
        const suggestedPrep = Math.max(Math.ceil(average * 1.15), 1);
        return {
          name,
          avgQuantity: Number(average.toFixed(1)),
          suggestedPrep
        };
      })
      .sort((a, b) => b.suggestedPrep - a.suggestedPrep)
      .slice(0, 5); // Suggest top 5 items for prep list
  }, [orders]);

  // PDF Report Generator (Generates clean, professional print styles of data dashboard)
  const generatePDFReport = () => {
    const win = window.open("", "_blank");
    if (!win) return;

    const itemsRows = topSellingItems.map((item, idx) => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #eee;">#${idx + 1}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold; color: #3B1F0A;">${item.name}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity} units</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right; font-weight: bold; color: #B38646;">₹${Math.round(item.revenue).toLocaleString("en-IN")}</td>
      </tr>
    `).join("");

    const dayPrepRows = nextDaySuggestions.map(item => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold; color: #3B1F0A;">${item.name}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${item.avgQuantity} units</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right; font-weight: bold; color: #2e7d32;">${item.suggestedPrep} units</td>
      </tr>
    `).join("");

    const orderRows = filteredOrders.slice(0, 15).map(o => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #eee; font-family: monospace;">#${o.id.substring(0, 8)}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">Table ${o.tableId}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${new Date(o.createdAt).toLocaleDateString("en-IN")}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold; text-transform: uppercase; color: ${o.status === "paid" ? "green" : "orange"}">${o.status}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right; font-weight: bold;">₹${o.total.toLocaleString("en-IN")}</td>
      </tr>
    `).join("");

    const dateRangeStr = timeFilter === "daily" ? "Last 7 Days" : timeFilter === "weekly" ? "Last 30 Days" : timeFilter === "monthly" ? "Last 6 Months" : "All Time";

    win.document.write(`
      <html>
        <head>
          <title>Paakashala OS - Business Analytics Report</title>
          <style>
            body { font-family: 'Outfit', 'Segoe UI', Arial, sans-serif; background: #fff; color: #333; margin: 40px; }
            .header { border-bottom: 3px solid #3B1F0A; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: flex-end; }
            .header-title h1 { margin: 0; font-size: 32px; font-weight: 900; color: #3B1F0A; text-transform: uppercase; letter-spacing: 1px; }
            .header-title p { margin: 5px 0 0; font-size: 14px; color: #666; font-weight: bold; }
            .header-date { text-align: right; font-size: 13px; color: #888; }
            .kpis { display: flex; gap: 20px; margin-bottom: 40px; }
            .kpi-card { flex: 1; border: 1px solid #EFE4D3; background: #FDF8F0; border-radius: 16px; padding: 20px; text-align: center; }
            .kpi-title { font-size: 10px; font-weight: 800; color: #8C7864; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 8px; }
            .kpi-value { font-size: 24px; font-weight: 900; color: #3B1F0A; }
            .section { margin-bottom: 40px; }
            .section-title { font-size: 16px; font-weight: 900; color: #3B1F0A; border-bottom: 2px solid #EFE4D3; padding-bottom: 8px; margin-bottom: 15px; text-transform: uppercase; letter-spacing: 1px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th { background: #3B1F0A; color: #fff; padding: 10px; text-align: left; font-weight: bold; font-size: 11px; text-transform: uppercase; }
            @media print {
              body { margin: 20px; }
              button { display: none; }
            }
          </style>
        </head>
        <body onload="window.print()">
          <div class="header">
            <div class="header-title">
              <h1>Paakashala OS Analytics</h1>
              <p>Business Performance Report &bull; ${dateRangeStr}</p>
            </div>
            <div class="header-date">
              Generated: ${new Date().toLocaleString("en-IN")}<br>
              Branch: MAIN_BRANCH
            </div>
          </div>

          <div class="kpis">
            <div class="kpi-card">
              <div class="kpi-title">Gross Sales Revenue</div>
              <div class="kpi-value">₹${Math.round(kpis.totalSales).toLocaleString("en-IN")}</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-title">Net Profit (65% margin)</div>
              <div class="kpi-value" style="color: #2e7d32;">₹${Math.round(kpis.netProfit).toLocaleString("en-IN")}</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-title">Orders Completed</div>
              <div class="kpi-value">${kpis.completedCount}</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-title">Average Ticket Value</div>
              <div class="kpi-value">₹${Math.round(kpis.averageOrder).toLocaleString("en-IN")}</div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Highest Selling Items</div>
            <table>
              <thead>
                <tr>
                  <th style="width: 8%;">Rank</th>
                  <th>Item Name</th>
                  <th style="text-align: center; width: 25%;">Quantity Sold</th>
                  <th style="text-align: right; width: 25%;">Gross Revenue</th>
                </tr>
              </thead>
              <tbody>
                ${itemsRows || '<tr><td colspan="4" style="text-align:center; padding:20px;">No sales data available for this range.</td></tr>'}
              </tbody>
            </table>
          </div>

          <div class="section">
            <div class="section-title">AI Predictive Inventory Planner (Prep Suggestions)</div>
            <p style="font-size: 11px; color: #555; margin-top: -10px; margin-bottom: 15px;">Smart prep recommendations calculated using historical day-of-week sales volume averages plus a 15% safety buffer.</p>
            <table>
              <thead>
                <tr>
                  <th>Recommended Prep Item</th>
                  <th style="text-align: center; width: 30%;">Historical Weekday Average</th>
                  <th style="text-align: right; width: 30%;">Recommended Prep Target</th>
                </tr>
              </thead>
              <tbody>
                ${dayPrepRows || '<tr><td colspan="3" style="text-align:center; padding:20px;">Insufficient historical data to make suggestions.</td></tr>'}
              </tbody>
            </table>
          </div>

          <div class="section" style="page-break-before: always;">
            <div class="section-title">Order Audit Log Summary (Top 15 Records)</div>
            <table>
              <thead>
                <tr>
                  <th>Order Reference ID</th>
                  <th>Source Table</th>
                  <th>Order Date</th>
                  <th>Fulfillment Status</th>
                  <th style="text-align: right;">Total Amount</th>
                </tr>
              </thead>
              <tbody>
                ${orderRows || '<tr><td colspan="5" style="text-align:center; padding:20px;">No matching orders found.</td></tr>'}
              </tbody>
            </table>
          </div>
        </body>
      </html>
    `);
    win.document.close();
  };

  if (!mounted || loading) {
    return (
      <div className="flex h-64 items-center justify-center bg-background rounded-3xl border border-border/60">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gold border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Header section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border/40 pb-5">
        <div>
          <h1 className="text-2xl font-black text-brown-deep tracking-tight">Business Intelligence Hub</h1>
          <p className="text-xs text-muted-foreground mt-1">Interactive sales insights, profit charts, and predictive inventory suggestions.</p>
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          {/* Timeframe Filters */}
          <div className="flex bg-muted/65 p-1 rounded-xl border border-border/50 text-[10px] font-black uppercase tracking-wider">
            {(["daily", "weekly", "monthly", "all"] as TimeFilter[]).map((filter) => (
              <button
                key={filter}
                onClick={() => setTimeFilter(filter)}
                className={`px-3 py-2 rounded-lg transition-all cursor-pointer ${
                  timeFilter === filter 
                    ? "bg-brown-gradient text-cream shadow-sm" 
                    : "text-brown-deep/80 hover:bg-gold/5"
                }`}
              >
                {filter === "daily" ? "7 Days" : filter === "weekly" ? "30 Days" : filter === "monthly" ? "6 Months" : "All Time"}
              </button>
            ))}
          </div>

          <button
            onClick={generatePDFReport}
            className="flex items-center gap-1.5 bg-brown-deep hover:bg-brown-deep/90 text-gold px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer"
          >
            <Download className="h-4.5 w-4.5" />
            <span>PDF Report</span>
          </button>
        </div>
      </div>

      {/* KPI Cards row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Gross Sales */}
        <div className="bg-card border border-border/60 p-5 rounded-3xl shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-center mb-4">
            <span className="text-[10px] uppercase font-black text-muted-foreground tracking-wider">Gross Revenue</span>
            <div className="h-8 w-8 rounded-xl bg-gold/10 flex items-center justify-center text-gold"><DollarSign className="h-4.5 w-4.5" /></div>
          </div>
          <div>
            <h2 className="text-2xl font-black text-brown-deep">₹{Math.round(kpis.totalSales).toLocaleString("en-IN")}</h2>
            <div className="flex items-center gap-1 mt-1 text-[9px] font-bold text-green-600">
              <TrendingUp className="h-3 w-3" />
              <span>Sales Target met</span>
            </div>
          </div>
        </div>

        {/* Card 2: Net Profit */}
        <div className="bg-card border border-border/60 p-5 rounded-3xl shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-center mb-4">
            <span className="text-[10px] uppercase font-black text-muted-foreground tracking-wider">Estimated Profit</span>
            <div className="h-8 w-8 rounded-xl bg-green-50 flex items-center justify-center text-green-600"><Percent className="h-4.5 w-4.5" /></div>
          </div>
          <div>
            <h2 className="text-2xl font-black text-green-700">₹{Math.round(kpis.netProfit).toLocaleString("en-IN")}</h2>
            <div className="flex items-center gap-1 mt-1 text-[9px] font-bold text-slate-500">
              <span>Standard 65% Food margin</span>
            </div>
          </div>
        </div>

        {/* Card 3: Completed Orders */}
        <div className="bg-card border border-border/60 p-5 rounded-3xl shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-center mb-4">
            <span className="text-[10px] uppercase font-black text-muted-foreground tracking-wider">Orders Filled</span>
            <div className="h-8 w-8 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-500"><ShoppingBag className="h-4.5 w-4.5" /></div>
          </div>
          <div>
            <h2 className="text-2xl font-black text-brown-deep">{kpis.completedCount}</h2>
            <div className="flex items-center gap-1 mt-1 text-[9px] font-bold text-indigo-500">
              <span>Paid tickets finalized</span>
            </div>
          </div>
        </div>

        {/* Card 4: Average Order Value */}
        <div className="bg-card border border-border/60 p-5 rounded-3xl shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-center mb-4">
            <span className="text-[10px] uppercase font-black text-muted-foreground tracking-wider">Average Ticket</span>
            <div className="h-8 w-8 rounded-xl bg-amber-50 flex items-center justify-center text-amber-500"><Award className="h-4.5 w-4.5" /></div>
          </div>
          <div>
            <h2 className="text-2xl font-black text-brown-deep">₹{Math.round(kpis.averageOrder).toLocaleString("en-IN")}</h2>
            <div className="flex items-center gap-1 mt-1 text-[9px] font-bold text-amber-600">
              <span>Average order amount</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Charts & Predictive Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Trend Area Chart (Span 2) */}
        <div className="lg:col-span-2 bg-card border border-border/60 p-5 rounded-3xl shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-black text-brown-deep flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-gold" /> Revenue & Profit Trends
            </h3>
          </div>
          
          <div className="h-64 text-[10px]">
            {salesTrendData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-muted-foreground font-bold">No sales data available.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={salesTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#B38646" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#B38646" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2e7d32" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#2e7d32" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EFE4D3/50" />
                  <XAxis dataKey="name" stroke="#8C7864" fontSize={9} fontWeight="bold" tickLine={false} />
                  <YAxis stroke="#8C7864" fontSize={9} fontWeight="bold" tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ background: "#3B1F0A", border: "none", borderRadius: "12px", color: "#FDF8F0", fontFamily: "monospace", fontSize: "10px" }}
                  />
                  <Legend wrapperStyle={{ fontSize: "10px", fontWeight: "bold" }} />
                  <Area type="monotone" dataKey="sales" name="Sales Revenue" stroke="#B38646" strokeWidth={2} fillOpacity={1} fill="url(#salesGrad)" />
                  <Area type="monotone" dataKey="profit" name="Net Profit" stroke="#2e7d32" strokeWidth={2} fillOpacity={1} fill="url(#profitGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Predictive AI prep suggestions (Span 1) */}
        <div className="lg:col-span-1 bg-card border border-border/60 p-5 rounded-3xl shadow-sm flex flex-col justify-between min-h-[300px]">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <BrainCircuit className="h-5 w-5 text-gold" />
              <h3 className="text-sm font-black text-brown-deep">AI Prep Suggestions</h3>
            </div>
            <p className="text-[10px] text-muted-foreground leading-normal">
              Based on historical weekday averages, here is the suggested preparation list for tomorrow's demand.
            </p>

            <div className="space-y-3 pt-2">
              {nextDaySuggestions.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground italic text-[11px]">Insufficient history to compile recommendations.</div>
              ) : (
                nextDaySuggestions.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center p-3 bg-muted/30 border border-border/40 rounded-2xl">
                    <div className="space-y-0.5">
                      <span className="font-bold text-brown-deep text-[11px] block">{item.name}</span>
                      <span className="text-[9px] text-muted-foreground font-semibold">Weekday Avg: {item.avgQuantity} units</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[11px] font-black text-green-700 bg-green-50 border border-green-200/50 px-3 py-1 rounded-xl block">
                        Prep {item.suggestedPrep}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="text-[9px] text-muted-foreground/80 mt-4 leading-normal italic text-center">
            Predictions recalculate dynamically with every finalized ticket order.
          </div>
        </div>
      </div>

      {/* Item Analysis & Orders Log list */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Highest Selling Items list (Span 1) */}
        <div className="lg:col-span-1 bg-card border border-border/60 p-5 rounded-3xl shadow-sm space-y-4">
          <h3 className="text-sm font-black text-brown-deep flex items-center gap-2">
            <Award className="h-5 w-5 text-gold" /> Highest Selling Items
          </h3>
          
          <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
            {topSellingItems.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground italic text-[11px]">No items sold yet.</div>
            ) : (
              topSellingItems.map((item, idx) => (
                <div key={idx} className="p-3 bg-background border border-border/60 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="h-6 w-6 rounded-full bg-gold/15 text-gold flex items-center justify-center text-[10px] font-black">
                      #{idx + 1}
                    </span>
                    <div>
                      <span className="font-bold text-brown-deep block text-xs">{item.name}</span>
                      <span className="text-[10px] text-muted-foreground font-semibold">{item.quantity} orders filled</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-black text-brown-deep block">₹{Math.round(item.revenue).toLocaleString("en-IN")}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Interactive Order Log list (Span 2) */}
        <div className="lg:col-span-2 bg-card border border-border/60 p-5 rounded-3xl shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <h3 className="text-sm font-black text-brown-deep flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-gold" /> Detailed Order Audit Log
            </h3>

            {/* Filter controls */}
            <div className="flex gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:flex-initial">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search customer, ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full sm:w-44 pl-8 pr-3 py-1.5 rounded-xl border border-border/80 bg-background text-[11px] font-bold focus:outline-none"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-xl border border-border/80 bg-background px-2.5 py-1.5 text-[11px] font-bold focus:outline-none"
              >
                <option value="all">All Status</option>
                <option value="paid">Paid</option>
                <option value="pending">Pending</option>
                <option value="preparing">Preparing</option>
                <option value="ready">Ready</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          {/* Table list */}
          <div className="overflow-x-auto border border-border/40 rounded-2xl max-h-[300px] overflow-y-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-muted/40 border-b border-border/60 sticky top-0 z-10">
                <tr className="text-[10px] uppercase font-black text-muted-foreground">
                  <th className="p-3">ID</th>
                  <th className="p-3">Table</th>
                  <th className="p-3">Customer</th>
                  <th className="p-3">Date</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20 text-brown-deep font-bold">
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-muted-foreground italic">No matching orders found.</td>
                  </tr>
                ) : (
                  filteredOrders.map((o) => (
                    <tr key={o.id} className="hover:bg-muted/10">
                      <td className="p-3 font-mono text-[10px] text-muted-foreground">#{o.id.substring(0, 8)}</td>
                      <td className="p-3">Table {o.tableId}</td>
                      <td className="p-3 text-muted-foreground">{o.customerName || "Walk-in Guest"}</td>
                      <td className="p-3 font-mono text-[10px] text-slate-500">{new Date(o.createdAt).toLocaleDateString("en-IN")}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase border ${
                          o.status === "paid" 
                            ? "bg-green-50 border-green-200/50 text-green-700" 
                            : o.status === "cancelled"
                            ? "bg-red-50 border-red-200/50 text-red-600"
                            : "bg-amber-50 border-amber-200/50 text-amber-700"
                        }`}>
                          {o.status}
                        </span>
                      </td>
                      <td className="p-3 text-right text-brown-deep font-black">₹{o.total.toLocaleString("en-IN")}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
