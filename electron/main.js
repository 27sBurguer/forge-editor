const path = require("path");
const { app, BrowserWindow, dialog, ipcMain, shell } = require("electron");
const { autoUpdater } = require("electron-updater");
const { startServer } = require("../server");

const APP_PORT = Number(process.env.FORGE_PORT || 3000);
const APP_HOST = "127.0.0.1";

let mainWindow = null;
let serverHandle = null;
let isQuitting = false;

function getAppUrl() {
	return `http://${APP_HOST}:${APP_PORT}`;
}

function configureAutoUpdater() {
	autoUpdater.autoDownload = true;
	autoUpdater.autoInstallOnAppQuit = true;

	autoUpdater.on("checking-for-update", () => {
		mainWindow?.webContents.send("forge:update-status", { status: "checking" });
	});

	autoUpdater.on("update-available", info => {
		mainWindow?.webContents.send("forge:update-status", { status: "available", version: info.version });
	});

	autoUpdater.on("update-not-available", info => {
		mainWindow?.webContents.send("forge:update-status", { status: "none", version: info.version });
	});

	autoUpdater.on("download-progress", progress => {
		mainWindow?.webContents.send("forge:update-status", {
			status: "downloading",
			percent: Math.round(progress.percent || 0),
		});
	});

	autoUpdater.on("error", error => {
		mainWindow?.webContents.send("forge:update-status", {
			status: "error",
			message: error && error.message ? error.message : String(error),
		});
	});

	autoUpdater.on("update-downloaded", async info => {
		mainWindow?.webContents.send("forge:update-status", { status: "downloaded", version: info.version });

		const result = await dialog.showMessageBox(mainWindow, {
			type: "info",
			title: "Forge update ready",
			message: `Forge ${info.version || "update"} is ready to install.`,
			detail: "Restart Forge now to finish the update.",
			buttons: ["Restart now", "Later"],
			defaultId: 0,
			cancelId: 1,
		});

		if (result.response === 0) {
			isQuitting = true;
			autoUpdater.quitAndInstall(false, true);
		}
	});
}

async function createWindow() {
	mainWindow = new BrowserWindow({
		width: 1320,
		height: 820,
		minWidth: 960,
		minHeight: 620,
		show: false,
		backgroundColor: "#0f0f0f",
		title: "Forge",
		autoHideMenuBar: true,
		webPreferences: {
			preload: path.join(__dirname, "preload.js"),
			contextIsolation: true,
			nodeIntegration: false,
			sandbox: false,
		},
	});

	mainWindow.once("ready-to-show", () => {
		mainWindow.show();
		if (app.isPackaged) {
			setTimeout(() => autoUpdater.checkForUpdatesAndNotify().catch(() => {}), 2500);
		}
	});

	mainWindow.on("close", event => {
		if (!isQuitting) {
			// Let the page warn about unsaved scripts if needed.
		}
	});

	mainWindow.webContents.setWindowOpenHandler(({ url }) => {
		shell.openExternal(url);
		return { action: "deny" };
	});

	await mainWindow.loadURL(getAppUrl());
}

async function boot() {
	const lock = app.requestSingleInstanceLock();

	if (!lock) {
		app.quit();
		return;
	}

	app.on("second-instance", () => {
		if (!mainWindow) return;
		if (mainWindow.isMinimized()) mainWindow.restore();
		mainWindow.focus();
	});

	try {
		serverHandle = await startServer({ port: APP_PORT, host: APP_HOST });
	} catch (error) {
		if (error && error.code === "EADDRINUSE") {
			const result = await dialog.showMessageBox({
				type: "warning",
				title: "Forge is already running",
				message: "Port 3000 is already in use.",
				detail: "If Forge is already open, this app will connect to it. If another program is using port 3000, close it and open Forge again.",
				buttons: ["Open anyway", "Quit"],
				defaultId: 0,
				cancelId: 1,
			});

			if (result.response !== 0) {
				app.quit();
				return;
			}
		} else {
			await dialog.showMessageBox({
				type: "error",
				title: "Forge failed to start",
				message: "Could not start the local Forge server.",
				detail: error && error.message ? error.message : String(error),
			});
			app.quit();
			return;
		}
	}

	configureAutoUpdater();
	await createWindow();
}

ipcMain.handle("forge:get-app-info", () => ({
	version: app.getVersion(),
	isPackaged: app.isPackaged,
	url: getAppUrl(),
	platform: process.platform,
}));

ipcMain.handle("forge:check-for-updates", async () => {
	if (!app.isPackaged) {
		return { ok: false, error: "Updates only run in packaged builds." };
	}

	try {
		const result = await autoUpdater.checkForUpdatesAndNotify();
		return { ok: true, result: !!result };
	} catch (error) {
		return { ok: false, error: error && error.message ? error.message : String(error) };
	}
});

app.whenReady().then(boot);

app.on("activate", () => {
	if (BrowserWindow.getAllWindows().length === 0) {
		createWindow().catch(() => {});
	}
});

app.on("window-all-closed", () => {
	if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => {
	isQuitting = true;
	if (serverHandle && serverHandle.server) {
		try { serverHandle.server.close(); } catch (error) {}
	}
});
