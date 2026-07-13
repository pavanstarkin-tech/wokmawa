const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const net = require("net");
const fs = require("fs");
const os = require("os");

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 768,
    title: "Paakashala Restaurant OS",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Check if we are running in dev mode
  const isDev = process.argv.includes("--dev") || process.env.NODE_ENV === "development";

  if (isDev) {
    // Load local dev server
    mainWindow.loadURL("http://localhost:3000");
    mainWindow.webContents.openDevTools();
  } else {
    // Load built static assets
    mainWindow.loadFile(path.join(__dirname, "public_html", "index.html")).catch((err) => {
      console.error("Failed to load production index.html:", err);
      // Fallback: try loading from .output/public
      mainWindow.loadFile(path.join(__dirname, ".output", "public", "index.html")).catch((e) => {
        console.error("Double fallback failed:", e);
      });
    });
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
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
const dbAdapter = require("./BetterSQLiteAdapter");

try {
  dbAdapter.initialize();
  dbAdapter.healthCheck().then((res) => {
    console.log(`[MAIN] Database health integrity check: ${res.healthy ? "OK" : "CORRUPT: " + res.details}`);
  });
} catch (err) {
  console.error("[MAIN] Database load error:", err.message);
}

ipcMain.handle("db-execute", async (event, { sql, params }) => {
  return dbAdapter.execute(sql, params);
});

ipcMain.handle("db-query", async (event, { sql, params }) => {
  return dbAdapter.query(sql, params);
});

ipcMain.handle("db-transaction", async (event, { queries }) => {
  return dbAdapter.transaction(queries);
});

ipcMain.handle("db-backup", async () => {
  return dbAdapter.backup();
});

ipcMain.handle("db-restore", async (event, { backupPath }) => {
  return dbAdapter.restore(backupPath);
});

ipcMain.handle("db-vacuum", async () => {
  return dbAdapter.vacuum();
});

ipcMain.handle("db-health", async () => {
  return dbAdapter.healthCheck();
});
