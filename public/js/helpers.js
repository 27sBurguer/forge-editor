import { SCRIPT_CLASSES } from "./config.js";

export function loadJson(key, fallback) {
	try {
		const raw = localStorage.getItem(key);
		return raw ? JSON.parse(raw) : fallback;
	} catch (error) {
		return fallback;
	}
}

export function saveJson(key, value) {
	try {
		localStorage.setItem(key, JSON.stringify(value));
	} catch (error) {}
}

export function clamp(number, min, max) {
	return Math.max(min, Math.min(max, number));
}

export function escapeHtml(value) {
	return String(value || "")
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#039;");
}

export function sanitizeName(value) {
	return String(value || "")
		.trim()
		.replace(/[\\/\0]/g, "-")
		.slice(0, 80);
}

export function getParentPath(relativePath) {
	const parts = String(relativePath || "").split("/").filter(Boolean);
	parts.pop();
	return parts.join("/");
}

export function getNameFromPath(relativePath) {
	const parts = String(relativePath || "").split("/").filter(Boolean);
	return parts[parts.length - 1] || "";
}

export function getFullPath(item) {
	return item.root + (item.relativePath ? "/" + item.relativePath : "");
}

export function isScriptClass(className) {
	return SCRIPT_CLASSES.includes(className);
}

export function isScriptItem(item) {
	return item && isScriptClass(item.className);
}

export function isInputLike(target) {
	if (!target) {
		return false;
	}

	const tag = String(target.tagName || "").toLowerCase();
	return tag === "input" || tag === "textarea" || target.isContentEditable;
}

export function sanitizeLuaIdentifier(value) {
	const clean = String(value || "Module").replace(/[^A-Za-z0-9_]/g, "");
	if (!clean) {
		return "Module";
	}

	return /^[0-9]/.test(clean) ? "Module" + clean : clean;
}

export function getDefaultSourceForClass(className, name) {
	if (className === "ModuleScript") {
		const variableName = sanitizeLuaIdentifier(name || "Module");
		return `local ${variableName} = {}\n\nreturn ${variableName}\n`;
	}

	if (className === "LocalScript") {
		return "local Players = game:GetService(\"Players\")\n\nlocal Player = Players.LocalPlayer\n\n";
	}

	if (className === "Script") {
		return `-- ${name || "Script"}\n\n`;
	}

	return "";
}
