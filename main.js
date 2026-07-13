const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const net = require("net");

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

// IPC Handler for LAN Scanning (Find open port 9100 printers on the local network)
ipcMain.handle("scan-lan", async (event, { subnetPrefix }) => {
  // e.g. subnetPrefix = "192.168.1"
  return new Promise((resolve) => {
    const activePrinters = [];
    const scanPromises = [];

    // Scan IPs from .1 to .254
    for (let i = 1; i <= 254; i++) {
      const ip = `${subnetPrefix}.${i}`;
      
      const p = new Promise((resolveIp) => {
        const socket = new net.Socket();
        socket.setTimeout(250); // Fast timeout for responsiveness

        socket.connect(9100, ip, () => {
          activePrinters.push(ip);
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
    }

    Promise.all(scanPromises).then(() => {
      resolve(activePrinters);
    });
  });
});
