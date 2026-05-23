const { ROOT_ORDER, CREATABLE_CLASSES } = require("../constants");
const { hashString } = require("../utils/hash");
const {
	sendOptions,
	sendJson,
	sendStaticFile,
	readBody,
	getSessionHeaders,
} = require("../utils/http");
const {
	normalizeText,
	sanitizeName,
	normalizeRelativePath,
	getParentRelativePath,
	joinRelativePath,
} = require("../utils/path");
const { getSession, setSession } = require("../services/store");
const {
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
} = require("../services/items");

function getAuthorizedSession(req, res, sessionId) {
	const sessionData = getSession(sessionId);

	if (!sessionData) {
		sendJson(res, 404, { ok: false, error: "Session not found", sessionId });
		return null;
	}

	const headers = getSessionHeaders(req);

	if (!headers.secret) {
		sendJson(res, 401, { ok: false, error: "Missing X-Forge-Secret header." });
		return null;
	}

	if (sessionData.secret && headers.secret !== sessionData.secret) {
		sendJson(res, 403, { ok: false, error: "Invalid session secret." });
		return null;
	}

	if (headers.sessionId && headers.sessionId !== sessionId) {
		sendJson(res, 403, { ok: false, error: "Session header does not match route session." });
		return null;
	}

	return sessionData;
}

function protectRecentlySavedSources(uploadedFiles, existingSession) {
	const now = Date.now();
	const protectedSources = existingSession && existingSession.protectedSources && typeof existingSession.protectedSources === "object"
		? existingSession.protectedSources
		: {};

	for (const key of Object.keys(protectedSources)) {
		if (!protectedSources[key] || protectedSources[key].until <= now) {
			delete protectedSources[key];
		}
	}

	for (const file of uploadedFiles) {
		const protection = protectedSources[file.fileId] || protectedSources[file.itemId];

		if (!protection || protection.until <= now || !isScriptClass(file.className)) {
			continue;
		}

		file.source = protection.source;
		file.sourceLength = protection.source.length;
		file.sourceHash = protection.sourceHash;
		file.updatedAt = Math.max(file.updatedAt || 0, protection.updatedAt || now);
	}

	return protectedSources;
}

async function handleSessionUpload(req, res) {
	const headers = getSessionHeaders(req);
	const body = await readBody(req);

	if (!headers.sessionId) {
		sendJson(res, 400, { ok: false, error: "Missing X-Forge-Session header" });
		return;
	}

	if (!headers.secret) {
		sendJson(res, 400, { ok: false, error: "Missing X-Forge-Secret header" });
		return;
	}

	if (!body || !Array.isArray(body.files)) {
		sendJson(res, 400, { ok: false, error: "Invalid upload body. Expected files array." });
		return;
	}

	const existingSession = getSession(headers.sessionId);

	if (existingSession && existingSession.secret && existingSession.secret !== headers.secret) {
		sendJson(res, 403, { ok: false, error: "Invalid session secret." });
		return;
	}

	const uploadedFiles = normalizeUploadedFiles(body.files);
	const protectedSources = protectRecentlySavedSources(uploadedFiles, existingSession);
	const sessionData = {
		sessionId: headers.sessionId,
		secret: headers.secret,
		uploadedAt: Date.now(),
		filesCount: uploadedFiles.length,
		files: uploadedFiles,
		changes: existingSession && Array.isArray(existingSession.changes) ? existingSession.changes : [],
		nextRevision: existingSession && Number.isFinite(existingSession.nextRevision) ? existingSession.nextRevision : 1,
		protectedSources,
	};

	setSession(headers.sessionId, sessionData);
	console.log("[Forge API] Session uploaded:", headers.sessionId, "Items:", uploadedFiles.length);
	sendJson(res, 200, {
		ok: true,
		sessionId: headers.sessionId,
		filesCount: uploadedFiles.length,
		uploadedAt: sessionData.uploadedAt,
	});
}

function sendSessionFiles(req, res, sessionId) {
	const sessionData = getAuthorizedSession(req, res, sessionId);
	if (!sessionData) return;

	sendJson(res, 200, {
		ok: true,
		sessionId,
		filesCount: sessionData.filesCount,
		uploadedAt: sessionData.uploadedAt,
		rootOrder: ROOT_ORDER,
		files: getPublicFiles(sessionData.files),
	});
}

async function createItem(req, res, sessionId) {
	const sessionData = getAuthorizedSession(req, res, sessionId);
	if (!sessionData) return;

	const body = await readBody(req);
	const className = normalizeText(body && body.className, "");
	const name = sanitizeName(body && body.name);
	const root = normalizeText(body && body.root, "ServerScriptService");
	const parentRelativePath = normalizeRelativePath(body && body.parentRelativePath);
	const parentItemId = normalizeText(body && body.parentItemId, "");

	if (!CREATABLE_CLASSES.has(className)) {
		sendJson(res, 400, { ok: false, error: "Unsupported className: " + className });
		return;
	}

	if (!name) {
		sendJson(res, 400, { ok: false, error: "Name is required." });
		return;
	}

	const parentCheck = assertValidParent(sessionData, root, parentRelativePath, parentItemId);

	if (!parentCheck.ok) {
		sendJson(res, 400, { ok: false, error: parentCheck.error });
		return;
	}

	const item = createLocalItem({
		className,
		name,
		root,
		parentRelativePath,
		parentItemId,
		source: body && typeof body.source === "string" ? body.source : "",
	});

	sessionData.files.push(item);
	sessionData.filesCount = sessionData.files.length;

	const change = pushChange(sessionData, {
		type: "createInstance",
		fileId: item.fileId,
		itemId: item.itemId,
		name: item.name,
		className: item.className,
		kind: item.kind,
		root: item.root,
		relativePath: item.relativePath,
		parentRelativePath: item.parentRelativePath,
		parentItemId,
		source: item.source,
		sourceHash: item.sourceHash,
	});

	console.log("[Forge API] Item created:", `${root}/${item.relativePath}`, "Revision:", change.revision);
	sendJson(res, 200, { ok: true, sessionId, item: getPublicFiles([item])[0], revision: change.revision });
}

function sendSource(req, res, sessionId, fileId) {
	const sessionData = getAuthorizedSession(req, res, sessionId);
	if (!sessionData) return;

	const file = findItem(sessionData, fileId);

	if (!file) {
		sendJson(res, 404, { ok: false, error: "File not found", fileId });
		return;
	}

	if (!isScriptClass(file.className)) {
		sendJson(res, 400, { ok: false, error: "Selected item is not a script." });
		return;
	}

	sendJson(res, 200, {
		ok: true,
		sessionId,
		fileId: file.fileId,
		name: file.name,
		className: file.className,
		root: file.root,
		relativePath: file.relativePath,
		source: file.source || "",
		sourceLength: typeof file.source === "string" ? file.source.length : 0,
		sourceHash: file.sourceHash || hashString(file.source || ""),
	});
}

async function saveSource(req, res, sessionId, fileId) {
	const sessionData = getAuthorizedSession(req, res, sessionId);
	if (!sessionData) return;

	const body = await readBody(req);

	if (!body || typeof body.source !== "string") {
		sendJson(res, 400, { ok: false, error: "Invalid save body. Expected source string." });
		return;
	}

	const file = findItem(sessionData, fileId);

	if (!file) {
		sendJson(res, 404, { ok: false, error: "File not found", fileId });
		return;
	}

	if (!isScriptClass(file.className)) {
		sendJson(res, 400, { ok: false, error: "Cannot save source for non-script item." });
		return;
	}


	file.source = body.source;
	file.sourceLength = body.source.length;
	file.sourceHash = hashString(body.source);
	file.updatedAt = Date.now();

	sessionData.protectedSources = sessionData.protectedSources && typeof sessionData.protectedSources === "object"
		? sessionData.protectedSources
		: {};
	sessionData.protectedSources[file.fileId] = {
		source: file.source,
		sourceHash: file.sourceHash,
		updatedAt: file.updatedAt,
		until: Date.now() + 25000,
	};

	const change = pushChange(sessionData, {
		type: "updateSource",
		fileId: file.fileId,
		itemId: file.itemId || file.fileId,
		root: file.root,
		relativePath: file.relativePath,
		source: file.source,
		sourceHash: file.sourceHash,
	});

	console.log("[Forge API] Source saved:", `${file.root}/${file.relativePath}`, "Revision:", change.revision);
	sendJson(res, 200, {
		ok: true,
		sessionId,
		fileId,
		revision: change.revision,
		sourceLength: file.sourceLength,
		sourceHash: file.sourceHash,
	});
}

async function moveItem(req, res, sessionId, fileId) {
	const sessionData = getAuthorizedSession(req, res, sessionId);
	if (!sessionData) return;

	const item = findItem(sessionData, fileId);

	if (!item) {
		sendJson(res, 404, { ok: false, error: "Item not found", fileId });
		return;
	}

	const body = await readBody(req);
	const targetRoot = normalizeText(body && body.root, item.root);
	const targetParentRelativePath = normalizeRelativePath(body && body.parentRelativePath);
	const parentItemId = normalizeText(body && body.parentItemId, "");
	const newName = sanitizeName(body && body.name) || item.name;

	const parentCheck = assertValidParent(sessionData, targetRoot, targetParentRelativePath, parentItemId);

	if (!parentCheck.ok) {
		sendJson(res, 400, { ok: false, error: parentCheck.error });
		return;
	}

	let cursor = parentItemId ? findItem(sessionData, parentItemId) : null;

	while (cursor) {
		if (cursor.fileId === item.fileId) {
			sendJson(res, 400, { ok: false, error: "Cannot move an item inside itself or one of its descendants." });
			return;
		}

		cursor = cursor.parentItemId ? findItem(sessionData, cursor.parentItemId) : null;
	}

	const newRelativePath = joinRelativePath(targetParentRelativePath, newName);
	const oldRoot = item.root;
	const oldPath = item.relativePath;
	const moved = [item];

	item.root = targetRoot;
	item.name = newName;
	item.relativePath = newRelativePath;
	item.parentRelativePath = targetParentRelativePath;
	item.parentItemId = parentItemId;
	item.updatedAt = Date.now();

	updateDescendantPaths(sessionData, item);

	for (const file of sessionData.files) {
		if (file.fileId !== item.fileId && isDescendantOf(sessionData, file, item.fileId)) {
			moved.push(file);
		}
	}

	const change = pushChange(sessionData, {
		type: "moveInstance",
		fileId: item.fileId,
		itemId: item.itemId || item.fileId,
		name: item.name,
		className: item.className,
		fromRoot: oldRoot,
		fromRelativePath: oldPath,
		root: targetRoot,
		relativePath: newRelativePath,
		parentRelativePath: targetParentRelativePath,
		parentItemId,
	});

	console.log("[Forge API] Item moved:", `${oldRoot}/${oldPath}`, "=>", `${targetRoot}/${newRelativePath}`, "Revision:", change.revision);
	sendJson(res, 200, {
		ok: true,
		sessionId,
		item: getPublicFiles([item])[0],
		moved: getPublicFiles(moved),
		revision: change.revision,
	});
}

async function deleteItem(req, res, sessionId, fileId) {
	const sessionData = getAuthorizedSession(req, res, sessionId);
	if (!sessionData) return;

	const item = findItem(sessionData, fileId);

	if (!item) {
		sendJson(res, 404, { ok: false, error: "Item not found", fileId });
		return;
	}

	const removed = removeItemAndDescendants(sessionData, item);
	const change = pushChange(sessionData, {
		type: "deleteInstance",
		fileId: item.fileId,
		itemId: item.itemId || item.fileId,
		name: item.name,
		className: item.className,
		root: item.root,
		relativePath: item.relativePath,
		removed: getPublicFiles(removed),
	});

	console.log("[Forge API] Item deleted:", `${item.root}/${item.relativePath}`, "Revision:", change.revision);
	sendJson(res, 200, { ok: true, sessionId, removed: getPublicFiles(removed), revision: change.revision });
}

function sendChanges(req, res, sessionId, url) {
	const sessionData = getAuthorizedSession(req, res, sessionId);
	if (!sessionData) return;

	const after = Number(url.searchParams.get("after") || "0");

	if (!Number.isFinite(after) || after < 0) {
		sendJson(res, 400, { ok: false, error: "Invalid after revision." });
		return;
	}

	const changes = Array.isArray(sessionData.changes) ? sessionData.changes.filter(change => change.revision > after) : [];
	const lastRevision = Array.isArray(sessionData.changes) && sessionData.changes.length > 0
		? sessionData.changes[sessionData.changes.length - 1].revision
		: 0;

	sendJson(res, 200, {
		ok: true,
		sessionId,
		after,
		lastRevision,
		changesCount: changes.length,
		changes,
	});
}

async function handleRequest(req, res) {
	try {
		if (req.method === "OPTIONS") {
			sendOptions(res);
			return;
		}

		const url = new URL(req.url, "http://localhost");

		if (req.method === "GET" && url.pathname === "/health") {
			sendJson(res, 200, { ok: true, service: "Forge API", version: "2.2.0-pro", time: Date.now() });
			return;
		}

		if (req.method === "POST" && url.pathname === "/sessions/upload") {
			await handleSessionUpload(req, res);
			return;
		}

		const filesMatch = url.pathname.match(/^\/sessions\/([^/]+)\/files$/);
		if (req.method === "GET" && filesMatch) {
			sendSessionFiles(req, res, decodeURIComponent(filesMatch[1]));
			return;
		}

		const createMatch = url.pathname.match(/^\/sessions\/([^/]+)\/create$/);
		if (req.method === "POST" && createMatch) {
			await createItem(req, res, decodeURIComponent(createMatch[1]));
			return;
		}

		const sourceMatch = url.pathname.match(/^\/sessions\/([^/]+)\/files\/([^/]+)\/source$/);
		if (req.method === "GET" && sourceMatch) {
			sendSource(req, res, decodeURIComponent(sourceMatch[1]), decodeURIComponent(sourceMatch[2]));
			return;
		}

		const saveMatch = url.pathname.match(/^\/sessions\/([^/]+)\/files\/([^/]+)\/save$/);
		if (req.method === "POST" && saveMatch) {
			await saveSource(req, res, decodeURIComponent(saveMatch[1]), decodeURIComponent(saveMatch[2]));
			return;
		}

		const moveMatch = url.pathname.match(/^\/sessions\/([^/]+)\/files\/([^/]+)\/move$/);
		if (req.method === "POST" && moveMatch) {
			await moveItem(req, res, decodeURIComponent(moveMatch[1]), decodeURIComponent(moveMatch[2]));
			return;
		}

		const deleteMatch = url.pathname.match(/^\/sessions\/([^/]+)\/files\/([^/]+)\/delete$/);
		if (req.method === "POST" && deleteMatch) {
			await deleteItem(req, res, decodeURIComponent(deleteMatch[1]), decodeURIComponent(deleteMatch[2]));
			return;
		}

		const changesMatch = url.pathname.match(/^\/sessions\/([^/]+)\/changes$/);
		if (req.method === "GET" && changesMatch) {
			sendChanges(req, res, decodeURIComponent(changesMatch[1]), url);
			return;
		}

		if (req.method === "GET" && !url.pathname.startsWith("/sessions")) {
			sendStaticFile(res, url.pathname);
			return;
		}

		sendJson(res, 404, { ok: false, error: "Route not found", method: req.method, url: req.url });
	} catch (error) {
		sendJson(res, 500, { ok: false, error: error.message || "Internal server error" });
	}
}

module.exports = { handleRequest };
