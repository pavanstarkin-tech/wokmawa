import { lazy, Suspense, useState } from "react";
import { LOGO_URL } from "@/lib/paakashala-menu";
import { useNavigate } from "@tanstack/react-router";
import { useTable } from "@/lib/paakashala-store";

// Lazy load to prevent module execution crash on HTTP (insecure context) where navigator.mediaDevices is undefined
const Scanner = lazy(() => import('@yudiel/react-qr-scanner').then(m => ({ default: m.Scanner })));

export function TableScannerPrompt() {
  const [error, setError] = useState<string | null>(null);
  const [scannedText, setScannedText] = useState<string | null>(null);
  const [manualTable, setManualTable] = useState("");
  const navigate = useNavigate();
  const { setTable } = useTable();

  const handleManualSubmit = () => {
    if (manualTable.trim()) {
      setTable(manualTable.trim().toUpperCase());
      window.location.href = "/";
    }
  };

  const handleScan = (text: string) => {
    if (!text) return;
    const cleaned = text.trim();
    
    // Show what was scanned (for debugging)
    setScannedText(cleaned);
    
    // 1. Check if it's a full URL (extract the table path so it works on any domain/IP)
    if (cleaned.startsWith("http://") || cleaned.startsWith("https://")) {
      try {
        const url = new URL(cleaned);
        const match = url.pathname.match(/\/t\/([^/]+)/i);
        if (match && match[1]) {
          const tableId = match[1].toUpperCase();
          setTable(tableId);
          window.location.href = "/";
          return;
        }
        // URL exists but no /t/ path — use the last path segment
        const segments = url.pathname.split("/").filter(Boolean);
        if (segments.length > 0) {
          const tableId = segments[segments.length - 1].toUpperCase();
          setTable(tableId);
          window.location.href = "/";
          return;
        }
      } catch (e) {
        console.error("URL parsing failed", e);
      }
    }
    
    // 2. Check if it's a relative path format (e.g., "/t/12" or "t/12")
    if (cleaned.toLowerCase().startsWith("/t/") || cleaned.toLowerCase().startsWith("t/")) {
      const parts = cleaned.split("/");
      const tableId = parts[parts.length - 1].toUpperCase();
      if (tableId) {
        setTable(tableId);
        window.location.href = "/";
        return;
      }
    }
    
    // 3. Fallback: If it's just a raw table name/ID (e.g. "12" or "T12")
    if (/^[A-Z0-9_-]{1,30}$/i.test(cleaned)) {
      setTable(cleaned.toUpperCase());
      window.location.href = "/";
      return;
    }
    
    // Last resort: just use whatever was scanned as the table ID
    if (cleaned.length > 0 && cleaned.length < 50) {
      setTable(cleaned.replace(/[^A-Z0-9]/gi, "").toUpperCase() || "TABLE");
      window.location.href = "/";
      return;
    }

    setError(`Cannot read QR: "${cleaned.substring(0, 40)}"`);
  };

  const isSecureContext = 
    typeof window !== 'undefined' && 
    typeof navigator !== 'undefined' && 
    !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      {/* Centered Camera Container */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pb-[163px]">
        {/* The Scanning Box */}
        <div className="w-64 h-64 border-4 border-gold/70 rounded-3xl relative overflow-hidden bg-zinc-900 shadow-2xl">
          {isSecureContext ? (
            <Suspense fallback={<div className="text-white text-sm flex items-center justify-center h-full bg-black">Loading camera...</div>}>
              <Scanner
                onScan={(detectedCodes) => {
                  if (detectedCodes && detectedCodes.length > 0) {
                    handleScan(detectedCodes[0].rawValue);
                  }
                }}
                onError={(error) => console.log(error?.message)}
                styles={{ 
                  container: { width: '100%', height: '100%' }, 
                  video: { objectFit: 'cover', width: '100%', height: '100%' } 
                }}
              />
            </Suspense>
          ) : (
            <div className="text-center p-4 flex flex-col items-center justify-center h-full bg-black/90">
              <p className="text-white font-semibold text-sm mb-1">Camera Unavailable</p>
              <p className="text-white/60 text-xs">Please enter table ID manually.</p>
            </div>
          )}
          {/* Laser Line */}
          <div className="absolute top-0 left-0 w-full h-[3px] bg-gold shadow-[0_0_20px_rgba(200,155,60,1)] animate-ping pointer-events-none" style={{ animationDuration: '3s' }} />
        </div>
      </div>

      {/* Bottom Semi-Sphere Overlay */}
      <div className="absolute bottom-0 left-0 w-full">
        {/* The container */}
        <div 
          className="bg-card pt-12 pb-[calc(2rem+env(safe-area-inset-bottom))] px-6 text-center shadow-[0_-10px_40px_rgba(0,0,0,0.2)] relative overflow-hidden flex flex-col items-center"
          style={{
            borderTopLeftRadius: '100% 120px',
            borderTopRightRadius: '0',
          }}
        >
          <div className="h-20 w-[240px] mb-4 mt-2">
            <img
              src="https://aietta.ac.in/assets/images/departments/WOKMAWA%20Gold%20Flame%20Logo%20_1_.png"
              alt="WOKMAWA"
              className="h-full w-full object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/wokmawa/logo.png';
              }}
            />
          </div>
          
          <p className="text-[#A1A1AA] leading-relaxed text-sm max-w-[280px] mx-auto relative z-10 font-medium mb-4">
            Scan the QR code on your table to view the WOKMAWA menu and place your order.
          </p>

          <div className="relative z-10 w-full max-w-[280px] mx-auto flex gap-2">
            <input
              type="text"
              placeholder="Or enter table ID..."
              value={manualTable}
              onChange={(e) => setManualTable(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && handleManualSubmit()}
              className="flex-1 rounded-xl border border-[#27272A] bg-[#1C1C1C] px-4 py-3 text-sm font-bold text-[#D4AF37] uppercase outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] transition-all"
            />
            <button
              onClick={handleManualSubmit}
              disabled={!manualTable.trim()}
              className="bg-gradient-to-r from-[#E8C547] to-[#D4AF37] px-5 py-3 rounded-xl text-black font-extrabold text-sm shadow-gold-glow active:scale-95 transition disabled:opacity-50"
            >
              Go
            </button>
          </div>

          {scannedText && (
            <div className="mt-3 w-full max-w-[280px] mx-auto relative z-10 bg-black/10 rounded-xl px-3 py-2 border border-border/40">
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">QR Contains:</p>
              <p className="text-[11px] font-mono text-brown-deep break-all">{scannedText.substring(0, 80)}</p>
            </div>
          )}

          {error && (
            <p className="mt-4 text-red-500 text-sm font-bold relative z-10 animate-bounce">{error}</p>
          )}
        </div>
      </div>
    </div>
  );
}
