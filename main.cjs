const { app, BrowserWindow, ipcMain, dialog, protocol, net: electronNet } = require("electron");
const path = require("path");
const net = require("net");
const fs = require("fs");
const os = require("os");
const { pathToFileURL } = require("url");

// Register custom privileged scheme
protocol.registerSchemesAsPrivileged([
  {
    scheme: "app",
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      bypassCSP: true
    }
  }
]);

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 768,
    title: "Paakashala Restaurant OS",
    icon: path.join(__dirname, "public_html", "logo-new.png"),
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Check if we are running in dev mode
  const isDev = process.argv.includes("--dev") || process.env.NODE_ENV === "development";
  const devPort = process.env.VITE_PORT || 8081;

  if (isDev) {
    // Retry loading the Vite dev server — it may take a moment to start
    const devUrl = `http://localhost:${devPort}/admin/login`;
    const tryLoad = (retriesLeft) => {
      mainWindow.loadURL(devUrl).catch((err) => {
        if (retriesLeft > 0) {
          console.log(`[Electron] Vite not ready yet, retrying in 1s... (${retriesLeft} retries left)`);
          setTimeout(() => tryLoad(retriesLeft - 1), 1000);
        } else {
          console.error("[Electron] Could not connect to Vite dev server at", devUrl, err.message);
          dialog.showErrorBox(
            "Dev Server Not Running",
            `Could not connect to Vite at ${devUrl}.\n\nMake sure "npm run dev" is running in another terminal first, then retry.`
          );
        }
      });
    };
    tryLoad(10);
    mainWindow.webContents.openDevTools();
  } else {
    // Load built static assets via our custom protocol, directing straight to the admin portal
    mainWindow.loadURL("app://app/admin/login").catch((err) => {
      console.error("Failed to load production index.html:", err);
    });
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  // Handle custom 'app' protocol to serve build directory
  protocol.handle("app", (request) => {
    try {
      const urlObj = new URL(request.url);
      let filePath = decodeURIComponent(urlObj.pathname);
      
      // Resolve path within public_html
      let absolutePath = path.join(__dirname, "public_html", filePath);
      
      // If file doesn't exist, fall back to index.html for SPA routing
      if (!fs.existsSync(absolutePath) || fs.statSync(absolutePath).isDirectory()) {
        absolutePath = path.join(__dirname, "public_html", "index.html");
      }
      
      return electronNet.fetch(pathToFileURL(absolutePath).toString());
    } catch (err) {
      console.error("Custom protocol error:", err);
      const indexFallback = path.join(__dirname, "public_html", "index.html");
      return electronNet.fetch(pathToFileURL(indexFallback).toString());
    }
  });

  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

// IPC Handler for Network ESC/POS Printing
ipcMain.handle("print-network", async (event, { ip, port = 9100, payload }) => {
  return new Promise((resolve) => {
    const client = new net.Socket();
    let isResolved = false;

    // Timeout after 4 seconds
    client.setTimeout(4000);

    client.connect(port, ip, () => {
      // payload comes in as a Uint8Array / Buffer
      const buffer = Buffer.from(payload);
      client.write(buffer, () => {
        client.end();
        if (!isResolved) {
          isResolved = true;
          resolve({ success: true });
        }
      });
    });

    client.on("error", (err) => {
      console.error(`Printer connection error on ${ip}:${port} -`, err.message);
      client.destroy();
      if (!isResolved) {
        isResolved = true;
        resolve({ success: false, error: err.message });
      }
    });

    client.on("timeout", () => {
      console.error(`Printer connection timeout on ${ip}:${port}`);
      client.destroy();
      if (!isResolved) {
        isResolved = true;
        resolve({ success: false, error: "Connection timed out" });
      }
    });
  });
});

function getSubnetPrefix() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === "IPv4" && !iface.internal) {
        const parts = iface.address.split(".");
        if (parts.length === 4) {
          return `${parts[0]}.${parts[1]}.${parts[2]}`;
        }
      }
    }
  }
  return "192.168.1";
}

// IPC Handler to get the active subnet
ipcMain.handle("get-active-subnet", async () => {
  return getSubnetPrefix();
});

// IPC Handler for LAN Scanning (Find open raw thermal ports on subnet)
ipcMain.handle("scan-lan", async (event, { subnetPrefix }) => {
  const prefix = subnetPrefix || getSubnetPrefix();
  const ports = [9100, 9101, 515];
  return new Promise((resolve) => {
    const activePrinters = [];
    const scanPromises = [];

    for (let i = 1; i <= 254; i++) {
      const ip = `${prefix}.${i}`;
      ports.forEach((port) => {
        const p = new Promise((resolveIp) => {
          const socket = new net.Socket();
          socket.setTimeout(250); // Fast timeout for responsive scans

          socket.connect(port, ip, () => {
            activePrinters.push({ ip, port });
            socket.destroy();
            resolveIp();
          });

          socket.on("error", () => {
            socket.destroy();
            resolveIp();
          });

          socket.on("timeout", () => {
            socket.destroy();
            resolveIp();
          });
        });
        scanPromises.push(p);
      });
    }

    Promise.all(scanPromises).then(() => {
      resolve(activePrinters);
    });
  });
});

// IPC Handler to save logo files with unique names in userData directory
ipcMain.handle("save-logo-file", async (event, { base64Data, filename }) => {
  try {
    const assetsDir = path.join(app.getPath("userData"), "assets");
    if (!fs.existsSync(assetsDir)) {
      fs.mkdirSync(assetsDir, { recursive: true });
    }
    const cleanFilename = filename.replace(/[^a-zA-Z0-9.\-_]/g, "_");
    const filePath = path.join(assetsDir, cleanFilename);
    const buffer = Buffer.from(base64Data, "base64");
    fs.writeFileSync(filePath, buffer);
    return { success: true, logoPath: filePath };
  } catch (err) {
    console.error("Failed to save logo file:", err);
    return { success: false, error: err.message };
  }
});

// IPC Handler to export printer diagnostic reports
ipcMain.handle("export-printer-diagnostics", async (event, { diagnosticsData }) => {
  try {
    const { filePath } = await dialog.showSaveDialog(mainWindow, {
      title: "Export Printer Diagnostics",
      defaultPath: path.join(app.getPath("downloads"), `printer-diagnostics-${Date.now()}.json`),
      filters: [{ name: "JSON Files", extensions: ["json"] }]
    });

    if (!filePath) {
      return { success: false, error: "Save cancelled" };
    }

    fs.writeFileSync(filePath, JSON.stringify(diagnosticsData, null, 2), "utf-8");
    return { success: true, filePath };
  } catch (err) {
    console.error("Failed to export diagnostics:", err);
    return { success: false, error: err.message };
  }
});

// --- Phase 3 SQLite database operations ---
let dbAdapter = null;
try {
  dbAdapter = require("./BetterSQLiteAdapter.cjs");
  dbAdapter.initialize();
  dbAdapter.healthCheck().then((res) => {
    console.log(`[MAIN] Database health integrity check: ${res.healthy ? "OK" : "CORRUPT: " + res.details}`);
  });
} catch (err) {
  console.error("[MAIN] Database adapter failed to load (better-sqlite3 may need rebuild):", err.message);
  console.error("[MAIN] Run: ./node_modules/.bin/electron-rebuild -f -w better-sqlite3");
}

const dbNotAvailable = { error: "SQLite not available. Run: npm run rebuild-sqlite" };

ipcMain.handle("db-execute", async (event, { sql, params }) => {
  if (!dbAdapter) return dbNotAvailable;
  return dbAdapter.execute(sql, params);
});

ipcMain.handle("db-query", async (event, { sql, params }) => {
  if (!dbAdapter) return [];
  return dbAdapter.query(sql, params);
});

ipcMain.handle("db-transaction", async (event, { queries }) => {
  if (!dbAdapter) return dbNotAvailable;
  return dbAdapter.transaction(queries);
});

ipcMain.handle("db-backup", async () => {
  if (!dbAdapter) return dbNotAvailable;
  return dbAdapter.backup();
});

ipcMain.handle("db-restore", async (event, { backupPath }) => {
  if (!dbAdapter) return dbNotAvailable;
  return dbAdapter.restore(backupPath);
});

ipcMain.handle("db-vacuum", async () => {
  if (!dbAdapter) return dbNotAvailable;
  return dbAdapter.vacuum();
});

ipcMain.handle("db-health", async () => {
  if (!dbAdapter) return { healthy: false, details: "SQLite adapter not loaded" };
  return dbAdapter.healthCheck();
});

const { exec } = require("child_process");

ipcMain.handle("get-system-printers", async () => {
  if (!mainWindow) return [];
  try {
    return await mainWindow.webContents.getPrintersAsync();
  } catch (err) {
    console.error("Failed to get system printers:", err);
    return [];
  }
});

ipcMain.handle("print-raw", async (event, { printerName, payload }) => {
  return new Promise((resolve) => {
    try {
      const tempFile = path.join(os.tmpdir(), `print_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.bin`);
      const buffer = Buffer.from(payload);
      fs.writeFileSync(tempFile, buffer);

      // PowerShell script to send raw bytes to a named printer using Win32 API
      const psScript = `
$printerName = "${printerName}"
$filePath = "${tempFile.replace(/\\/g, '\\\\')}"

$code = @"
using System;
using System.Runtime.InteropServices;

public class RawPrinterHelper {
    [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Ansi)]
    public class DOCINFOA {
        [MarshalAs(UnmanagedType.LPStr)] public string pDocName;
        [MarshalAs(UnmanagedType.LPStr)] public string pOutputFile;
        [MarshalAs(UnmanagedType.LPStr)] public string pDataType;
    }
    [DllImport("winspool.Drv", EntryPoint="OpenPrinterA", SetLastError=true, CharSet=CharSet.Ansi, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
    public static extern bool OpenPrinter([MarshalAs(UnmanagedType.LPStr)] string szPrinter, out IntPtr hPrinter, IntPtr pd);

    [DllImport("winspool.Drv", EntryPoint="ClosePrinter", SetLastError=true, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
    public static extern bool ClosePrinter(IntPtr hPrinter);

    [DllImport("winspool.Drv", EntryPoint="StartDocPrinterA", SetLastError=true, SetLastError=true, CharSet=CharSet.Ansi, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
    public static extern bool StartDocPrinter(IntPtr hPrinter, Int32 level, [In, MarshalAs(UnmanagedType.LPStruct)] DOCINFOA di);

    [DllImport("winspool.Drv", EntryPoint="EndDocPrinter", SetLastError=true, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
    public static extern bool EndDocPrinter(IntPtr hPrinter);

    [DllImport("winspool.Drv", EntryPoint="StartPagePrinter", SetLastError=true, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
    public static extern bool StartPagePrinter(IntPtr hPrinter);

    [DllImport("winspool.Drv", EntryPoint="EndPagePrinter", SetLastError=true, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
    public static extern bool EndPagePrinter(IntPtr hPrinter);

    [DllImport("winspool.Drv", EntryPoint="WritePrinter", SetLastError=true, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
    public static extern bool WritePrinter(IntPtr hPrinter, IntPtr pBytes, Int32 dwCount, out Int32 dwWritten);

    public static bool SendBytesToPrinter(string szPrinterName, byte[] bytes) {
        IntPtr hPrinter = new IntPtr(0);
        DOCINFOA di = new DOCINFOA();
        bool bSuccess = false;
        di.pDocName = "Paakashala Receipt";
        di.pDataType = "RAW";

        if (OpenPrinter(szPrinterName, out hPrinter, IntPtr.Zero)) {
            if (StartDocPrinter(hPrinter, 1, di)) {
                if (StartPagePrinter(hPrinter)) {
                    IntPtr pUnmanagedBytes = Marshal.AllocCoTaskMem(bytes.Length);
                    Marshal.Copy(bytes, 0, pUnmanagedBytes, bytes.Length);
                    Int32 dwWritten = 0;
                    bSuccess = WritePrinter(hPrinter, pUnmanagedBytes, bytes.Length, out dwWritten);
                    Marshal.FreeCoTaskMem(pUnmanagedBytes);
                    EndPagePrinter(hPrinter);
                }
                EndDocPrinter(hPrinter);
            }
            ClosePrinter(hPrinter);
        }
        return bSuccess;
    }
}
"@

# Check if type is already added in this session to prevent compilation errors
if (-not ([System.Management.Automation.PSTypeName]"RawPrinterHelper").Type) {
    Add-Type -TypeDefinition $code -ErrorAction SilentlyContinue
}

$bytes = [System.IO.File]::ReadAllBytes($filePath)
$result = [RawPrinterHelper]::SendBytesToPrinter($printerName, $bytes)
Write-Output $result
`;

      const command = `powershell -NoProfile -ExecutionPolicy Bypass -Command "${psScript.replace(/"/g, '\\"').replace(/\n/g, ' ')}"`;
      
      exec(command, (error, stdout, stderr) => {
        // Clean up temp file
        try { fs.unlinkSync(tempFile); } catch(e){}

        if (error) {
          console.error("Print raw error:", error, stderr);
          resolve({ success: false, error: error.message });
        } else {
          const success = stdout.trim() === "True";
          resolve({ success, error: success ? undefined : "Failed to send bytes to printer spooler. Is the printer name correct?" });
        }
      });
    } catch (err) {
      resolve({ success: false, error: err.message });
    }
  });
});
