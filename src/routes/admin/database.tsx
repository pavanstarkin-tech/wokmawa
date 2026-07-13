import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { databaseHealth, HealthReport } from "@/core/database/DatabaseHealth";
import { databaseBackup } from "@/core/database/DatabaseBackup";
import { Database, HardDrive, ShieldCheck, RefreshCw, Archive, Zap, Trash2 } from "lucide-react";
import logger from "@/services/logger/Logger";

export const Route = createFileRoute("/admin/database")({
  component: DatabaseOperations,
});

function DatabaseOperations() {
  const [report, setReport] = useState<HealthReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const fetchHealthReport = async () => {
    setLoading(true);
    try {
      const rep = await databaseHealth.getHealthReport();
      setReport(rep);
    } catch (e: any) {
      logger.error("database", "Failed fetching health statistics", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealthReport();
  }, []);

  const handleCompact = async () => {
    setLoading(true);
    setActionMessage("Compacting database indices...");
    try {
      await databaseHealth.compactDatabase();
      await fetchHealthReport();
      setActionMessage("Database compressed and index pages optimized.");
    } catch (err: any) {
      setActionMessage(`Optimization failed: ${err.message}`);
    } finally {
      setLoading(false);
      setTimeout(() => setActionMessage(null), 4000);
    }
  };

  const handleCreateBackup = async () => {
    setLoading(true);
    setActionMessage("Compiling SQLite file backup snapshot...");
    try {
      const res = await databaseBackup.createBackup();
      if (res.success) {
        setActionMessage(`Backup snapshot saved successfully at: ${res.filePath}`);
      } else {
        setActionMessage(`Backup snapshot failed: ${res.error}`);
      }
      await fetchHealthReport();
    } catch (err: any) {
      setActionMessage(`Backup failed: ${err.message}`);
    } finally {
      setLoading(false);
      setTimeout(() => setActionMessage(null), 6000);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-4 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/40 pb-5">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-brown-deep flex items-center gap-2">
            <Database className="h-7 w-7 text-gold" />
            System Database Operations
          </h2>
          <p className="text-sm text-muted-foreground">
            Monitor offline SQLite transaction logs, trigger diagnostic compacts, and compile backups.
          </p>
        </div>
        <button
          onClick={fetchHealthReport}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 bg-gold/10 text-brown-deep border border-gold/30 rounded-lg hover:bg-gold/20 transition-all font-medium text-sm active:scale-95 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh Stats
        </button>
      </div>

      {actionMessage && (
        <div className="p-4 rounded-xl bg-gold/10 border border-gold/30 text-brown-deep text-sm animate-fade-up font-medium shadow-sm">
          {actionMessage}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Size */}
        <div className="relative overflow-hidden rounded-2xl border border-border bg-card/65 p-6 backdrop-blur-md shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">DB Storage Size</span>
            <HardDrive className="h-5 w-5 text-gold" />
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold text-brown-deep">{report?.databaseSize || "Computing..."}</h3>
            <p className="text-xs text-muted-foreground mt-1">Pre-allocated disk page usage</p>
          </div>
        </div>

        {/* Integrity check */}
        <div className="relative overflow-hidden rounded-2xl border border-border bg-card/65 p-6 backdrop-blur-md shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Integrity check</span>
            <ShieldCheck className={`h-5 w-5 ${report?.healthy ? "text-green-500" : "text-amber-500"}`} />
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold text-brown-deep">{report?.healthy ? "Healthy" : "Issues Found"}</h3>
            <p className="text-xs text-muted-foreground mt-1 truncate">{report?.integrity || "PRAGMA check outstanding"}</p>
          </div>
        </div>

        {/* Total records */}
        <div className="relative overflow-hidden rounded-2xl border border-border bg-card/65 p-6 backdrop-blur-md shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Offline Transactions</span>
            <Database className="h-5 w-5 text-gold" />
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold text-brown-deep">{report ? report.totalOrders + report.totalBills : 0}</h3>
            <p className="text-xs text-muted-foreground mt-1">{report?.totalOrders || 0} orders, {report?.totalBills || 0} bills</p>
          </div>
        </div>

        {/* Sync Status */}
        <div className="relative overflow-hidden rounded-2xl border border-border bg-card/65 p-6 backdrop-blur-md shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Pending Syncs</span>
            <Zap className={`h-5 w-5 ${report?.pendingSync && report.pendingSync > 0 ? "text-amber-500" : "text-muted-foreground"}`} />
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold text-brown-deep">{report?.pendingSync ?? 0}</h3>
            <p className="text-xs text-muted-foreground mt-1">Outbox mutation queues</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Database Tuning & Optimization */}
        <div className="rounded-2xl border border-border bg-card/45 p-6 backdrop-blur-md shadow-sm space-y-4">
          <h3 className="text-lg font-bold text-brown-deep flex items-center gap-2">
            <Zap className="h-5 w-5 text-gold" />
            Compact & Optimize Indexes
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Over time, inserting and deleting bills and orders creates database gaps. Run compact to execute SQL VACUUM, freeing empty blocks and boosting lookups speed.
          </p>
          <button
            onClick={handleCompact}
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-brown-deep text-gold rounded-xl hover:opacity-95 font-medium transition active:scale-98 disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" />
            Compact Database Now
          </button>
        </div>

        {/* Automated Backups Snapshot */}
        <div className="rounded-2xl border border-border bg-card/45 p-6 backdrop-blur-md shadow-sm space-y-4">
          <h3 className="text-lg font-bold text-brown-deep flex items-center gap-2">
            <Archive className="h-5 w-5 text-gold" />
            Database Snapshots Backup
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Manually trigger a full SQLite database binary snapshot backup. Backup files will be stored in your local application directory backups folder.
          </p>
          <button
            onClick={handleCreateBackup}
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gold-gradient text-brown-deep rounded-xl hover:opacity-95 font-medium transition active:scale-98 disabled:opacity-50"
          >
            <Archive className="h-4 w-4" />
            Create Backup Snapshot
          </button>
        </div>
      </div>
    </div>
  );
}
