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
});
