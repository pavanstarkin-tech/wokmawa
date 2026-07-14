import { useState, useEffect, useRef } from "react";
import { 
  X, Wifi, Cpu, Settings, Image, Eye, Printer, 
  Check, RefreshCw, AlertCircle, ArrowLeft, ArrowRight 
} from "lucide-react";
import { printerDiscovery } from "../services/PrinterDiscovery";
import { imageProcessor, DitherPreset } from "../services/ImageProcessor";
import { testDocument } from "../templates/TestDocument";
import { receiptRenderer } from "../services/ReceiptRenderer";
import { driverManager } from "../drivers/DriverManager";
import { PrinterConfig, ConnectionType, PaperWidth, PrinterRole } from "../types/types";

interface PrinterWizardProps {
  onSave: (config: PrinterConfig) => void;
  onClose: () => void;
}

type WizardStep = 1 | 2 | 3 | 4 | 5 | 6;

export function PrinterWizard({ onSave, onClose }: PrinterWizardProps) {
  const [step, setStep] = useState<WizardStep>(1);
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Step 1 states
  const [connection, setConnection] = useState<ConnectionType>("lan");

  // Step 2 states
  const [subnet, setSubnet] = useState("192.168.1");
  const [scanning, setScanning] = useState(false);
  const [discovered, setDiscovered] = useState<Array<{ ip: string; port: number }>>([]);
  const [selectedIp, setSelectedIp] = useState("");
  const [selectedPort, setSelectedPort] = useState(9100);

  // Step 3 states
  const [name, setName] = useState("");
  const [role, setRole] = useState<PrinterRole>("billing");
  const [paperWidth, setPaperWidth] = useState<PaperWidth>("80mm");
  const [cutType, setCutType] = useState<"full" | "partial" | "none">("full");
  const [logoEnabled, setLogoEnabled] = useState(false);

  // Step 4 logo states
  const [logoBase64, setLogoBase64] = useState<string | null>(null);
  const [logoFilename, setLogoFilename] = useState("");
  const [preset, setPreset] = useState<DitherPreset>("Logo");
  const [brightness, setBrightness] = useState(0);
  const [contrast, setContrast] = useState(10);
  const [threshold, setThreshold] = useState(128);
  const [dither, setDither] = useState(true);
  const [logoPath, setLogoPath] = useState("");
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Step 5 states
  const [testResultSuccess, setTestResultSuccess] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);

  // Retrieve active subnet on boot
  useEffect(() => {
    const printerAPI = (window as any).printerAPI;
    if (printerAPI && typeof printerAPI.getActiveSubnet === "function") {
      printerAPI.getActiveSubnet().then((prefix: string) => {
        if (prefix) setSubnet(prefix);
      });
    }
  }, []);

  // Update canvas preview when logo inputs change
  useEffect(() => {
    if (step === 4 && logoBase64) {
      updateCanvasPreview();
    }
  }, [step, logoBase64, preset, brightness, contrast, threshold, dither]);

  const updateCanvasPreview = async () => {
    if (!logoBase64 || !canvasRef.current) return;
    try {
      const processed = await imageProcessor.processImage(logoBase64, {
        preset,
        brightness,
        contrast,
        threshold,
        dither,
        crop: true,
        center: true
      });

      const canvas = canvasRef.current;
      canvas.width = processed.width;
      canvas.height = processed.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Draw monochrome bits onto canvas
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, processed.width, processed.height);
      ctx.fillStyle = "#000000";

      const bytesWidth = Math.ceil(processed.width / 8);
      for (let y = 0; y < processed.height; y++) {
        for (let x = 0; x < processed.width; x++) {
          const byteIdx = y * bytesWidth + Math.floor(x / 8);
          const bitIdx = x % 8;
          const isBlack = (processed.bytes[byteIdx] & (0x80 >> bitIdx)) !== 0;
          if (isBlack) {
            ctx.fillRect(x, y, 1, 1);
          }
        }
      }
    } catch (err) {
      console.error("Failed to render canvas preview", err);
    }
  };

  const handleScanSubnet = async () => {
    setScanning(true);
    setDiscovered([]);
    setStatusMsg(null);
    try {
      const devs = await printerDiscovery.scanSubnet(subnet);
      setDiscovered(devs);
      if (devs.length > 0) {
        setSelectedIp(devs[0].ip);
        setSelectedPort(devs[0].port);
      } else {
        setStatusMsg({ type: "error", text: "No active ESC/POS printers found on subnet." });
      }
    } catch {
      setStatusMsg({ type: "error", text: "Failed scanning subnet prefix." });
    } finally {
      setScanning(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLogoFilename(file.name);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      setLogoBase64(base64);

      // Save locally via IPC if running inside Electron
      const printerAPI = (window as any).printerAPI;
      if (printerAPI && typeof printerAPI.saveLogoFile === "function") {
        try {
          const rawBase64 = base64.split(",")[1];
          const uniqueName = `logo-${Date.now()}-${file.name}`;
          const res = await printerAPI.saveLogoFile(rawBase64, uniqueName);
          if (res.success) {
            setLogoPath(res.logoPath);
          }
        } catch (err: any) {
          console.warn("Failed saving unique logo file locally", err);
        }
      } else {
        // Fallback mockup
        setLogoPath(`userData/assets/${file.name}`);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleTestPrint = async () => {
    setTestingConnection(true);
    setStatusMsg(null);

    const capabilities = {
      supportsQR: role === "billing",
      supportsImage: logoEnabled && !!logoPath,
      supportsBarcode: role === "billing",
      supportsCut: cutType !== "none",
      supportsCashDrawer: role === "billing"
    };

    const docModel = testDocument.build({
      printerName: name || "Setup Test Printer",
      connectionType: connection,
      ipAddress: connection === "lan" ? selectedIp : undefined,
      port: connection === "lan" ? selectedPort : undefined,
      capabilities
    });

    const profile = {
      paperWidth,
      charactersPerLine: paperWidth === "58mm" ? 32 : 48,
      font: "A" as const,
      density: 8,
      cutType,
      logoEnabled,
      logoPath: logoEnabled ? logoBase64 || undefined : undefined,
      marginTop: 0,
      marginBottom: 0,
      capabilities
    };

    try {
      const bytes = await receiptRenderer.render(docModel, profile);
      
      const printerAPI = (window as any).printerAPI;
      if (printerAPI && connection === "lan" && selectedIp) {
        // Electron native TCP path
        const response = await printerAPI.printNetwork(selectedIp, selectedPort, bytes);
        if (response.success) {
          setTestResultSuccess(true);
          setStatusMsg({ type: "success", text: "Test print job dispatched successfully! Check printer paper." });
        } else {
          setTestResultSuccess(false);
          setStatusMsg({ type: "error", text: `Test print failed: ${response.error || "Driver error"}` });
        }
      } else {
        // Browser environment — relay to Python ESC/POS emulator at 127.0.0.1:9100
        const targetIp = (connection === "lan" && selectedIp) ? selectedIp : "127.0.0.1";
        const targetPort = (connection === "lan" && selectedPort) ? selectedPort : 9100;
        try {
          const relayResponse = await fetch("/api/print-relay", {
            method: "POST",
            headers: { "Content-Type": "application/octet-stream" },
            body: bytes
          });
          if (relayResponse.ok) {
            setTestResultSuccess(true);
            setStatusMsg({ type: "success", text: `✓ Test print relayed to ESC/POS emulator at ${targetIp}:${targetPort}. Check Downloads/receipts/` });
          } else {
            const err = await relayResponse.json().catch(() => ({ error: `HTTP ${relayResponse.status}` }));
            setTestResultSuccess(false);
            setStatusMsg({ type: "error", text: `Emulator relay failed: ${err.error}. Is python escpos_emulator.py running?` });
          }
        } catch (relayErr: any) {
          setTestResultSuccess(false);
          setStatusMsg({ type: "error", text: `Could not reach emulator: ${relayErr.message}. Run python escpos_emulator.py first.` });
        }
      }
    } catch (err: any) {
      setTestResultSuccess(false);
      setStatusMsg({ type: "error", text: `Test printing error: ${err.message}` });
    } finally {
      setTestingConnection(false);
    }
  };

  const handleSaveConfig = () => {
    if (connection === "lan" && !selectedIp) {
      setStatusMsg({ type: "error", text: "No printer IP endpoint selected." });
      return;
    }

    const config: PrinterConfig = {
      id: `pr_${Date.now()}`,
      name: name || `${role.toUpperCase()} Printer`,
      type: connection,
      ip: connection === "lan" ? selectedIp : undefined,
      port: connection === "lan" ? selectedPort : undefined,
      role,
      enabled: true,
      status: testResultSuccess ? "online" : "connecting",
      profile: {
        paperWidth,
        charactersPerLine: paperWidth === "58mm" ? 32 : 48,
        font: "A",
        density: 8,
        cutType,
        logoEnabled,
        logoPath: logoEnabled && logoPath ? logoPath : undefined,
        marginTop: 0,
        marginBottom: 0,
        capabilities: {
          supportsQR: role === "billing",
          supportsImage: logoEnabled && !!logoPath,
          supportsBarcode: role === "billing",
          supportsCut: cutType !== "none",
          supportsCashDrawer: role === "billing"
        }
      },
      uptimeStats: {
        totalJobs: 0,
        failedJobs: 0,
        uptimePercentage: 100
      }
    };

    onSave(config);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
      <div className="bg-card border border-gold/25 shadow-2xl rounded-3xl w-full max-w-xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card shrink-0">
          <div>
            <h2 className="text-sm font-black text-brown-deep uppercase tracking-wider">
              Printer Configuration Wizard
            </h2>
            <span className="text-[10px] text-muted-foreground font-semibold">Step {step} of 6</span>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-brown-deep p-1 rounded-full hover:bg-muted transition-colors cursor-pointer">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Wizard step content area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs font-semibold text-brown-deep">
          
          {statusMsg && (
            <div className={`p-4 rounded-xl text-xs border font-bold flex items-center gap-2 ${
              statusMsg.type === "success" 
                ? "bg-green-50 border-green-200/50 text-green-700" 
                : "bg-red-50 border-red-200/50 text-red-700"
            }`}>
              <AlertCircle className="h-4.5 w-4.5" />
              <span>{statusMsg.text}</span>
            </div>
          )}

          {/* STEP 1: SELECT CONNECTION */}
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold flex items-center gap-2"><Wifi className="h-5 w-5 text-gold" /> Step 1: Select connection type</h3>
              <p className="text-muted-foreground leading-relaxed">
                Choose the connection interface for your thermal printer. Initially, LAN ethernet printing is the primary connection interface for commercial kitchen KOTs.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setConnection("lan")}
                  className={`p-5 rounded-2xl border text-left flex flex-col justify-between h-32 active:scale-95 transition-all cursor-pointer ${
                    connection === "lan" ? "border-gold bg-gold/5" : "border-border hover:bg-muted/30"
                  }`}
                >
                  <Wifi className="h-6 w-6 text-gold" />
                  <div>
                    <span className="font-bold block">LAN (Ethernet IP)</span>
                    <span className="text-[9px] text-muted-foreground mt-0.5 block leading-normal">Standard raw socket TCP network connections.</span>
                  </div>
                </button>
                <button
                  type="button"
                  disabled
                  className="p-5 rounded-2xl border border-border/40 text-left flex flex-col justify-between h-32 opacity-40 cursor-not-allowed"
                >
                  <Cpu className="h-6 w-6" />
                  <div>
                    <span className="font-bold block">USB Port (Stub)</span>
                    <span className="text-[9px] text-muted-foreground mt-0.5 block">Direct local desktop USB hardware.</span>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setConnection("mock")}
                  className={`p-5 rounded-2xl border text-left flex flex-col justify-between h-32 active:scale-95 transition-all cursor-pointer ${
                    connection === "mock" ? "border-gold bg-gold/5" : "border-border hover:bg-muted/30"
                  }`}
                >
                  <Eye className="h-6 w-6 text-gold" />
                  <div>
                    <span className="font-bold block">Virtual Mock</span>
                    <span className="text-[9px] text-muted-foreground mt-0.5 block leading-normal">Simulated prints inside developer tools.</span>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: SCAN SUBNET (LAN only) */}
          {step === 2 && connection === "lan" && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold flex items-center gap-2"><Cpu className="h-5 w-5 text-gold" /> Step 2: Set Printer IP & Port</h3>
              <p className="text-muted-foreground leading-relaxed">
                Enter the printer IP manually, or scan your subnet to auto-detect ESC/POS sockets on ports 9100, 9101, 515.
              </p>

              {/* Manual IP entry */}
              <div className="bg-background border border-border/60 rounded-2xl p-4 space-y-3">
                <span className="text-[10px] uppercase font-black text-muted-foreground tracking-wider block">Manual IP Configuration</span>
                <div className="flex gap-2 items-center">
                  <div className="flex-1">
                    <label className="text-[9px] uppercase font-black text-muted-foreground mb-1 block">IP Address</label>
                    <input
                      type="text"
                      value={selectedIp}
                      onChange={e => setSelectedIp(e.target.value)}
                      placeholder="e.g. 127.0.0.1"
                      className="w-full rounded-xl border border-border bg-muted/20 px-3 py-2 text-xs font-mono font-bold"
                    />
                  </div>
                  <div className="w-24">
                    <label className="text-[9px] uppercase font-black text-muted-foreground mb-1 block">Port</label>
                    <input
                      type="number"
                      value={selectedPort}
                      onChange={e => setSelectedPort(Number(e.target.value))}
                      className="w-full rounded-xl border border-border bg-muted/20 px-3 py-2 text-xs font-mono font-bold"
                    />
                  </div>
                </div>

                {/* Emulator quick-set */}
                <button
                  type="button"
                  onClick={() => { setSelectedIp("127.0.0.1"); setSelectedPort(9100); }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl border transition-all text-xs font-bold cursor-pointer ${
                    selectedIp === "127.0.0.1" && selectedPort === 9100
                      ? "border-gold bg-gold/10 text-gold"
                      : "border-amber-300/60 bg-amber-50/40 hover:bg-amber-50 text-amber-800"
                  }`}
                >
                  <span>⚡ Use Local ESC/POS Emulator</span>
                  <span className="font-mono text-[10px] bg-amber-100 px-2 py-0.5 rounded">127.0.0.1 : 9100</span>
                </button>
              </div>

              {/* Subnet scanner */}
              <div className="space-y-2">
                <span className="text-[10px] uppercase font-black text-muted-foreground tracking-wider block">Auto Subnet Scan</span>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={subnet}
                    onChange={e => setSubnet(e.target.value)}
                    placeholder="e.g. 192.168.1"
                    className="rounded-xl border border-border bg-background px-3 py-2.5 w-44"
                  />
                  <button
                    type="button"
                    onClick={handleScanSubnet}
                    disabled={scanning}
                    className="bg-brown-gradient text-cream px-5 py-2.5 rounded-xl font-bold uppercase tracking-wider flex items-center gap-1.5 active:scale-95 transition-all disabled:opacity-50"
                  >
                    <RefreshCw className={`h-4 w-4 ${scanning ? "animate-spin" : ""}`} />
                    {scanning ? "Sweeping Subnet..." : "Scan Subnet"}
                  </button>
                </div>
              </div>

              {discovered.length > 0 && (
                <div className="space-y-2 pt-2 animate-in fade-in">
                  <span className="text-[10px] uppercase font-black text-muted-foreground tracking-wider block">Discovered Thermal Ports</span>
                  <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto pr-1">
                    {discovered.map((dev, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setSelectedIp(dev.ip);
                          setSelectedPort(dev.port);
                        }}
                        className={`p-3 rounded-xl border text-left flex items-center justify-between transition-colors cursor-pointer ${
                          selectedIp === dev.ip && selectedPort === dev.port ? "border-gold bg-gold/5" : "border-border hover:bg-muted/30"
                        }`}
                      >
                        <span className="font-bold">{dev.ip}</span>
                        <span className="text-[10px] bg-muted px-2 py-0.5 rounded font-mono font-bold text-muted-foreground">Port {dev.port}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 2 && connection !== "lan" && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold flex items-center gap-2"><Check className="h-5 w-5 text-gold" /> Step 2: Skip Scanning</h3>
              <p className="text-muted-foreground leading-relaxed">
                Mock connection requires no subnet scanning. Click "Next" to configure profiles.
              </p>
            </div>
          )}

          {/* STEP 3: GENERAL SETTINGS */}
          {step === 3 && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold flex items-center gap-2"><Settings className="h-5 w-5 text-gold" /> Step 3: Configure Profiles</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] uppercase font-black text-muted-foreground mb-1">Printer Label Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="e.g. Counter Printer"
                    className="w-full rounded-xl border border-border bg-background p-2.5"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-black text-muted-foreground mb-1">Role assignment</label>
                  <select value={role} onChange={e => setRole(e.target.value as any)} className="w-full rounded-xl border border-border bg-background p-2.5">
                    <option value="billing">Customer Billing Receipts</option>
                    <option value="kitchen">Kitchen KOTs</option>
                    <option value="bar">Bar Drinks</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-black text-muted-foreground mb-1">Paper Roll Width</label>
                  <select value={paperWidth} onChange={e => setPaperWidth(e.target.value as any)} className="w-full rounded-xl border border-border bg-background p-2.5">
                    <option value="80mm">80mm (Standard)</option>
                    <option value="58mm">58mm (Narrow)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-black text-muted-foreground mb-1">Auto Cut Paper</label>
                  <select value={cutType} onChange={e => setCutType(e.target.value as any)} className="w-full rounded-xl border border-border bg-background p-2.5">
                    <option value="full">Full Cut</option>
                    <option value="partial">Partial Cut</option>
                    <option value="none">No Cut</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="logoEnabled"
                  checked={logoEnabled}
                  onChange={e => setLogoEnabled(e.target.checked)}
                  className="h-4 w-4 rounded border-border"
                />
                <label htmlFor="logoEnabled" className="cursor-pointer">Enable Header Logo Image Printing</label>
              </div>
            </div>
          )}

          {/* STEP 4: LOGO SETTINGS */}
          {step === 4 && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold flex items-center gap-2"><Image className="h-5 w-5 text-gold" /> Step 4: Fine-Tune Header Logo</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] uppercase font-black text-muted-foreground mb-1.5">Select Logo File (PNG/JPG)</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="w-full rounded-xl border border-border bg-background p-2"
                    />
                  </div>

                  {logoBase64 && (
                    <div className="space-y-2">
                      <div>
                        <label className="block text-[10px] uppercase font-black text-muted-foreground mb-1">Preset Mode</label>
                        <select value={preset} onChange={e => setPreset(e.target.value as DitherPreset)} className="w-full rounded-xl border border-border bg-background p-2">
                          <option value="Normal">Normal Gray</option>
                          <option value="Dark">High Intensity (Dark)</option>
                          <option value="High Contrast">High Contrast (Line Art)</option>
                          <option value="Logo">Dithered Logo (Floyd-Steinberg)</option>
                          <option value="Photo">Halftone Photo</option>
                          <option value="Custom">Custom Sliders</option>
                        </select>
                      </div>

                      {preset === "Custom" && (
                        <div className="space-y-2 pt-1">
                          <div>
                            <span className="flex justify-between text-[10px] text-muted-foreground font-black"><span>BRIGHTNESS</span><span>{brightness}</span></span>
                            <input type="range" min="-100" max="100" value={brightness} onChange={e => setBrightness(Number(e.target.value))} className="w-full accent-gold" />
                          </div>
                          <div>
                            <span className="flex justify-between text-[10px] text-muted-foreground font-black"><span>CONTRAST</span><span>{contrast}</span></span>
                            <input type="range" min="-100" max="100" value={contrast} onChange={e => setContrast(Number(e.target.value))} className="w-full accent-gold" />
                          </div>
                          <div>
                            <span className="flex justify-between text-[10px] text-muted-foreground font-black"><span>BLACK THRESHOLD</span><span>{threshold}</span></span>
                            <input type="range" min="0" max="255" value={threshold} onChange={e => setThreshold(Number(e.target.value))} className="w-full accent-gold" />
                          </div>
                          <div className="flex items-center gap-2">
                            <input type="checkbox" id="dither" checked={dither} onChange={e => setDither(e.target.checked)} className="rounded" />
                            <label htmlFor="dither">Dither Diffusion</label>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Canvas Monochrome Preview */}
                <div className="border border-border/60 bg-muted/20 rounded-2xl p-4 flex flex-col items-center justify-center min-h-[160px]">
                  <span className="text-[10px] uppercase font-black text-muted-foreground mb-3 tracking-wider block">Monochrome Raster Output</span>
                  {logoBase64 ? (
                    <div className="bg-white border p-3 rounded-lg shadow-inner max-h-36 overflow-auto">
                      <canvas ref={canvasRef} className="block select-none" />
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-[10px] font-bold text-center">Upload logo file to preview dithered bitmap.</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: RECEIPT PREVIEW */}
          {step === 5 && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold flex items-center gap-2"><Eye className="h-5 w-5 text-gold" /> Step 5: Document Preview</h3>
              <p className="text-muted-foreground leading-relaxed">
                Review the virtual layout of the generated receipt template. This renders the intermediate model to guarantee matching printed outputs.
              </p>
              
              <div className="bg-white border rounded-2xl p-5 font-mono text-[10px] text-slate-800 w-full max-w-[280px] mx-auto space-y-2 select-none shadow-sm">
                <div className="text-center font-bold uppercase">{name || "TEST PRINTER"}</div>
                <div className="text-center text-[8px] text-slate-500">PAAKASHALA PRINTER WIZARD</div>
                <div className="border-b border-dashed border-slate-300"></div>
                <div className="flex justify-between">
                  <span>Port IP:</span>
                  <span>{connection === "lan" ? selectedIp : "MOCK"}</span>
                </div>
                <div className="flex justify-between">
                  <span>Paper Width:</span>
                  <span>{paperWidth}</span>
                </div>
                <div className="flex justify-between">
                  <span>Paper Cut:</span>
                  <span>{cutType.toUpperCase()}</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span>TEST RESULTS:</span>
                  <span className="text-green-600">READY</span>
                </div>
                <div className="border-t border-dashed border-slate-300 pt-2 text-center text-[8px] text-slate-400">** TEST PREVIEW COPY **</div>
              </div>
            </div>
          )}

          {/* STEP 6: TEST PRINT & SAVE */}
          {step === 6 && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold flex items-center gap-2"><Printer className="h-5 w-5 text-gold" /> Step 6: Test print and save</h3>
              <p className="text-muted-foreground leading-relaxed">
                Always dispatch a physical test print to verify the configuration before saving. The "Save Printer" button will activate upon a successful test print cycle.
              </p>

              <div className="flex justify-center pt-4">
                <button
                  type="button"
                  onClick={handleTestPrint}
                  disabled={testingConnection}
                  className="bg-brown-gradient text-cream px-8 py-3.5 rounded-2xl font-black uppercase tracking-wider flex items-center gap-2 shadow-md active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
                >
                  <Printer className="h-5 w-5 text-gold" />
                  {testingConnection ? "Dispatching test print..." : "Dispatch Test Print"}
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer Controls */}
        <div className="px-6 py-4 bg-muted/20 border-t border-border shrink-0 flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              setStatusMsg(null);
              if (step > 1) {
                // If logo is disabled, step 4 can be skipped
                if (step === 5 && !logoEnabled) setStep(3);
                else setStep((step - 1) as any);
              }
            }}
            disabled={step === 1}
            className="border border-slate-200 bg-white hover:bg-slate-50 text-brown-deep px-4 py-2.5 rounded-xl font-bold uppercase tracking-wide flex items-center gap-1 active:scale-95 transition-all disabled:opacity-30 cursor-pointer text-xs"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </button>

          {step < 6 ? (
            <button
              type="button"
              onClick={() => {
                setStatusMsg(null);
                if (step === 2 && connection === "lan" && !selectedIp) {
                  setStatusMsg({ type: "error", text: "Select a discovered print endpoint IP address." });
                  return;
                }
                if (step === 3 && !name.trim()) {
                  setStatusMsg({ type: "error", text: "Printer label name is required." });
                  return;
                }
                
                // If logo printing is disabled, skip step 4
                if (step === 3 && !logoEnabled) setStep(5);
                else setStep((step + 1) as any);
              }}
              className="bg-brown-gradient text-cream px-5 py-2.5 rounded-xl font-bold uppercase tracking-wider flex items-center gap-1 shadow-sm active:scale-95 transition-all cursor-pointer text-xs"
            >
              Next <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSaveConfig}
              disabled={!testResultSuccess}
              className="bg-green-600 text-white hover:bg-green-700 px-6 py-2.5 rounded-xl font-bold uppercase tracking-widest shadow-sm active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer text-xs flex items-center gap-1.5"
            >
              <Check className="h-4.5 w-4.5" /> Save Printer Configuration
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
export default PrinterWizard;
