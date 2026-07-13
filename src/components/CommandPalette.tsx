import { useEffect, useState, useRef } from "react";
import { Search, Command, Key, FileText, Settings, ShieldAlert, Sparkles } from "lucide-react";

interface CommandItem {
  name: string;
  category: string;
  action: () => void;
  icon: any;
}

export function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const commands: CommandItem[] = [
    { name: "Open POS Billing Screen", category: "Navigation", action: () => { window.location.hash = "/admin/pos-billing"; }, icon: Sparkles },
    { name: "Open ERP Inventory Dashboard", category: "Navigation", action: () => { window.location.hash = "/admin/erp"; }, icon: Settings },
    { name: "Close Active Shift float", category: "Operations", action: () => { alert("Shift closure checklist triggered."); }, icon: Key },
    { name: "Export GST Audit Ledger", category: "Reports", action: () => { alert("Exporting GST CSV..."); }, icon: FileText },
    { name: "Trigger Nightly Database Backup", category: "Safety", action: () => { alert("SQLite copy backup created."); }, icon: ShieldAlert }
  ];

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filtered = commands.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-background/60 backdrop-blur-sm pt-[15vh]">
      <div className="bg-card border border-border/80 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col p-4 gap-3 animate-fade-in text-brown-deep">
        <div className="flex items-center gap-2 border border-border/50 rounded-xl px-3 py-2.5 bg-background">
          <Search className="h-5 w-5 text-muted-foreground" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search orders, reports, settings, or execute actions..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full text-sm bg-transparent outline-none border-none text-brown-deep focus:ring-0"
          />
          <kbd className="px-1.5 py-0.5 text-[10px] font-mono border rounded bg-muted text-muted-foreground select-none">ESC</kbd>
        </div>

        <div className="space-y-1.5 max-h-72 overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">No matching actions found.</p>
          ) : (
            filtered.map((item, idx) => (
              <button
                key={idx}
                onClick={() => {
                  item.action();
                  setIsOpen(false);
                }}
                className="w-full text-left p-3 hover:bg-gold/10 rounded-xl transition flex justify-between items-center group text-xs"
              >
                <div className="flex items-center gap-2 font-bold text-brown-deep">
                  <item.icon className="h-4 w-4 text-gold group-hover:scale-110 transition" />
                  {item.name}
                </div>
                <span className="text-[9px] bg-muted px-2 py-0.5 rounded text-muted-foreground uppercase font-black tracking-wider">{item.category}</span>
              </button>
            ))
          )}
        </div>

        <div className="border-t border-border/30 pt-3 flex justify-between items-center text-[10px] text-muted-foreground px-1">
          <span className="flex items-center gap-1"><Command className="h-3 w-3" /> Select action to execute</span>
          <span>Press ESC to close</span>
        </div>
      </div>
    </div>
  );
}
