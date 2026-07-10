import { Scanner } from '@yudiel/react-qr-scanner';
import { LOGO_URL } from "@/lib/paakashala-menu";
import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";

export function TableScannerPrompt() {
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleScan = (text: string) => {
    if (text) {
      try {
        const url = new URL(text);
        if (url.pathname.startsWith('/t/')) {
           window.location.href = text; 
        } else {
           setError("Invalid Paakashala QR code.");
        }
      } catch {
        setError("Invalid QR format.");
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      {/* Camera Background */}
      <div className="absolute inset-0 overflow-hidden bg-black">
        <Scanner
          onResult={(text) => handleScan(text)}
          onError={(error) => console.log(error?.message)}
          options={{ delayBetweenScanAttempts: 1000 }}
          components={{ audio: false, finder: false }}
          styles={{ container: { width: '100%', height: '100%' }, video: { objectFit: 'cover' } }}
        />
      </div>

      {/* Transparent overlay for scanning box */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center pb-32">
        <div className="w-64 h-64 border-4 border-gold/70 rounded-3xl relative overflow-hidden">
           <div className="absolute top-0 left-0 w-full h-[3px] bg-gold shadow-[0_0_20px_rgba(200,155,60,1)] animate-ping" style={{ animationDuration: '3s' }} />
        </div>
      </div>

      {/* Bottom Semi-Sphere Overlay */}
      <div className="absolute bottom-0 left-0 w-full">
        {/* The container */}
        <div 
          className="bg-card pt-16 pb-[calc(4rem+env(safe-area-inset-bottom))] px-6 text-center shadow-[0_-10px_40px_rgba(0,0,0,0.2)] relative overflow-hidden flex flex-col items-center"
          style={{
            borderTopLeftRadius: '100% 120px',
            borderTopRightRadius: '0',
          }}
        >
          <div className="h-20 w-[240px] mb-6 mt-4">
            <img src="/logo-new.png" alt="Logo" className="h-full w-full object-contain mix-blend-multiply" />
          </div>
          
          <p className="text-muted-foreground leading-relaxed text-sm max-w-[280px] mx-auto relative z-10 font-medium">
            Scan the QR code on your table to view the menu and place your order.
          </p>
          {error && (
            <p className="mt-4 text-red-500 text-sm font-bold relative z-10 animate-bounce">{error}</p>
          )}
        </div>
      </div>
    </div>
  );
}
