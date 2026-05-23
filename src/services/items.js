const {
	ROOT_ORDER,
	TRACKED_ROOTS,
	SCRIPT_CLASSES,
	FOLDER_CLASSES,
} = require("../constants");
const { hashString } = require("../utils/hash");
const {
	normalizeText,
	sanitizeName,
	normalizeRelativePath,
	getParentRelativePath,
	getNameFromRelativePath,
	joinRelativePath,
} = require("../utils/path");

function isScriptClass(className) {
	return SCRIPT_CLASSES.has(className);
}

function isFolderClass(className) {
	return FOLDER_CLASSES.has(className);
}

function generateItemId(root, relativePath, className) {
	return "ITEM-" + hashString(`${root}|${normalizeRelativePath(relativePath)}|${className}|${Date.now()}|${Math.random()}`);
}

function getItemHash(file) {
	if (isScriptClass(file.className)) {
		return hashString(file.source || "");
	}

	return hashString(`${file.className}|${file.itemId || file.fileId}|${file.root}|${file.relativePath}`);
}

function normalizeUploadedFiles(files) {
	return files
		.map(file => {
			const className = normalizeText(file.className, "Instance");
			const root = normalizeText(file.root, "");
			const relativePath = normalizeRelativePath(file.relativePath);
			const name = sanitizeName(file.name) || getNameFromRelativePath(relativePath) || className;
			const source = isScriptClass(className) && typeof file.source === "string" ? file.source : "";
			const itemId = normalizeText(file.itemId || file.fileId, "") || generateItemId(root, relativePath, className);
			const parentItemId = normalizeText(file.parentItemId || file.ParentItemId, "");
			const parentRelativePath = normalizeRelativePath(file.parentRelativePath || getParentRelativePath(relativePath));
			const kind = isScriptClass(className) ? "script" : (isFolderClass(className) ? "folder" : "instance");

			return {
				fileId: itemId,
				itemId,
				parentItemId,
				name,
				className,
				kind,
				root,
				relativePath,
				parentRelativePath,
				source,
				sourceLength: source.length,
				sourceHash: normalizeText(file.sourceHash, "") || hashString(isScriptClass(className) ? source : `${className}|${itemId}|${root}|${relativePath}`),
				updatedAt: Date.now(),
			};
		})
		.filter(file => file.root && TRACKED_ROOTS.has(file.root) && file.relativePath && file.itemId);
}

function getPublicFiles(files) {
	return files.map(file => ({
		fileId: file.fileId,
		itemId: file.itemId || file.fileId,
		parentItemId: file.parentItemId || "",
		name: file.name,
		className: file.className,
		kind: file.kind || (isScriptClass(file.className) ? "script" : (isFolderClass(file.className) ? "folder" : "instance")),
		root: file.root,
		relativePath: file.relativePath,
		parentRelativePath: normalizeRelativePath(file.parentRelativePath || getParentRelativePath(file.relativePath)),
		sourceLength: typeof file.source === "string" ? file.source.length : 0,
		sourceHash: file.sourceHash || getItemHash(file),
		updatedAt: file.updatedAt || null,
	}));
}

function findItem(sessionData, itemId) {
	return sessionData.files.find(file => file.fileId === itemId || file.itemId === itemId) || null;
}

function findItemByPath(sessionData, root, relativePath) {
	const normalized = normalizeRelativePath(relativePath);
	return sessionData.files.find(file => file.root === root && file.relativePath === normalized) || null;
}

function findParentByPath(sessionData, root, parentRelativePath) {
	const normalized = normalizeRelativePath(parentRelativePath);

	if (!normalized) {
		return null;
	}

	return findItemByPath(sessionData, root, normalized);
}

function getParentItem(sessionData, root, parentRelativePath, parentItemId) {
	if (parentItemId) {
		const byId = findItem(sessionData, parentItemId);

		if (byId) {
			return byId;
		}
	}

	return findParentByPath(sessionData, root, parentRelativePath);
}

function assertValidParent(sessionData, root, parentRelativePath, parentItemId) {
	if (!TRACKED_ROOTS.has(root)) {
		return { ok: false, error: "Unsupported root: " + root };
	}

	if (!parentRelativePath && !parentItemId) {
		return { ok: true, parent: null };
	}

	const parent = getParentItem(sessionData, root, parentRelativePath, parentItemId);

	if (!parent) {
		return { ok: false, error: "Parent instance does not exist in the current Forge tree." };
	}

	return { ok: true, parent };
}

function pushChange(sessionData, change) {
	const revision = sessionData.nextRevision;
	sessionData.nextRevision += 1;

	const payload = {
		revision,
		createdAt: Date.now(),
		...change,
	};

	sessionData.changes.push(payload);

	if (sessionData.changes.length > 1500) {
		sessionData.changes = sessionData.changes.slice(-900);
	}

	return payload;
}

function getChildrenByParentId(sessionData, parentItemId) {
	return sessionData.files.filter(file => (file.parentItemId || "") === (parentItemId || ""));
}

function collectItemAndDescendants(sessionData, item) {
	const removed = [];
	const visited = new Set();
	const queue = [item];
	const oldPrefix = item.relativePath ? item.relativePath + "/" : "";

	while (queue.length > 0) {
		const current = queue.shift();

		if (!current || visited.has(current.fileId)) {
			continue;
		}

		visited.add(current.fileId);
		removed.push(current);

		for (const child of getChildrenByParentId(sessionData, current.fileId)) {
			queue.push(child);
		}
	}

	for (const file of sessionData.files) {
		if (visited.has(file.fileId)) {
			continue;
		}

		if (file.root === item.root && oldPrefix && file.relativePath.startsWith(oldPrefix)) {
			visited.add(file.fileId);
			removed.push(file);
		}
	}

	return { removed, ids: visited };
}

function removeItemAndDescendants(sessionData, item) {
	const collected = collectItemAndDescendants(sessionData, item);
	sessionData.files = sessionData.files.filter(file => !collected.ids.has(file.fileId));
	sessionData.filesCount = sessionData.files.length;
	return collected.removed;
}

function updateDescendantPaths(sessionData, parentItem) {
	const children = getChildrenByParentId(sessionData, parentItem.fileId);

	for (const child of children) {
		child.root = parentItem.root;
		child.parentRelativePath = parentItem.relativePath;
		child.relativePath = joinRelativePath(parentItem.relativePath, child.name);
		child.updatedAt = Date.now();
		updateDescendantPaths(sessionData, child);
	}
}

function isDescendantOf(sessionData, item, ancestorItemId) {
	let cursor = item;
	const visited = new Set();

	while (cursor && cursor.parentItemId) {
		if (cursor.parentItemId === ancestorItemId) {
			return true;
		}

		if (visited.has(cursor.parentItemId)) {
			return false;
		}

		visited.add(cursor.parentItemId);
		cursor = findItem(sessionData, cursor.parentItemId);
	}

	return false;
}

function createLocalItem({ className, name, root, parentRelativePath, parentItemId, source }) {
	const relativePath = joinRelativePath(parentRelativePath, name);
	const itemId = generateItemId(root, relativePath, className);
	const itemSource = isScriptClass(className) && typeof source === "string" ? source : "";

	return {
		fileId: itemId,
		itemId,
		parentItemId,
		name,
		className,
		kind: isScriptClass(className) ? "script" : "folder",
		root,
		relativePath,
		parentRelativePath,
		source: itemSource,
		sourceLength: itemSource.length,
		sourceHash: hashString(isScriptClass(className) ? itemSource : `${className}|${itemId}|${root}|${relativePath}`),
		updatedAt: Date.now(),
	};
}

module.exports = {
	ROOT_ORDER,
	isScriptClass,
	normalizeUploadedFiles,
	getPublicFiles,
	findItem,
	assertValidParent,
	pushChange,
	removeItemAndDescendants,
	updateDescendantPaths,
	isDescendantOf,
	createLocalItem,
};
