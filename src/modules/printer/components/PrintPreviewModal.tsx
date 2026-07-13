import { ReceiptModel } from "../types/ReceiptModel";
import { X, Printer, FileText, ArrowRight } from "lucide-react";

interface PrintPreviewModalProps {
  model: ReceiptModel;
  onPrint: () => void;
  onDownloadPDF?: () => void;
  onCancel: () => void;
}

export function PrintPreviewModal({
  model,
  onPrint,
  onDownloadPDF,
  onCancel
}: PrintPreviewModalProps) {
  
  const handlePrintPDFSim = () => {
    if (onDownloadPDF) {
      onDownloadPDF();
      return;
    }
    // Standard browser print simulation
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
      <div className="bg-card border border-gold/25 shadow-2xl rounded-3xl w-full max-w-md flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card shrink-0">
          <h2 className="text-sm font-black text-brown-deep uppercase tracking-wider flex items-center gap-2">
            <Printer className="h-4.5 w-4.5 text-gold" /> Receipt print preview
          </h2>
          <button onClick={onCancel} className="text-muted-foreground hover:text-brown-deep p-1 rounded-full hover:bg-muted transition-colors cursor-pointer">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Virtual Receipt Paper */}
        <div className="flex-1 overflow-y-auto p-6 bg-muted/40 flex justify-center">
          <div className="w-full max-w-[320px] bg-white border border-border/80 shadow-md p-6 font-mono text-[11px] leading-relaxed text-slate-800 rounded-lg relative select-none">
            {/* Paper Top Jagged Edge representation */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-b from-slate-200/50 to-transparent"></div>

            {/* Logo placeholder */}
            {model.header.logoPath && (
              <div className="text-center mb-2 text-[10px] text-gold font-bold italic border border-dashed border-gold/30 py-1 bg-gold/5 rounded">
                [ Logo: {model.header.logoPath.split(/[\\/]/).pop()} ]
              </div>
            )}

            <div className="text-center space-y-1 mb-4">
              <h3 className="text-sm font-black tracking-wide text-black uppercase">{model.header.restaurantName}</h3>
              <p className="text-[10px] text-slate-500 font-sans">{model.header.branchName}</p>
              <p className="text-[9px] text-slate-500 leading-tight font-sans whitespace-pre-wrap">{model.header.address}</p>
              <p className="text-[9px] text-slate-500 font-sans">Tel: {model.header.phone}</p>
              {model.header.gstin && (
                <p className="text-[9px] text-slate-500 font-sans">GSTIN: {model.header.gstin}</p>
              )}
            </div>

            <div className="border-t border-dashed border-slate-300 py-3 space-y-1">
              {Object.entries(model.meta).map(([key, val]) => (
                <div key={key} className="flex justify-between">
                  <span className="text-slate-500">{key}:</span>
                  <span className="font-bold text-slate-900">{val}</span>
                </div>
              ))}
            </div>

            {model.items.length > 0 && (
              <div className="border-t border-dashed border-slate-300 py-3 space-y-2.5">
                <div className="flex justify-between font-bold text-slate-900 text-[10px]">
                  <span>Item (Qty x Rate)</span>
                  <span>Total</span>
                </div>
                <div className="border-b border-dashed border-slate-200"></div>
                {model.items.map((item, idx) => (
                  <div key={idx} className="space-y-0.5">
                    <div className="text-slate-900 font-bold">{item.name}</div>
                    <div className="flex justify-between text-slate-500 text-[10px]">
                      <span>{item.qty} x ₹{item.rate.toFixed(0)}</span>
                      <span>₹{item.total.toFixed(0)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="border-t border-dashed border-slate-300 py-3 space-y-1.5">
              {model.summary.map((sum, idx) => (
                <div key={idx} className={`flex justify-between ${sum.isBold ? "font-bold text-black text-[12px] pt-1 border-t border-slate-200 mt-1" : "text-slate-600"}`}>
                  <span>{sum.label}:</span>
                  <span>{sum.value}</span>
                </div>
              ))}
            </div>

            {model.footer.upiQrUrl && (
              <div className="border-t border-dashed border-slate-300 py-4 flex flex-col items-center gap-1.5">
                <div className="w-24 h-24 border border-slate-300 bg-slate-100 flex items-center justify-center text-[10px] text-slate-400 text-center p-2 rounded">
                  [ Simulated UPI Pay QR Code ]
                </div>
                <span className="text-[9px] text-slate-500 uppercase tracking-wider">Scan to Pay UPI</span>
              </div>
            )}

            <div className="border-t border-dashed border-slate-300 pt-4 text-center space-y-1">
              {model.footer.notes.map((note, idx) => (
                <div key={idx} className="text-slate-500 text-[10px] leading-tight whitespace-pre-wrap">{note}</div>
              ))}
            </div>

            {/* Paper Bottom Jagged Edge */}
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-t from-slate-200/50 to-transparent"></div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-muted/20 border-t border-border shrink-0 flex gap-3">
          <button
            onClick={handlePrintPDFSim}
            className="flex-1 bg-white hover:bg-slate-50 border border-slate-200 text-brown-deep py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer shadow-sm"
          >
            <FileText className="h-4 w-4" /> PDF Print
          </button>
          
          <button
            onClick={onPrint}
            className="flex-1 bg-brown-gradient text-cream py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 active:scale-[0.98] hover:opacity-90 transition-all cursor-pointer shadow-sm"
          >
            <Printer className="h-4 w-4 text-gold" /> Dispatch Print
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
export default PrintPreviewModal;
