const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("forgeDesktop", {
	getAppInfo: () => ipcRenderer.invoke("forge:get-app-info"),
	checkForUpdates: () => ipcRenderer.invoke("forge:check-for-updates"),	onUpdateStatus: callback => {
		const listener = (_event, payload) => callback(payload);
		ipcRenderer.on("forge:update-status", listener);
		return () => ipcRenderer.removeListener("forge:update-status", listener);
	},
});
