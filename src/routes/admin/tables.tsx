import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState, useMemo } from "react";
import { ref, onValue, set, update, remove } from "firebase/database";
import { db } from "@/lib/firebase";
import QRCode from "qrcode";
import { Plus, Printer, Download, Trash2, ToggleLeft, ToggleRight } from "lucide-react";

export const Route = createFileRoute("/admin/tables")({
  component: AdminTables,
});

type Table = {
  id: string;
  name: string;
  active: boolean;
  createdAt: number;
};

const BASE_URL = typeof window !== "undefined" ? window.location.origin : "";

function AdminTables() {
  const [tables, setTables] = useState<Table[]>([]);
  const [newTableName, setNewTableName] = useState("");
  const [adding, setAdding] = useState(false);
  const [qrDataUrls, setQrDataUrls] = useState<Record<string, string>>({});

  // Load tables from Firebase
  useEffect(() => {
    const tablesRef = ref(db, "restaurant/tables");
    const unsub = onValue(tablesRef, (snapshot) => {
      const fetched: Table[] = [];
      snapshot.forEach((child) => {
        fetched.push({ id: child.key as string, ...child.val() });
      });
      fetched.sort((a, b) => a.createdAt - b.createdAt);
      setTables(fetched);
    });
    return () => unsub();
  }, []);

  // Generate QR code data URLs whenever tables change
  useEffect(() => {
    tables.forEach(async (table) => {
      if (!qrDataUrls[table.id]) {
        const url = `${BASE_URL}/t/${table.id}`;
        
        try {
          // Create a canvas to draw QR and Logo in HIGH RESOLUTION (1200x1200) for print quality
          const canvas = document.createElement('canvas');
          const size = 1200;
          canvas.width = size;
          canvas.height = size;
          
          await QRCode.toCanvas(canvas, url, {
            width: size,
            margin: 2,
            errorCorrectionLevel: 'H', // High error correction needed for logo overlay
            color: { dark: "#3B1F0A", light: "#FDF8F0" },
          });

          const ctx = canvas.getContext('2d');
          if (ctx) {
            const logo = new Image();
            logo.crossOrigin = "anonymous";
            logo.src = "https://i.ibb.co/6JncbJsc/Screenshot-2026-07-10-13-42-55-71-1c337646f29875672b5a61192b9010f9.png";
            
            await new Promise((resolve) => {
              logo.onload = resolve;
              logo.onerror = resolve; 
            });

            // Draw logo in center (approx 25% of QR size)
            const logoSize = size * 0.25; 
            const logoX = (size - logoSize) / 2;
            const logoY = (size - logoSize) / 2;

            // Draw background behind logo to ensure readability
            ctx.fillStyle = "#FDF8F0";
            // Rounded rect background for logo
            ctx.beginPath();
            ctx.roundRect(logoX - 15, logoY - 15, logoSize + 30, logoSize + 30, 24);
            ctx.fill();
            
            ctx.drawImage(logo, logoX, logoY, logoSize, logoSize);
          }

          const dataUrl = canvas.toDataURL("image/png");
          setQrDataUrls((prev) => ({ ...prev, [table.id]: dataUrl }));
        } catch (err) {
          console.error("QR Generation failed", err);
        }
      }
    });
  }, [tables]);

  const addTable = async () => {
    const input = newTableName.trim();
    if (!input) return;
    
    setAdding(true);
    
    // Split by comma for bulk addition
    const names = input.split(",").map(n => n.trim()).filter(n => n.length > 0);
    
    const promises = names.map((name, idx) => {
      const tableId = name.replace(/\s+/g, "-").toUpperCase();
      return set(ref(db, `restaurant/tables/${tableId}`), {
        name,
        active: true,
        // slightly offset timestamps to maintain input order
        createdAt: Date.now() + idx, 
      });
    });
    
    await Promise.all(promises);
    
    setNewTableName("");
    setAdding(false);
  };

  const toggleActive = async (table: Table) => {
    await update(ref(db, `restaurant/tables/${table.id}`), { active: !table.active });
  };

  const deleteTable = async (tableId: string) => {
    if (!confirm(`Delete table "${tableId}"? This cannot be undone.`)) return;
    await remove(ref(db, `restaurant/tables/${tableId}`));
  };

  const downloadQR = (table: Table) => {
    const dataUrl = qrDataUrls[table.id];
    if (!dataUrl) return;
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `QR-${table.id}.png`;
    a.click();
  };

  const printQR = (table: Table) => {
    const dataUrl = qrDataUrls[table.id];
    if (!dataUrl) return;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`
      <html>
        <head>
          <title>QR - ${table.name}</title>
          <style>
            body { margin: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; font-family: Georgia, serif; background: #FDF8F0; }
            .card { border: 2px solid #3B1F0A; border-radius: 24px; padding: 32px 40px; text-align: center; background: white; }
            h2 { margin: 0 0 4px; font-size: 14px; color: #888; letter-spacing: 2px; text-transform: uppercase; }
            h1 { margin: 0 0 20px; font-size: 32px; font-weight: 900; color: #3B1F0A; }
            img { width: 260px; height: 260px; }
            p { margin: 20px 0 0; font-size: 13px; color: #888; }
          </style>
        </head>
        <body onload="window.print()">
          <div class="card">
            <h2>Venu's Paakashala</h2>
            <h1>Table ${table.name}</h1>
            <img src="${dataUrl}" />
            <p>Scan to view menu & order</p>
          </div>
        </body>
      </html>
    `);
    win.document.close();
  };

  const printAllQR = () => {
    const win = window.open("", "_blank");
    if (!win) return;
    
    // Generate HTML for all cards
    const cardsHtml = tables.map(table => {
      const dataUrl = qrDataUrls[table.id];
      if (!dataUrl) return ""; // Skip if not generated yet
      return `
        <div class="card">
          <h2>Venu's Paakashala</h2>
          <h1>Table ${table.name}</h1>
          <img src="${dataUrl}" />
          <p>Scan to view menu & order</p>
        </div>
      `;
    }).join('');

    win.document.write(`
      <html>
        <head>
          <title>Print All QRs</title>
          <style>
            @page { margin: 0; size: A4 portrait; }
            body { 
              margin: 0; 
              font-family: Georgia, serif; 
              background: white; 
              -webkit-print-color-adjust: exact; 
              print-color-adjust: exact;
            }
            .grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              /* Remove gaps to maximize size */
              gap: 0;
              width: 100%;
            }
            .card { 
              border: 1px dashed #ccc; 
              padding: 0.5in; /* Inner spacing */
              text-align: center; 
              background: #FDF8F0; 
              page-break-inside: avoid;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              height: 5.8in; /* Fit exactly 2 rows per A4 page (A4 is 11.69in tall) */
              box-sizing: border-box;
            }
            h2 { margin: 0 0 10px; font-size: 18px; color: #888; letter-spacing: 3px; text-transform: uppercase; }
            h1 { margin: 0 0 30px; font-size: 48px; font-weight: 900; color: #3B1F0A; line-height: 1; }
            img { width: 100%; max-width: 3.5in; height: auto; aspect-ratio: 1/1; }
            p { margin: 30px 0 0; font-size: 18px; color: #888; font-weight: bold; }
          </style>
        </head>
        <body onload="setTimeout(() => window.print(), 500)">
          <div class="grid">
            ${cardsHtml}
          </div>
        </body>
      </html>
    `);
    win.document.close();
  };

  // Group tables by their base identifier (e.g. "1" for "1a", "1b", "1")
  const groupedTables = useMemo(() => {
    const groups: Record<string, Table[]> = {};
    tables.forEach(table => {
      const match = table.name.match(/^(\d+|[a-zA-Z]+\d+)/);
      const baseKey = match ? match[1] : table.name;
      if (!groups[baseKey]) groups[baseKey] = [];
      groups[baseKey].push(table);
    });
    return groups;
  }, [tables]);

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-500">
      {/* Header */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-3xl font-bold text-brown-deep tracking-tight">Tables & QR Codes</h1>
          <p className="text-muted-foreground mt-1">Create tables, generate and print QR codes for each table.</p>
        </div>
        <button
          onClick={printAllQR}
          disabled={tables.length === 0}
          className="flex items-center gap-2 bg-brown-gradient text-cream px-5 py-2.5 rounded-xl font-bold text-sm shadow-sm hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Printer className="h-4 w-4" />
          Print All QRs (Bulk)
        </button>
      </div>

      {/* Add Table */}
      <div className="flex items-center gap-3 mb-8 shrink-0">
        <input
          type="text"
          placeholder="Table name (e.g. 1A, 1B, 1C)"
          value={newTableName}
          onChange={(e) => setNewTableName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addTable()}
          className="flex-1 max-w-sm px-4 py-2.5 rounded-xl border border-border/80 bg-card text-sm focus:outline-none focus:ring-2 focus:ring-gold/50 shadow-sm"
        />
        <button
          onClick={addTable}
          disabled={adding || !newTableName.trim()}
          className="flex items-center gap-2 bg-brown-gradient text-cream px-5 py-2.5 rounded-xl font-bold text-sm shadow-sm hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="h-4 w-4" />
          Add Tables
        </button>
      </div>

      {/* Tables Grid */}
      <div className="flex-1 overflow-y-auto pb-12">
        {tables.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-muted-foreground font-medium text-lg border-2 border-dashed border-border/60 rounded-3xl">
            No tables yet. Add your first table above!
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(groupedTables).map(([baseKey, groupList]) => (
              <div key={baseKey} className="border border-border/50 bg-[#FDF8F0]/30 rounded-3xl p-6 space-y-4">
                <h3 className="text-xs font-black text-brown-deep uppercase tracking-wider">Table Group: {baseKey}</h3>
                <div className="grid gap-6" style={{ gridTemplateColumns: `repeat(${groupList.length}, minmax(0, 1fr))` }}>
                  {groupList.map((table) => (
                    <div
                      key={table.id}
                      className={`bg-card rounded-3xl border shadow-sm overflow-hidden flex flex-col transition-all ${
                        table.active ? "border-border/60" : "border-border/30 opacity-60"
                      }`}
                    >
                      {/* QR Code */}
                      <div className="p-5 flex items-center justify-center bg-[#FDF8F0]">
                        {qrDataUrls[table.id] ? (
                          <img
                            src={qrDataUrls[table.id]}
                            alt={`QR for ${table.name}`}
                            className="max-h-48 h-auto w-auto rounded-xl object-contain"
                          />
                        ) : (
                          <div className="w-full aspect-square bg-muted/30 rounded-xl flex items-center justify-center">
                            <div className="h-6 w-6 border-2 border-gold border-t-transparent rounded-full animate-spin" />
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="px-4 pb-4 flex flex-col gap-3">
                        <div className="text-center pt-2">
                          <h3 className="font-black text-brown-deep text-base">Table {table.name}</h3>
                          <p className="text-[10px] text-muted-foreground font-mono truncate">/t/{table.id}</p>
                        </div>

                        {/* Status Toggle */}
                        <button
                          onClick={() => toggleActive(table)}
                          className={`flex items-center justify-center gap-2 text-[10px] font-bold px-3 py-1.5 rounded-xl border transition-colors ${
                            table.active
                              ? "bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
                              : "bg-red-50 text-red-600 border-red-200 hover:bg-red-100"
                          }`}
                        >
                          {table.active ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
                          {table.active ? "Active" : "Inactive"}
                        </button>

                        {/* Actions */}
                        <div className="flex gap-2">
                          <button
                            onClick={() => printQR(table)}
                            className="flex-1 flex items-center justify-center gap-1 py-2 rounded-xl bg-muted/30 hover:bg-muted/60 text-[10px] font-bold text-brown-deep transition-colors"
                          >
                            <Printer className="h-3.5 w-3.5" />
                            Print
                          </button>
                          <button
                            onClick={() => downloadQR(table)}
                            className="flex-1 flex items-center justify-center gap-1 py-2 rounded-xl bg-muted/30 hover:bg-muted/60 text-[10px] font-bold text-brown-deep transition-colors"
                          >
                            <Download className="h-3.5 w-3.5" />
                            Save
                          </button>
                          <button
                            onClick={() => deleteTable(table.id)}
                            className="p-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-500 transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
