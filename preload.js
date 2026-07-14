const { contextBridge, ipcRenderer } = require("electron");

// Expose safe, typed interfaces to the React window context
contextBridge.exposeInMainWorld("systemAPI", {
  isElectron: () => true,
});

contextBridge.exposeInMainWorld("printerAPI", {
  printNetwork: (ip, port, payload) => ipcRenderer.invoke("print-network", { ip, port, payload }),
  scanLAN: (subnetPrefix) => ipcRenderer.invoke("scan-lan", { subnetPrefix }),
  getActiveSubnet: () => ipcRenderer.invoke("get-active-subnet"),
  saveLogoFile: (base64Data, filename) => ipcRenderer.invoke("save-logo-file", { base64Data, filename }),
  exportDiagnostics: (diagnosticsData) => ipcRenderer.invoke("export-printer-diagnostics", { diagnosticsData }),
  getSystemPrinters: () => ipcRenderer.invoke("get-system-printers"),
  printRaw: (printerName, payload) => ipcRenderer.invoke("print-raw", { printerName, payload }),
});

contextBridge.exposeInMainWorld("databaseAPI", {
  execute: (sql, params) => ipcRenderer.invoke("db-execute", { sql, params }),
  query: (sql, params) => ipcRenderer.invoke("db-query", { sql, params }),
  transaction: (queries) => ipcRenderer.invoke("db-transaction", { queries }),
  backup: () => ipcRenderer.invoke("db-backup"),
  restore: (backupPath) => ipcRenderer.invoke("db-restore", { backupPath }),
  vacuum: () => ipcRenderer.invoke("db-vacuum"),
  health: () => ipcRenderer.invoke("db-health"),
});
