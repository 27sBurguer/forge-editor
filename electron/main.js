const path = require("path");
const { app, BrowserWindow, dialog, ipcMain, shell } = require("electron");
const { autoUpdater } = require("electron-updater");
const { startServer } = require("../server");

let DiscordRPC = null;
try {
	DiscordRPC = require("discord-rpc");
} catch (error) {
	DiscordRPC = null;
}

const APP_PORT = Number(process.env.FORGE_PORT || 3000);
const APP_HOST = "127.0.0.1";
const APP_ICON_PATH = path.join(__dirname, "..", "public", "assets", "cloud-icon.png");
const DISCORD_CLIENT_ID = "1507948057289822229";
const DISCORD_LARGE_IMAGE_KEY = "cloud_logo";
const FORGE_WEB_URL = "https://forge-editor.onrender.com";
const FORGE_DOWNLOAD_URL = "https://github.com/27sBurguer/forge-editor/releases/latest";
const ROBLOX_PLUGIN_URL = "https://create.roblox.com/store/asset/110405258188669/Forge-Codex";
const activityStartedAt = new Date();

let mainWindow = null;
let serverHandle = null;
let isQuitting = false;
let discordClient = null;
let discordReady = false;
let queuedDiscordActivity = null;
let lastDiscordSignature = "";

function getAppUrl() {
	return `http://${APP_HOST}:${APP_PORT}`;
}


function sanitizePresenceText(value, fallback, maxLength = 128) {
	const text = String(value || fallback || "Cloud").replace(/\s+/g, " ").trim();
	return text.length > maxLength ? text.slice(0, maxLength - 1) + "…" : text;
}

function buildDiscordActivity(payload = {}) {
	return {
		details: sanitizePresenceText(payload.details, "Using Cloud"),
		state: sanitizePresenceText(payload.state, "Private IDE workspace"),
		largeImageKey: DISCORD_LARGE_IMAGE_KEY,
		largeImageText: "Cloud",
		startTimestamp: activityStartedAt,
		instance: false,
		buttons: [
			{ label: "Open Cloud", url: FORGE_WEB_URL },
			{ label: "Plugin", url: ROBLOX_PLUGIN_URL },
		],
	};
}

async function setDiscordPresence(payload = {}) {
	queuedDiscordActivity = payload;

	if (!discordClient || !discordReady) {
		return { ok: false, queued: true };
	}

	const activity = buildDiscordActivity(payload);
	const signature = JSON.stringify(activity);

	if (signature === lastDiscordSignature) {
		return { ok: true, skipped: true };
	}

	lastDiscordSignature = signature;

	try {
		await discordClient.setActivity(activity);
		return { ok: true };
	} catch (error) {
		return { ok: false, error: error && error.message ? error.message : String(error) };
	}
}

function initializeDiscordPresence() {
	if (!DiscordRPC) return;

	try {
		DiscordRPC.register(DISCORD_CLIENT_ID);
		discordClient = new DiscordRPC.Client({ transport: "ipc" });

		discordClient.on("ready", () => {
			discordReady = true;
			setDiscordPresence(queuedDiscordActivity || {
				details: "Using Cloud",
				state: "Private IDE workspace",
			}).catch(() => {});
		});

		discordClient.login({ clientId: DISCORD_CLIENT_ID }).catch(() => {
			discordReady = false;
		});
	} catch (error) {
		discordReady = false;
	}
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
			title: "Cloud update ready",
			message: `Cloud ${info.version || "update"} is ready to install.`,
			detail: "Restart Cloud now to finish the update.",
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
		title: "Cloud",
		icon: APP_ICON_PATH,
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
				title: "Cloud is already running",
				message: "Port 3000 is already in use.",
				detail: "If Cloud is already open, this app will connect to it. If another program is using port 3000, close it and open Cloud again.",
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
				title: "Cloud failed to start",
				message: "Could not start the local Cloud server.",
				detail: error && error.message ? error.message : String(error),
			});
			app.quit();
			return;
		}
	}

	initializeDiscordPresence();
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

ipcMain.handle("forge:set-discord-activity", async (_event, activity) => {
	return setDiscordPresence(activity || {});
});

app.setAppUserModelId("com.forge.editor");

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
	if (discordClient && discordReady) {
		try { discordClient.clearActivity(); } catch (error) {}
	}

	if (serverHandle && serverHandle.server) {
		try { serverHandle.server.close(); } catch (error) {}
	}
});
