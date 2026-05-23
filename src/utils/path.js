function normalizeText(value, fallback = "") {
	return typeof value === "string" ? value : fallback;
}

function sanitizeName(name) {
	const value = String(name || "").trim();
	return value ? value.replace(/[\\/\0]/g, "-").slice(0, 80) : "";
}

function normalizeRelativePath(relativePath) {
	return String(relativePath || "")
		.replace(/\\/g, "/")
		.split("/")
		.map(part => part.trim())
		.filter(Boolean)
		.join("/");
}

function getParentRelativePath(relativePath) {
	const normalized = normalizeRelativePath(relativePath);

	if (!normalized) {
		return "";
	}

	const parts = normalized.split("/");
	parts.pop();
	return parts.join("/");
}

function getNameFromRelativePath(relativePath) {
	const normalized = normalizeRelativePath(relativePath);

	if (!normalized) {
		return "";
	}

	const parts = normalized.split("/");
	return parts[parts.length - 1] || "";
}

function joinRelativePath(parentRelativePath, name) {
	const parent = normalizeRelativePath(parentRelativePath);
	const cleanName = sanitizeName(name);
	return parent ? `${parent}/${cleanName}` : cleanName;
}

module.exports = {
	normalizeText,
	sanitizeName,
	normalizeRelativePath,
	getParentRelativePath,
	getNameFromRelativePath,
	joinRelativePath,
};
