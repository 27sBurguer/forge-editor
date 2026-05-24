export const ROOT_ORDER = [
	"Workspace",
	"Players",
	"Lighting",
	"MaterialService",
	"NetworkClient",
	"ReplicatedFirst",
	"ReplicatedStorage",
	"ServerScriptService",
	"ServerStorage",
	"StarterGui",
	"StarterGui",
	"StarterPack",
	"StarterPlayer",
	"Teams",
	"SoundService",
	"TextChatService",
];

export const SCRIPT_CLASSES = ["Script", "LocalScript", "ModuleScript"];

export const CREATE_TYPES = [
	{ className: "Folder", icon: "folder", label: "Folder", defaultName: "Folder", description: "Group" },
	{ className: "Script", icon: "script", label: "Script", defaultName: "Script", description: "Server" },
	{ className: "LocalScript", icon: "localScript", label: "LocalScript", defaultName: "LocalScript", description: "Client" },
	{ className: "ModuleScript", icon: "module", label: "ModuleScript", defaultName: "Module", description: "Module" },
];

export const STORAGE = {
	sidebar: "Forge.SidebarWidth",
	expanded: "Forge.ExpandedNodes",
	settings: "Forge.EditorSettings",
	workspace: "Forge.WorkspaceState",
};

export const SESSION_STORAGE = {
	sessionId: "Forge.PrivateSessionId",
	secret: "Forge.PrivateSessionSecret",
};

export const DEFAULT_SETTINGS = {
	fontFamily: "JetBrains Mono, Cascadia Code, Fira Code, Consolas, monospace",
	fontSize: 14,
	autosaveMs: 3000,
	wordWrap: "off",
	editorTheme: "forge-dark",
	minimap: true,
};

export const FILES_POLL_INTERVAL = 3600;

export const APP_DOWNLOAD_URL = "https://github.com/27sBurguer/forge-editor/releases/latest/download/Forge-Setup.exe";

export const ROBLOX_PLUGIN_URL = "https://create.roblox.com/store/asset/110405258188669/Forge-Codex";
