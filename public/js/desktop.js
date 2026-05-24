const DESKTOP_ROBLOX_PLUGIN_URL = "https://create.roblox.com/store/asset/110405258188669/Forge-Codex";

const ROBLOX_PLUGIN_URL = "https://create.roblox.com/store/asset/110405258188669/Forge-Codex";

function createRobloxPluginButton() {
	const button = document.createElement("a");
	button.id = "desktopRobloxPluginButton";
	button.className = "roblox-plugin-button";
	button.href = DESKTOP_ROBLOX_PLUGIN_URL;
	button.target = "_blank";
	button.rel = "noopener";
	button.textContent = "Roblox Plugin";
	return button;
}

function hideDesktopDownloadButton() {
	const downloadButton = document.getElementById("downloadAppButton");
	if (downloadButton) downloadButton.remove();
}

function createDesktopBadge(info) {
	const badge = document.createElement("button");
	badge.id = "desktopUpdateBadge";
	badge.className = "desktop-update-badge";
	badge.type = "button";
	badge.textContent = `App v${info.version}`;
	badge.title = "Check for Forge app updates";
	badge.addEventListener("click", async () => {
		badge.textContent = "Checking update...";
		const result = await window.forgeDesktop.checkForUpdates();
		if (!result || !result.ok) {
			badge.textContent = result && result.error ? result.error : `App v${info.version}`;
			setTimeout(() => { badge.textContent = `App v${info.version}`; }, 3200);
		}
	});
	return badge;
}

function setBadgeText(text) {
	const badge = document.getElementById("desktopUpdateBadge");
	if (badge) badge.textContent = text;
}

(async function bootDesktopIntegration() {
	if (!window.forgeDesktop) return;

	hideDesktopDownloadButton();

	try {
		const info = await window.forgeDesktop.getAppInfo();
		const actions = document.querySelector(".title-actions");
		if (actions) {
			hideDesktopDownloadButton();
			actions.prepend(createDesktopBadge(info));
			if (!document.getElementById("desktopRobloxPluginButton") && !document.getElementById("robloxPluginButton")) {
				actions.insertBefore(createRobloxPluginButton(), actions.children[1] || null);
			}
		}

		if (window.forgeDesktop.setDiscordActivity) {
			window.forgeDesktop.setDiscordActivity({
				details: "Building scripts with Forge",
				state: "Private compiler workspace",
			}).catch(() => {});
		}

		window.forgeDesktop.onUpdateStatus(payload => {
			if (!payload) return;
			if (payload.status === "checking") setBadgeText("Checking update...");
			if (payload.status === "available") setBadgeText(`Downloading ${payload.version || "update"}...`);
			if (payload.status === "downloading") setBadgeText(`Updating ${payload.percent || 0}%`);
			if (payload.status === "downloaded") setBadgeText(`Update ${payload.version || "ready"} ready`);
			if (payload.status === "none") setBadgeText(`App v${info.version}`);
			if (payload.status === "error") {
				setBadgeText("Update check failed");
				setTimeout(() => setBadgeText(`App v${info.version}`), 3000);
			}
		});
	} catch (error) {}
})();
