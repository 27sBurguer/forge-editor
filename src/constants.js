const path = require("path");

const ROOT_ORDER = [
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

const MAX_BODY_SIZE = 60_000_000;
const TRACKED_ROOTS = new Set(ROOT_ORDER);
const SCRIPT_CLASSES = new Set(["Script", "LocalScript", "ModuleScript"]);
const FOLDER_CLASSES = new Set(["Folder"]);
const CREATABLE_CLASSES = new Set(["Folder", "Script", "LocalScript", "ModuleScript"]);
const PUBLIC_DIR = path.resolve(__dirname, "..", "public");

module.exports = {
	ROOT_ORDER,
	MAX_BODY_SIZE,
	TRACKED_ROOTS,
	SCRIPT_CLASSES,
	FOLDER_CLASSES,
	CREATABLE_CLASSES,
	PUBLIC_DIR,
};
