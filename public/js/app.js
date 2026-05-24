import {
	ROOT_ORDER,
	CREATE_TYPES,
	STORAGE,
	SESSION_STORAGE,
	DEFAULT_SETTINGS,
	FILES_POLL_INTERVAL,
} from "./config.js";
import {
	loadJson,
	saveJson,
	clamp,
	escapeHtml,
	sanitizeName,
	getParentPath,
	getFullPath,
	isScriptClass,
	isScriptItem,
	isInputLike,
	getDefaultSourceForClass,
} from "./helpers.js";
import {
	fetchSessionFiles,
	fetchSource,
	saveSource,
	createRemoteItem,
	moveRemoteItem,
	deleteRemoteItem,
} from "./api.js";
import {
	setupUi,
	setStatus,
	showToast,
	requestConfirm,
	closeConfirm,
} from "./ui.js";
import { createEditorController } from "./editor.js";
import { setIcon, svgIcon } from "./icons.js";
import { applyLanguage, getLanguage, populateLanguageSelect, t } from "./i18n.js";

const refs = {
	sessionInput: document.getElementById("sessionInput"),
	secretInput: document.getElementById("secretInput"),
	loadButton: document.getElementById("loadButton"),
	connectionButton: document.getElementById("connectionButton"),
	connectionModal: document.getElementById("connectionModal"),
	connectionDialog: document.getElementById("connectionDialog"),
	connectedSessionLabel: document.getElementById("connectedSessionLabel"),
	closeConnectionButton: document.getElementById("closeConnectionButton"),
	cancelConnectionButton: document.getElementById("cancelConnectionButton"),
	disconnectButton: document.getElementById("disconnectButton"),
	connectionDot: document.getElementById("connectionDot"),
	connectionLabel: document.getElementById("connectionLabel"),
	refreshButton: document.getElementById("refreshButton"),
	searchInput: document.getElementById("searchInput"),
	statusEl: document.getElementById("status"),
	fileCount: document.getElementById("fileCount"),
	treeEl: document.getElementById("tree"),
	tabsEl: document.getElementById("tabs"),
	fileTitle: document.getElementById("fileTitle"),
	filePath: document.getElementById("filePath"),
	footerLeft: document.getElementById("footerLeft"),
	footerRight: document.getElementById("footerRight"),
	editorShell: document.getElementById("editorShell"),
	monacoHost: document.getElementById("monacoEditor"),
	fallbackEditor: document.getElementById("fallbackEditor"),
	monacoHostSecondary: document.getElementById("monacoEditorSecondary"),
	fallbackEditorSecondary: document.getElementById("fallbackEditorSecondary"),
	secondaryPane: document.getElementById("secondaryPane"),
	secondaryTitle: document.getElementById("secondaryTitle"),
	secondaryCloseButton: document.getElementById("secondaryCloseButton"),
	splitButton: document.getElementById("splitButton"),
	closeSplitButton: document.getElementById("closeSplitButton"),
	splitDropHint: document.getElementById("splitDropHint"),
	placeholder: document.getElementById("placeholder"),
	resizer: document.getElementById("resizer"),
	saveButton: document.getElementById("saveButton"),
	projectSearchButton: document.getElementById("projectSearchButton"),
	projectSearchModal: document.getElementById("projectSearchModal"),
	closeProjectSearchButton: document.getElementById("closeProjectSearchButton"),
	projectSearchInput: document.getElementById("projectSearchInput"),
	runProjectSearchButton: document.getElementById("runProjectSearchButton"),
	projectSearchStatus: document.getElementById("projectSearchStatus"),
	projectSearchResults: document.getElementById("projectSearchResults"),
	createModal: document.getElementById("createModal"),
	createLocation: document.getElementById("createLocation"),
	typeGrid: document.getElementById("typeGrid"),
	createNameInput: document.getElementById("createNameInput"),
	closeCreateButton: document.getElementById("closeCreateButton"),
	cancelCreateButton: document.getElementById("cancelCreateButton"),
	confirmCreateButton: document.getElementById("confirmCreateButton"),
	confirmModal: document.getElementById("confirmModal"),
	confirmTitle: document.getElementById("confirmTitle"),
	confirmMessage: document.getElementById("confirmMessage"),
	closeConfirmButton: document.getElementById("closeConfirmButton"),
	cancelConfirmButton: document.getElementById("cancelConfirmButton"),
	acceptConfirmButton: document.getElementById("acceptConfirmButton"),
	settingsButton: document.getElementById("settingsButton"),
	settingsModal: document.getElementById("settingsModal"),
	closeSettingsButton: document.getElementById("closeSettingsButton"),
	languageInput: document.getElementById("languageInput"),
	appearanceInput: document.getElementById("appearanceInput"),
	gateAppearanceSelect: document.getElementById("gateAppearanceSelect"),
	fontFamilyInput: document.getElementById("fontFamilyInput"),
	fontSizeInput: document.getElementById("fontSizeInput"),
	autosaveInput: document.getElementById("autosaveInput"),
	wordWrapInput: document.getElementById("wordWrapInput"),
	editorThemeInput: document.getElementById("editorThemeInput"),
	minimapInput: document.getElementById("minimapInput"),
	resetSettingsButton: document.getElementById("resetSettingsButton"),
	saveSettingsButton: document.getElementById("saveSettingsButton"),
	settingsPreview: document.getElementById("settingsPreview"),
	settingsPreviewMeta: document.getElementById("settingsPreviewMeta"),
	betaWarningModal: document.getElementById("betaWarningModal"),
	betaLanguageSelect: document.getElementById("betaLanguageSelect"),
	betaContinueButton: document.getElementById("betaContinueButton"),
	toastStack: document.getElementById("toastStack"),
	sessionGate: document.getElementById("sessionGate"),
	gateSessionInput: document.getElementById("gateSessionInput"),
	gateSecretInput: document.getElementById("gateSecretInput"),
	gateConnectButton: document.getElementById("gateConnectButton"),
};

setupUi(refs);

const state = {
	sessionId: "",
	secret: "",
	files: [],
	filesById: new Map(),
	treeRoot: null,
	nodeByKey: new Map(),
	selectedKey: "",
	selectedPayload: null,
	currentFileId: "",
	secondaryFileId: "",
	activeGroup: "primary",
	openTabs: new Map(),
	expandedKeys: new Set(loadJson(STORAGE.expanded, [])),
	pollTimer: null,
	autosaveTimer: null,
	isLoadingFiles: false,
	draggingItemId: "",
	draggingTabId: "",
	renamingItemId: "",
	pendingCreateParent: null,
	selectedCreateClass: "Script",
	settings: {
		...DEFAULT_SETTINGS,
		...loadJson(STORAGE.settings, DEFAULT_SETTINGS),
	},
	language: getLanguage(),
	viewRestoreTokens: { primary: 0, secondary: 0 },
	editor: null,
	lastConnectionErrorAt: 0,
	projectSearchCache: new Map(),
	hasInitializedRootExpansion: false,
	isRestoringWorkspace: false,
	renameStartedAt: 0,
	suppressViewStateSaveUntil: 0,
};

function getAuth() {
	return {
		sessionId: state.sessionId,
		secret: state.secret,
	};
}

function hasConnection() {
	return !!state.sessionId && !!state.secret;
}

function tx(key) {
	return t(state.language, key);
}

function normalizeInterfaceTheme(value) {
	return ["system", "dark", "light"].includes(value) ? value : "system";
}

function applyInterfaceTheme(value) {
	const theme = normalizeInterfaceTheme(value);
	document.documentElement.dataset.interfaceTheme = theme;
	if (refs.gateAppearanceSelect) refs.gateAppearanceSelect.value = theme;
	if (refs.appearanceInput) refs.appearanceInput.value = theme;
	return theme;
}

function getWorkspaceStorageKey() {
	const sessionId = String(state.sessionId || "").trim();
	return sessionId ? STORAGE.workspace + ":" + sessionId : STORAGE.workspace;
}

function saveWorkspaceState(saveViews = true) {
	if (!hasConnection() || state.isRestoringWorkspace) return;

	if (saveViews) saveAllVisibleEditorViewStates();

	const viewStates = {};

	for (const tab of state.openTabs.values()) {
		if (tab.viewState) {
			viewStates[tab.fileId] = tab.viewState;
		}
	}

	const payload = {
		tabIds: Array.from(state.openTabs.keys()),
		currentFileId: state.currentFileId || "",
		secondaryFileId: state.secondaryFileId || "",
		activeGroup: state.activeGroup || "primary",
		viewStates,
		savedAt: Date.now(),
	};

	saveJson(getWorkspaceStorageKey(), payload);
}

function clearWorkspaceState() {
	try {
		localStorage.removeItem(getWorkspaceStorageKey());
	} catch (error) {}
}

function updateConnectionUi(connected, label) {
	refs.connectionDot.classList.toggle("connected", !!connected);
	refs.connectionDot.classList.toggle("disconnected", !connected);
	refs.connectionLabel.textContent = label || (connected ? "Connected" : "Disconnected");
	document.body.classList.toggle("no-session", !connected);
	document.body.classList.toggle("workspace-ready", !!connected);
}

let lastDiscordActivitySignature = "";

function updateDesktopDiscordActivity(activeTab = null) {
	if (!window.forgeDesktop || !window.forgeDesktop.setDiscordActivity) return;

	const payload = activeTab ? {
		details: "Editing " + activeTab.name,
		state: activeTab.className + " · " + activeTab.root,
	} : {
		details: hasConnection() ? "Browsing project files" : "Waiting for private session",
		state: hasConnection() ? "Workspace connected" : "Private IDE workspace",
	};

	const signature = JSON.stringify(payload);
	if (signature === lastDiscordActivitySignature) return;
	lastDiscordActivitySignature = signature;

	window.forgeDesktop.setDiscordActivity(payload).catch(() => {});
}

function updateFileIndex() {
	state.filesById = new Map();
	for (const item of state.files) {
		state.filesById.set(item.fileId, item);
	}
}

function getLoadedFile(fileId) {
	return state.filesById.get(fileId) || null;
}

function nodeKey(root, relativePath, item) {
	if (!relativePath) {
		return "root:" + root;
	}

	return item && item.fileId ? "item:" + item.fileId : "virtual:" + root + "/" + relativePath;
}

function createNode(name, root, relativePath, item) {
	const key = nodeKey(root, relativePath, item);
	const node = {
		key,
		name,
		root,
		relativePath: relativePath || "",
		item: item || null,
		children: new Map(),
	};

	state.nodeByKey.set(key, node);
	return node;
}

function getItemByPath(root, relativePath) {
	const normalized = String(relativePath || "");
	return state.files.find(item => item.root === root && item.relativePath === normalized) || null;
}

function attachVirtualPath(rootNode, rootName, relativePath) {
	let cursor = rootNode;
	let partial = "";
	const parts = String(relativePath || "").split("/").filter(Boolean);

	for (const part of parts) {
		partial = partial ? partial + "/" + part : part;
		const realItem = getItemByPath(rootName, partial);
		const key = nodeKey(rootName, partial, realItem);

		if (!cursor.children.has(key)) {
			cursor.children.set(key, createNode(part, rootName, partial, realItem));
		}

		cursor = cursor.children.get(key);
	}

	return cursor;
}

function buildTree() {
	state.nodeByKey = new Map();
	const root = createNode("__root__", "", "", null);
	const itemNodes = new Map();

	for (const rootName of ROOT_ORDER) {
		root.children.set(rootName, createNode(rootName, rootName, "", null));
	}

	for (const item of state.files) {
		const node = createNode(item.name, item.root, item.relativePath, item);
		itemNodes.set(item.fileId, node);
	}

	for (const item of state.files) {
		if (!root.children.has(item.root)) {
			root.children.set(item.root, createNode(item.root, item.root, "", null));
		}

		const node = itemNodes.get(item.fileId);
		let parentNode = null;
		const parentId = item.parentItemId || "";

		if (parentId && itemNodes.has(parentId)) {
			parentNode = itemNodes.get(parentId);
		} else if (!item.parentRelativePath) {
			parentNode = root.children.get(item.root);
		} else {
			parentNode = attachVirtualPath(root.children.get(item.root), item.root, item.parentRelativePath);
		}

		if (!parentNode.children.has(node.key)) {
			parentNode.children.set(node.key, node);
		}
	}

	if (!state.hasInitializedRootExpansion && !localStorage.getItem(STORAGE.expanded)) {
		for (const rootNode of root.children.values()) {
			if (rootNode.children.size > 0) {
				state.expandedKeys.add(rootNode.key);
			}
		}
		state.hasInitializedRootExpansion = true;
	}

	state.treeRoot = root;
}

function getNodeClass(node) {
	if (!node.relativePath) {
		return "Root";
	}

	return node.item ? node.item.className : "Instance";
}

function getNodeIcon(node) {
	const className = getNodeClass(node);

	if (!node.relativePath) return { icon: "root", cls: "root" };
	if (className === "Folder") return { icon: "folder", cls: "folder" };
	if (className === "ModuleScript") return { icon: "module", cls: "module" };
	if (className === "LocalScript") return { icon: "localScript", cls: "script" };
	if (className === "Script") return { icon: "script", cls: "script" };
	return { icon: "instance", cls: "instance" };
}

function getParentPayload(node) {
	return {
		root: node.root,
		relativePath: node.relativePath || "",
		itemId: node.item ? node.item.fileId : "",
		label: node.root + (node.relativePath ? "/" + node.relativePath : ""),
	};
}

function sortNodes(nodes) {
	return nodes.sort((a, b) => {
		const aClass = getNodeClass(a);
		const bClass = getNodeClass(b);
		const aScript = isScriptClass(aClass);
		const bScript = isScriptClass(bClass);

		if (!a.relativePath && !b.relativePath) {
			return ROOT_ORDER.indexOf(a.root) - ROOT_ORDER.indexOf(b.root);
		}

		if (aClass === "Folder" && bClass !== "Folder") return -1;
		if (aClass !== "Folder" && bClass === "Folder") return 1;
		if (!aScript && bScript) return -1;
		if (aScript && !bScript) return 1;
		return a.name.localeCompare(b.name);
	});
}

function nodeMatchesSearch(node, query) {
	if (!query) {
		return true;
	}

	const target = `${node.name} ${node.root}/${node.relativePath} ${getNodeClass(node)}`.toLowerCase();

	if (target.includes(query)) {
		return true;
	}

	for (const child of node.children.values()) {
		if (nodeMatchesSearch(child, query)) {
			return true;
		}
	}

	return false;
}

function setSelectedNode(node) {
	if (!node) {
		state.selectedKey = "";
		state.selectedPayload = null;
	} else {
		state.selectedKey = node.key;
		state.selectedPayload = getParentPayload(node);
	}

	renderTree();
	updateEditorHeader();
}

function getActiveFileId(group = state.activeGroup) {
	return group === "secondary" ? state.secondaryFileId : state.currentFileId;
}

function saveEditorViewForGroup(group = state.activeGroup) {
	if (!state.editor) return;
	if (Date.now() < state.suppressViewStateSaveUntil) return;

	const fileId = getActiveFileId(group);
	const tab = fileId ? state.openTabs.get(fileId) : null;

	if (!tab) return;

	tab.viewState = state.editor.getViewState(group);
}

function saveAllVisibleEditorViewStates() {
	saveEditorViewForGroup("primary");

	if (state.secondaryFileId) {
		saveEditorViewForGroup("secondary");
	}
}

function restoreEditorViewForTab(tab, group = state.activeGroup) {
	if (!state.editor) return;

	const targetGroup = group === "secondary" ? "secondary" : "primary";
	const token = (state.viewRestoreTokens[targetGroup] || 0) + 1;
	state.viewRestoreTokens[targetGroup] = token;
	const viewState = tab && tab.viewState ? tab.viewState : null;

	const apply = () => {
		if (state.viewRestoreTokens[targetGroup] !== token) return;
		state.editor.restoreViewState(viewState, targetGroup);
	};

	apply();
	requestAnimationFrame(apply);
	setTimeout(apply, 20);
	setTimeout(apply, 80);
}

function setActiveGroup(group) {
	state.activeGroup = group === "secondary" && state.secondaryFileId ? "secondary" : "primary";
	updateEditorHeader();
}

function updateEditorHeader() {
	const activeFileId = getActiveFileId();
	const activeTab = state.openTabs.get(activeFileId) || null;
	const primaryTab = state.openTabs.get(state.currentFileId) || null;
	const secondaryTab = state.openTabs.get(state.secondaryFileId) || null;
	refs.placeholder.style.display = primaryTab ? "none" : "grid";
	refs.saveButton.disabled = !activeTab || !activeTab.dirty;
	if (refs.splitButton) refs.splitButton.disabled = !primaryTab;
	refs.closeSplitButton.style.display = state.secondaryFileId ? "inline-flex" : "none";
	refs.secondaryTitle.textContent = secondaryTab ? secondaryTab.name + " · " + secondaryTab.className : "Split View";

	if (activeTab) {
		const splitText = state.secondaryFileId ? " · Split active: " + state.activeGroup : "";
		refs.fileTitle.textContent = activeTab.name + " [" + activeTab.className + "]";
		refs.filePath.textContent = activeTab.root + "/" + activeTab.relativePath + splitText;
		document.title = "Cloud - " + activeTab.name + ".lua";
		updateDesktopDiscordActivity(activeTab);
		return;
	}

	updateDesktopDiscordActivity(null);
	refs.fileTitle.textContent = tx("noFileOpen");
	refs.filePath.textContent = hasConnection()
		? "Open a script from the Explorer."
		: tx("filePathEmpty");
	document.title = "Cloud";
}

function renderTree() {
	buildTree();

	const query = refs.searchInput.value.trim().toLowerCase();
	refs.treeEl.innerHTML = "";
	refs.fileCount.textContent = state.files.length + (state.files.length === 1 ? " item" : " items");

	if (!hasConnection()) {
		refs.treeEl.innerHTML = '<div class="tree-empty">Connect privately to unlock your project tree.</div>';
		return;
	}

	if (state.files.length === 0) {
		refs.treeEl.innerHTML = '<div class="tree-empty">No scripts or folders were uploaded yet.</div>';
	}

	const fragment = document.createDocumentFragment();
	for (const node of sortNodes(Array.from(state.treeRoot.children.values()))) {
		if (node.children.size === 0 && query) continue;
		renderNode(fragment, node, 0, query);
	}

	refs.treeEl.appendChild(fragment);
	updateEditorHeader();
}

function getActiveEditorGroup() {
	return state.activeGroup === "secondary" && state.secondaryFileId ? "secondary" : "primary";
}

function getClosableFileId(group = getActiveEditorGroup()) {
	return getActiveFileId(group) || state.currentFileId || Array.from(state.openTabs.keys()).pop() || "";
}

function foldActiveScript() {
	state.editor?.foldAll?.(getActiveEditorGroup());
	setStatus("Current script folded.", "success");
}

function unfoldActiveScript() {
	state.editor?.unfoldAll?.(getActiveEditorGroup());
	setStatus("Current script unfolded.", "success");
}

function collapseExplorer() {
	refs.searchInput.value = "";
	state.expandedKeys.clear();
	saveJson(STORAGE.expanded, []);
	renderTree();
	setStatus("Explorer collapsed.", "success");
}

function expandExplorer() {
	refs.searchInput.value = "";
	buildTree();
	const keys = [];
	function walk(node) {
		if (!node || node.children.size === 0) return;
		keys.push(node.key);
		for (const child of node.children.values()) walk(child);
	}
	for (const rootNode of state.treeRoot.children.values()) walk(rootNode);
	state.expandedKeys = new Set(keys);
	saveJson(STORAGE.expanded, keys);
	renderTree();
	setStatus("Explorer expanded.", "success");
}

function switchTabByShortcutIndex(index) {
	const tabIds = Array.from(state.openTabs.keys());
	const fileId = tabIds[index - 1];

	if (!fileId) {
		showToast("No tab exists in slot " + index + ".", "warning");
		return false;
	}

	switchTab(fileId, state.activeGroup || "primary");
	return true;
}

function handleGlobalShortcut(event) {
	const key = String(event.key || "").toLowerCase();
	const code = event.code || "";
	const mod = event.ctrlKey || event.metaKey;

	if (!mod) return false;

	if (!event.shiftKey && !event.altKey) {
		let tabIndex = 0;

		if (/^[1-9]$/.test(key)) {
			tabIndex = Number(key);
		} else if (/^Digit[1-9]$/.test(code)) {
			tabIndex = Number(code.slice(5));
		} else if (/^Numpad[1-9]$/.test(code)) {
			tabIndex = Number(code.slice(6));
		}

		if (tabIndex >= 1 && tabIndex <= 9) {
			event.preventDefault();
			event.stopPropagation();
			if (typeof event.stopImmediatePropagation === "function") event.stopImmediatePropagation();
			return switchTabByShortcutIndex(tabIndex);
		}
	}

	if (key === "w" || code === "KeyW") {
		const fileId = getClosableFileId();
		if (!fileId) return false;
		event.preventDefault();
		event.stopPropagation();
		if (typeof event.stopImmediatePropagation === "function") event.stopImmediatePropagation();
		closeTab(fileId);
		return true;
	}

	if (event.shiftKey && (key === "e" || code === "KeyE")) {
		event.preventDefault();
		event.stopPropagation();
		if (typeof event.stopImmediatePropagation === "function") event.stopImmediatePropagation();
		foldActiveScript();
		return true;
	}

	if (!event.shiftKey && (key === "e" || code === "KeyE")) {
		event.preventDefault();
		event.stopPropagation();
		if (typeof event.stopImmediatePropagation === "function") event.stopImmediatePropagation();
		unfoldActiveScript();
		return true;
	}

	return false;
}

function makeIconButton(className, iconName, title) {
	const button = document.createElement("button");
	button.className = className;
	button.title = title || "";
	button.innerHTML = svgIcon(iconName);
	return button;
}

function renderNode(parent, node, depth, query) {
	if (!nodeMatchesSearch(node, query)) {
		return;
	}

	const children = sortNodes(Array.from(node.children.values())).filter(child => nodeMatchesSearch(child, query));
	const hasChildren = children.length > 0;
	const isExpanded = query ? true : state.expandedKeys.has(node.key);
	const row = document.createElement("div");
	row.className = "tree-row";
	row.style.paddingLeft = (depth * 14 + 5) + "px";
	row.dataset.key = node.key;

	if (state.selectedKey === node.key) row.classList.add("selected");
	if (node.item && state.currentFileId === node.item.fileId) row.classList.add("opened");

	const chevron = makeIconButton("chevron" + (hasChildren ? "" : " empty"), hasChildren ? (isExpanded ? "chevronDown" : "chevronRight") : "chevronRight", "Toggle");
	chevron.addEventListener("click", event => {
		event.stopPropagation();
		if (!hasChildren) return;

		if (state.expandedKeys.has(node.key)) state.expandedKeys.delete(node.key);
		else state.expandedKeys.add(node.key);

		saveJson(STORAGE.expanded, Array.from(state.expandedKeys));
		renderTree();
	});

	const iconData = getNodeIcon(node);
	const icon = document.createElement("span");
	icon.className = "node-icon " + iconData.cls;
	icon.innerHTML = svgIcon(iconData.icon);

	let nameEl = null;

	if (node.item && state.renamingItemId === node.item.fileId) {
		nameEl = document.createElement("input");
		nameEl.className = "node-rename-input";
		nameEl.value = node.name;
		nameEl.spellcheck = false;
		nameEl.dataset.renameItemId = node.item.fileId;

		let renameFinished = false;

		function finishRename(shouldCommit) {
			if (renameFinished) return;
			renameFinished = true;

			if (shouldCommit) {
				renameItem(node.item.fileId, nameEl.value);
			} else {
				state.renamingItemId = "";
				state.renameStartedAt = 0;
				renderTree();
			}
		}

		nameEl.addEventListener("click", event => event.stopPropagation());
		nameEl.addEventListener("dblclick", event => event.stopPropagation());
		nameEl.addEventListener("mousedown", event => event.stopPropagation());
		nameEl.addEventListener("keydown", event => {
			event.stopPropagation();

			if (event.key === "Enter") {
				event.preventDefault();
				finishRename(true);
			}

			if (event.key === "Escape") {
				event.preventDefault();
				finishRename(false);
			}
		});
		nameEl.addEventListener("blur", () => {
			setTimeout(() => {
				if (renameFinished || state.renamingItemId !== node.item.fileId) return;

				if (Date.now() - state.renameStartedAt < 220) {
					nameEl.focus();
					nameEl.select();
					return;
				}

				finishRename(true);
			}, 120);
		});

		setTimeout(() => {
			if (state.renamingItemId !== node.item.fileId) return;
			nameEl.focus();
			nameEl.select();
		}, 40);
	} else {
		nameEl = document.createElement("span");
		nameEl.className = "node-name";
		nameEl.textContent = node.name;
	}

	const actions = document.createElement("span");
	actions.className = "node-actions";

	const addButton = makeIconButton("node-action", "plus", "Create inside " + (node.root + (node.relativePath ? "/" + node.relativePath : "")));
	addButton.addEventListener("click", event => {
		event.stopPropagation();
		setSelectedNode(node);
		openCreatePanel(getParentPayload(node), "Script");
	});

	actions.appendChild(addButton);

	if (node.item) {
		const deleteButton = makeIconButton("node-action danger-action", "trash", "Delete selected item");
		deleteButton.addEventListener("click", event => {
			event.stopPropagation();
			setSelectedNode(node);
			deleteSelectedItem();
		});
		actions.appendChild(deleteButton);
	}

	row.appendChild(chevron);
	row.appendChild(icon);
	row.appendChild(nameEl);
	row.appendChild(actions);

	row.addEventListener("click", () => {
		if (node.item && state.renamingItemId === node.item.fileId) return;
		setSelectedNode(node);
		if (node.item && isScriptItem(node.item)) openFile(node.item);
	});

	row.addEventListener("dblclick", event => {
		event.stopPropagation();
		if (!hasChildren || (node.item && state.renamingItemId === node.item.fileId)) return;

		if (state.expandedKeys.has(node.key)) state.expandedKeys.delete(node.key);
		else state.expandedKeys.add(node.key);

		saveJson(STORAGE.expanded, Array.from(state.expandedKeys));
		renderTree();
	});

	if (node.item && (isScriptClass(node.item.className) || node.item.className === "Folder")) {
		row.draggable = true;
		row.addEventListener("dragstart", event => {
			event.stopPropagation();
			state.draggingItemId = node.item.fileId;
			event.dataTransfer.setData("text/cloud-item", node.item.fileId);
			event.dataTransfer.setData("text/plain", node.item.fileId);
			event.dataTransfer.effectAllowed = "move";
		});
		row.addEventListener("dragend", () => {
			state.draggingItemId = "";
		});
	}

	row.addEventListener("dragover", event => {
		const draggedId = state.draggingItemId || event.dataTransfer.getData("text/cloud-item") || event.dataTransfer.getData("text/plain");
		const dragged = getLoadedFile(draggedId);
		const target = getParentPayload(node);

		if (!dragged || isDescendantTarget(dragged, target)) return;

		event.preventDefault();
		row.classList.add("drag-over");
	});

	row.addEventListener("dragleave", () => row.classList.remove("drag-over"));
	row.addEventListener("drop", event => {
		event.preventDefault();
		event.stopPropagation();
		row.classList.remove("drag-over");

		const draggedId = state.draggingItemId || event.dataTransfer.getData("text/cloud-item") || event.dataTransfer.getData("text/plain");
		state.draggingItemId = "";
		moveItem(draggedId, getParentPayload(node));
	});

	parent.appendChild(row);

	if (hasChildren && isExpanded) {
		for (const child of children) {
			renderNode(parent, child, depth + 1, query);
		}
	}
}

function isDescendantTarget(item, targetParent) {
	if (!item || !targetParent) {
		return false;
	}

	if (targetParent.itemId && targetParent.itemId === item.fileId) {
		return true;
	}

	let cursor = targetParent.itemId ? getLoadedFile(targetParent.itemId) : null;
	const visited = new Set();

	while (cursor && cursor.parentItemId) {
		if (cursor.parentItemId === item.fileId) return true;
		if (visited.has(cursor.parentItemId)) return false;
		visited.add(cursor.parentItemId);
		cursor = getLoadedFile(cursor.parentItemId);
	}

	return false;
}

function reorderTab(sourceId, targetId, placeAfter) {
	if (!state.openTabs.has(sourceId) || !state.openTabs.has(targetId) || sourceId === targetId) return;

	const entries = Array.from(state.openTabs.entries());
	const sourceEntry = entries.find(entry => entry[0] === sourceId);
	const filtered = entries.filter(entry => entry[0] !== sourceId);
	let targetIndex = filtered.findIndex(entry => entry[0] === targetId);

	if (!sourceEntry || targetIndex < 0) return;
	if (placeAfter) targetIndex += 1;

	filtered.splice(targetIndex, 0, sourceEntry);
	state.openTabs.clear();

	for (const entry of filtered) {
		state.openTabs.set(entry[0], entry[1]);
	}

	renderTabs();
	saveWorkspaceState();
}

function renderTabs() {
	refs.tabsEl.innerHTML = "";

	for (const tab of state.openTabs.values()) {
		const item = document.createElement("div");
		item.className = "tab draggable-tab" + (tab.fileId === getActiveFileId() ? " active" : "") + (tab.fileId === state.secondaryFileId ? " split-open" : "") + (tab.dirty ? " dirty" : "");
		item.title = tab.root + "/" + tab.relativePath;
		item.draggable = true;

		const icon = document.createElement("span");
		icon.className = "node-icon " + (tab.className === "ModuleScript" ? "module" : "script");
		icon.innerHTML = svgIcon(tab.className === "ModuleScript" ? "module" : (tab.className === "LocalScript" ? "localScript" : "script"));

		const name = document.createElement("span");
		name.className = "tab-name";
		name.textContent = tab.name;

		const dot = document.createElement("span");
		dot.className = "dirty-dot";

		const close = makeIconButton("tab-close", "close", "Close tab");
		close.draggable = false;
		close.addEventListener("mousedown", event => event.stopPropagation());
		close.addEventListener("click", event => {
			event.stopPropagation();
			closeTab(tab.fileId);
		});

		item.addEventListener("click", () => switchTab(tab.fileId, "primary"));
		item.addEventListener("dblclick", event => { event.preventDefault(); splitTab(tab.fileId); });
		item.addEventListener("auxclick", event => {
			if (event.button === 1) {
				event.preventDefault();
				closeTab(tab.fileId);
			}
		});
		item.addEventListener("mousedown", event => {
			if (event.button === 1) event.preventDefault();
		});
		item.addEventListener("dragstart", event => {
			state.draggingTabId = tab.fileId;
			refs.tabsEl.classList.add("dragging-tabs");
			event.dataTransfer.setData("text/cloud-tab", tab.fileId);
			event.dataTransfer.effectAllowed = "move";
			item.classList.add("dragging");
		});
		item.addEventListener("dragend", () => {
			state.draggingTabId = "";
			refs.tabsEl.classList.remove("dragging-tabs");
			item.classList.remove("dragging", "drag-over-left", "drag-over-right");
		});
		item.addEventListener("dragover", event => {
			const sourceId = state.draggingTabId || event.dataTransfer.getData("text/cloud-tab");
			if (!sourceId || sourceId === tab.fileId || !state.openTabs.has(sourceId)) return;

			event.preventDefault();
			event.dataTransfer.dropEffect = "move";

			const rect = item.getBoundingClientRect();
			const placeAfter = event.clientX > rect.left + rect.width / 2;
			item.classList.toggle("drag-over-left", !placeAfter);
			item.classList.toggle("drag-over-right", placeAfter);
		});
		item.addEventListener("dragenter", event => {
			const sourceId = state.draggingTabId || event.dataTransfer.getData("text/cloud-tab");
			if (!sourceId || sourceId === tab.fileId || !state.openTabs.has(sourceId)) return;
			event.preventDefault();
		});
		item.addEventListener("dragleave", () => {
			item.classList.remove("drag-over-left", "drag-over-right");
		});
		item.addEventListener("drop", event => {
			event.preventDefault();
			item.classList.remove("drag-over-left", "drag-over-right");
			const sourceId = state.draggingTabId || event.dataTransfer.getData("text/cloud-tab");
			state.draggingTabId = "";
			refs.tabsEl.classList.remove("dragging-tabs");

			if (!sourceId || sourceId === tab.fileId || !state.openTabs.has(sourceId)) return;

			const rect = item.getBoundingClientRect();
			const placeAfter = event.clientX > rect.left + rect.width / 2;
			reorderTab(sourceId, tab.fileId, placeAfter);
		});

		item.appendChild(icon);
		item.appendChild(name);
		item.appendChild(dot);
		item.appendChild(close);
		refs.tabsEl.appendChild(item);
	}
}

function switchTab(fileId, group = "primary") {
	const tab = state.openTabs.get(fileId);
	if (!tab) return;

	const targetGroup = group === "secondary" ? "secondary" : "primary";
	const previousFileId = getActiveFileId(targetGroup);
	if (previousFileId && previousFileId !== fileId) {
		saveEditorViewForGroup(targetGroup);
	}

	state.suppressViewStateSaveUntil = Date.now() + 220;

	if (targetGroup === "secondary") {
		state.secondaryFileId = fileId;
		state.editor.setSplit(true);
	} else {
		state.currentFileId = fileId;
	}

	state.activeGroup = targetGroup;
	state.selectedKey = "item:" + fileId;
	state.selectedPayload = {
		root: tab.root,
		relativePath: tab.relativePath,
		itemId: tab.fileId,
		label: tab.root + "/" + tab.relativePath,
	};

	state.editor.setValue(tab.source, targetGroup);
	restoreEditorViewForTab(tab, targetGroup);
	renderTabs();
	renderTree();
	updateEditorHeader();
	setTimeout(() => state.editor.focus(targetGroup), 0);
	setTimeout(() => {
		state.suppressViewStateSaveUntil = 0;
		saveWorkspaceState(false);
	}, 260);
}

function splitTab(fileId = state.currentFileId) {
	const tab = state.openTabs.get(fileId);
	if (!tab) {
		showToast("Open a script before splitting the editor.", "warning");
		return;
	}

	state.secondaryFileId = fileId;
	state.activeGroup = "secondary";
	state.editor.setSplit(true);
	state.editor.setValue(tab.source, "secondary");
	renderTabs();
	updateEditorHeader();
	state.editor.focus("secondary");
	saveWorkspaceState();
}

function closeSplit() {
	state.secondaryFileId = "";
	state.activeGroup = "primary";
	state.editor.setSplit(false);
	renderTabs();
	updateEditorHeader();
	state.editor.focus("primary");
	saveWorkspaceState();
}

async function openFile(file) {
	if (!hasConnection() || !file || !isScriptItem(file)) return;

	if (state.openTabs.has(file.fileId)) {
		switchTab(file.fileId, "primary");
		return;
	}

	setStatus("Opening " + file.name + "...", "warning");

	try {
		const data = await fetchSource(getAuth(), file.fileId);
		state.openTabs.set(file.fileId, {
			fileId: file.fileId,
			name: file.name,
			className: file.className,
			root: file.root,
			relativePath: file.relativePath,
			parentItemId: file.parentItemId || "",
			source: data.source || "",
			baseSourceHash: data.sourceHash || file.sourceHash || null,
			sourceHash: data.sourceHash || file.sourceHash || null,
			dirty: false,
			viewState: null,
		});

		switchTab(file.fileId, "primary");
		setStatus("Opened " + file.name, "success");
	} catch (error) {
		setStatus(error.message, "error");
		showToast(error.message, "error");
	}
}

async function closeTab(fileId, force = false) {
	const tab = state.openTabs.get(fileId);
	if (!tab) return;

	if (tab.dirty && !force) {
		const confirmed = await requestConfirm({
			title: "Close unsaved script",
			message: tab.name + " has unsaved changes. Close it anyway?",
			acceptText: "Close",
		});

		if (!confirmed) return;
	}

	state.openTabs.delete(fileId);

	if (state.secondaryFileId === fileId) {
		state.secondaryFileId = "";
		state.editor.setSplit(false);
	}

	if (state.currentFileId === fileId) {
		const next = state.openTabs.keys().next();
		state.currentFileId = next.done ? "" : next.value;

		if (state.currentFileId) {
			switchTab(state.currentFileId, "primary");
		} else {
			state.editor.setValue("", "primary");
		}
	}

	if (!state.secondaryFileId) state.activeGroup = "primary";

	renderTabs();
	updateEditorHeader();
	saveWorkspaceState();
}

function markCurrentDirty(group = state.activeGroup) {
	if (!state.editor || state.editor.isApplying(group)) return;

	const fileId = getActiveFileId(group);
	if (!fileId) return;

	const tab = state.openTabs.get(fileId);
	if (!tab) return;

	tab.source = state.editor.getValue(group);
	tab.viewState = state.editor.getViewState(group);
	tab.dirty = true;
	state.projectSearchCache.set(fileId, tab.source);
	renderTabs();
	updateEditorHeader();
	scheduleAutoSave(fileId);
}

function scheduleAutoSave(fileId = getActiveFileId()) {
	clearTimeout(state.autosaveTimer);
	state.autosaveTimer = setTimeout(() => saveCurrentFile(true, fileId), state.settings.autosaveMs);
}

async function saveCurrentFile(silent = false, fileId = getActiveFileId()) {
	if (!hasConnection() || !fileId) return;

	const tab = state.openTabs.get(fileId);
	if (!tab || !tab.dirty) return;

	if (tab.fileId === state.secondaryFileId) {
		tab.source = state.editor.getValue("secondary");
	} else if (tab.fileId === state.currentFileId) {
		tab.source = state.editor.getValue("primary");
	} else {
		tab.source = tab.source || "";
	}

	if (!silent) {
		setStatus("Saving " + tab.name + "...", "warning");
	}

	try {
		const data = await saveSource(getAuth(), tab.fileId, tab.source, tab.baseSourceHash || tab.sourceHash || null);

		tab.dirty = false;
		tab.sourceHash = data.sourceHash;
		tab.baseSourceHash = data.sourceHash;
		state.projectSearchCache.set(tab.fileId, tab.source);
		renderTabs();
		updateEditorHeader();
		await loadSessionFiles(false);
		setStatus("Saved revision " + data.revision + ". Cloud will apply it automatically.", "success");
		if (!silent) showToast("Saved " + tab.name + ".", "success");
	} catch (error) {
		setStatus(error.message, "error");
		showToast(error.message, "error");
	}
}

async function reloadTabSource(fileId, silent = true) {
	const tab = state.openTabs.get(fileId);
	if (!tab || tab.dirty || !hasConnection()) return;

	try {
		const data = await fetchSource(getAuth(), fileId);
		tab.source = data.source || "";
		tab.sourceHash = data.sourceHash || null;
		tab.baseSourceHash = data.sourceHash || null;

		if (state.currentFileId === fileId) {
			state.editor.setValue(tab.source, "primary");
			restoreEditorViewForTab(tab, "primary");
		}

		if (state.secondaryFileId === fileId) {
			state.editor.setValue(tab.source, "secondary");
			restoreEditorViewForTab(tab, "secondary");
		}

		state.projectSearchCache.set(fileId, tab.source);

		if (!silent) showToast("Reloaded " + tab.name + ".", "success");
	} catch (error) {
		if (!silent) showToast(error.message, "error");
	}
}

async function loadSessionFiles(showStatus = true) {
	if (!hasConnection() || state.isLoadingFiles) return false;

	state.isLoadingFiles = true;

	try {
		const data = await fetchSessionFiles(getAuth());
		state.files = Array.isArray(data.files) ? data.files : [];
		updateFileIndex();
		updateConnectionUi(true, "Connected");

		for (const tab of Array.from(state.openTabs.values())) {
			const latest = getLoadedFile(tab.fileId);

			if (!latest) {
				state.openTabs.delete(tab.fileId);
				if (state.currentFileId === tab.fileId) state.currentFileId = "";
				showToast(tab.name + " was deleted. Tab closed automatically.", "warning");
				continue;
			}

			tab.name = latest.name;
			tab.className = latest.className;
			tab.root = latest.root;
			tab.relativePath = latest.relativePath;
			tab.parentItemId = latest.parentItemId || "";

			if (!tab.dirty && latest.sourceHash && latest.sourceHash !== tab.sourceHash) {
				await reloadTabSource(tab.fileId, true);
			}
		}

		if (state.currentFileId && !state.openTabs.has(state.currentFileId)) {
			const next = state.openTabs.keys().next();
			state.currentFileId = next.done ? "" : next.value;
			if (state.currentFileId) switchTab(state.currentFileId, "primary");
			else state.editor.setValue("", "primary");
		}

		if (state.renamingItemId) {
			updateEditorHeader();
			if (showStatus) {
				setStatus("Loaded " + data.filesCount + " item(s).", "success");
			}
			return true;
		}

		renderTree();
		renderTabs();
		updateEditorHeader();
		if (state.openTabs.size > 0) saveWorkspaceState();

		if (showStatus) {
			setStatus("Loaded " + data.filesCount + " item(s).", "success");
		}

		return true;
	} catch (error) {
		updateConnectionUi(false, "Retrying");
		const now = Date.now();

		if (showStatus || now - state.lastConnectionErrorAt > 9000) {
			setStatus(error.message, "error");
			if (showStatus) showToast(error.message, "error");
			state.lastConnectionErrorAt = now;
		}

		return false;
	} finally {
		state.isLoadingFiles = false;
	}
}

async function restoreWorkspaceState() {
	if (!hasConnection()) return false;
	if (state.openTabs.size > 0) return false;

	const saved = loadJson(getWorkspaceStorageKey(), null);

	if (!saved || !Array.isArray(saved.tabIds) || saved.tabIds.length === 0) {
		return false;
	}

	const uniqueIds = Array.from(new Set(saved.tabIds.filter(Boolean)));
	const restoredIds = [];
	state.isRestoringWorkspace = true;

	for (const fileId of uniqueIds.slice(0, 32)) {
		const file = getLoadedFile(fileId);

		if (!isScriptItem(file)) {
			continue;
		}

		try {
			const data = await fetchSource(getAuth(), file.fileId);
			state.openTabs.set(file.fileId, {
				fileId: file.fileId,
				name: file.name,
				className: file.className,
				root: file.root,
				relativePath: file.relativePath,
				parentItemId: file.parentItemId || "",
				source: data.source || "",
				baseSourceHash: data.sourceHash || file.sourceHash || null,
				sourceHash: data.sourceHash || file.sourceHash || null,
				dirty: false,
				viewState: saved.viewStates && saved.viewStates[file.fileId] ? saved.viewStates[file.fileId] : null,
			});
			state.projectSearchCache.set(file.fileId, data.source || "");
			restoredIds.push(file.fileId);
		} catch (error) {}
	}

	state.isRestoringWorkspace = false;

	if (restoredIds.length === 0) {
		clearWorkspaceState();
		renderTabs();
		updateEditorHeader();
		return false;
	}

	const primaryId = restoredIds.includes(saved.currentFileId) ? saved.currentFileId : restoredIds[0];
	const secondaryId = restoredIds.includes(saved.secondaryFileId) ? saved.secondaryFileId : "";

	state.currentFileId = primaryId;
	state.secondaryFileId = secondaryId;
	state.activeGroup = saved.activeGroup === "secondary" && secondaryId ? "secondary" : "primary";

	const primaryTab = state.openTabs.get(primaryId);
	if (primaryTab) {
		state.editor.setValue(primaryTab.source || "", "primary");
		restoreEditorViewForTab(primaryTab, "primary");
		state.selectedKey = "item:" + primaryTab.fileId;
		state.selectedPayload = {
			root: primaryTab.root,
			relativePath: primaryTab.relativePath,
			itemId: primaryTab.fileId,
			label: primaryTab.root + "/" + primaryTab.relativePath,
		};
	}

	if (secondaryId) {
		const secondaryTab = state.openTabs.get(secondaryId);
		state.editor.setSplit(true);
		if (secondaryTab) {
			state.editor.setValue(secondaryTab.source || "", "secondary");
			restoreEditorViewForTab(secondaryTab, "secondary");
		}
	} else {
		state.editor.setSplit(false);
	}

	renderTabs();
	renderTree();
	updateEditorHeader();
	state.editor.focus(state.activeGroup);
	saveWorkspaceState(false);
	setTimeout(() => saveWorkspaceState(true), 25);
	setStatus("Restored " + restoredIds.length + " open script(s).", "success");
	return true;
}

function startPolling() {
	if (state.pollTimer) {
		clearInterval(state.pollTimer);
	}

	state.pollTimer = setInterval(() => loadSessionFiles(false), FILES_POLL_INTERVAL);
}

function getMaskedSessionId() {
	const value = String(state.sessionId || "").trim();
	if (!value) return "Session active";
	return value.length > 6 ? value.slice(0, 3) + "••••" + value.slice(-3) : "Session active";
}

function syncConnectionModalMode() {
	const connected = hasConnection();
	if (refs.connectionDialog) refs.connectionDialog.classList.toggle("connected", connected);
	if (refs.connectedSessionLabel) refs.connectedSessionLabel.textContent = connected ? getMaskedSessionId() : "Session active";
	if (refs.cancelConnectionButton) refs.cancelConnectionButton.textContent = connected ? tx("done") : tx("cancel");
	if (refs.connectionButton) refs.connectionButton.title = connected ? "Session options" : "Connect";
}

function openConnectionModal() {
	syncConnectionModalMode();
	refs.sessionInput.value = "";
	refs.secretInput.value = "";
	refs.connectionModal.classList.add("open");
	setTimeout(() => {
		if (hasConnection()) refs.disconnectButton.focus();
		else refs.sessionInput.focus();
	}, 30);
}

function closeConnectionModal() {
	refs.connectionModal.classList.remove("open");
}

async function connectSession(idOverride = null, secretOverride = null) {
	const id = String(idOverride !== null ? idOverride : refs.sessionInput.value).trim();
	const secret = String(secretOverride !== null ? secretOverride : refs.secretInput.value).trim();

	if (!id || !secret) {
		showToast("Session ID and secret are required.", "warning");
		return;
	}

	state.sessionId = id;
	state.secret = secret;
	sessionStorage.setItem(SESSION_STORAGE.sessionId, id);
	sessionStorage.setItem(SESSION_STORAGE.secret, secret);

	document.body.classList.add("session-loading");
	if (refs.gateConnectButton) refs.gateConnectButton.textContent = "Opening workspace...";
	setStatus("Connecting privately...", "warning");
	state.openTabs.clear();
	state.currentFileId = "";
	state.secondaryFileId = "";
	state.activeGroup = "primary";
	state.selectedKey = "";
	state.selectedPayload = null;
	state.editor.setValue("", "primary");

	const ok = await loadSessionFiles(true);
	if (ok) {
		await restoreWorkspaceState();
		startPolling();
		syncConnectionModalMode();
		closeConnectionModal();
		showToast("Workspace connected.", "success");
	}
	document.body.classList.remove("session-loading");
	if (refs.gateConnectButton) refs.gateConnectButton.textContent = "Enter workspace";
}

function disconnectSession() {
	const workspaceKey = getWorkspaceStorageKey();
	state.sessionId = "";
	state.secret = "";
	state.files = [];
	state.filesById = new Map();
	state.openTabs.clear();
	state.currentFileId = "";
	state.secondaryFileId = "";
	state.activeGroup = "primary";
	state.editor.setSplit(false);
	state.selectedKey = "";
	state.selectedPayload = null;
	sessionStorage.removeItem(SESSION_STORAGE.sessionId);
	sessionStorage.removeItem(SESSION_STORAGE.secret);
	try { localStorage.removeItem(workspaceKey); } catch (error) {}
	if (refs.gateSessionInput) refs.gateSessionInput.value = "";
	if (refs.gateSecretInput) refs.gateSecretInput.value = "";

	if (state.pollTimer) clearInterval(state.pollTimer);
	state.editor.setValue("", "primary");
	updateConnectionUi(false, "Disconnected");
	setStatus("Connection forgotten.", "warning");
	renderTree();
	renderTabs();
	updateEditorHeader();
	syncConnectionModalMode();
	closeConnectionModal();
}

function getBestCreationParent() {
	if (state.selectedPayload) {
		return state.selectedPayload;
	}

	const current = state.openTabs.get(state.currentFileId);

	if (current) {
		return {
			root: current.root,
			relativePath: getParentPath(current.relativePath),
			itemId: current.parentItemId || "",
			label: current.root + "/" + getParentPath(current.relativePath),
		};
	}

	return { root: "ServerScriptService", relativePath: "", itemId: "", label: "ServerScriptService" };
}

function openCreatePanel(parent, defaultClass = "Script") {
	if (!hasConnection()) {
		openConnectionModal();
		showToast("Connect privately first.", "warning");
		return;
	}

	state.pendingCreateParent = parent || getBestCreationParent();
	state.selectedCreateClass = defaultClass;
	refs.createLocation.textContent = "Parent: " + (state.pendingCreateParent.label || state.pendingCreateParent.root);
	renderCreateTypes();
	refs.createNameInput.value = getDefaultCreateName(state.selectedCreateClass);

	const anchor = document.querySelector(".tree-row.selected") || refs.refreshButton;
	const rect = anchor.getBoundingClientRect();
	const left = Math.min(Math.max(rect.left + 12, 12), window.innerWidth - 310);
	const top = Math.min(Math.max(rect.bottom + 8, 50), window.innerHeight - 330);
	refs.createModal.style.setProperty("--create-x", left + "px");
	refs.createModal.style.setProperty("--create-y", top + "px");
	refs.createModal.classList.add("open");

	setTimeout(() => refs.createNameInput.focus(), 20);
}

function closeCreatePanel() {
	refs.createModal.classList.remove("open");
	state.pendingCreateParent = null;
}

function renderCreateTypes() {
	refs.typeGrid.innerHTML = "";

	for (const type of CREATE_TYPES) {
		const button = document.createElement("button");
		button.type = "button";
		button.className = "type-card" + (type.className === state.selectedCreateClass ? " active" : "");
		button.innerHTML = `<div class="type-icon">${svgIcon(type.icon)}</div><div class="type-copy"><strong>${escapeHtml(type.label)}</strong></div><span class="type-short">${escapeHtml(type.description || "")}</span>`;
		button.addEventListener("click", () => {
			state.selectedCreateClass = type.className;
			refs.createNameInput.value = getDefaultCreateName(type.className);
			renderCreateTypes();
			refs.createNameInput.focus();
		});
		refs.typeGrid.appendChild(button);
	}
}

function getDefaultCreateName(className) {
	const type = CREATE_TYPES.find(item => item.className === className);
	return type ? type.defaultName : "Script";
}

async function createItem() {
	const parent = state.pendingCreateParent || getBestCreationParent();
	const className = state.selectedCreateClass;
	const name = sanitizeName(refs.createNameInput.value);

	if (!name) {
		showToast("Name is required.", "warning");
		refs.createNameInput.focus();
		return;
	}

	try {
		const data = await createRemoteItem(getAuth(), {
			className,
			name,
			root: parent.root,
			parentRelativePath: parent.relativePath || "",
			parentItemId: parent.itemId || "",
			source: getDefaultSourceForClass(className, name),
		});

		if (parent && parent.root) {
			const parentKey = parent.itemId ? "item:" + parent.itemId : "root:" + parent.root;
			state.expandedKeys.add(parentKey);
			saveJson(STORAGE.expanded, Array.from(state.expandedKeys));
		}

		await loadSessionFiles(false);
		closeCreatePanel();
		showToast("Created " + className + " " + name + ".", "success");

		if (data.item && isScriptItem(data.item)) {
			await openFile(data.item);
		} else if (data.item) {
			state.selectedKey = "item:" + data.item.fileId;
			state.selectedPayload = {
				root: data.item.root,
				relativePath: data.item.relativePath,
				itemId: data.item.fileId,
				label: data.item.root + "/" + data.item.relativePath,
			};
			renderTree();
		}
	} catch (error) {
		showToast(error.message, "error");
		setStatus(error.message, "error");
	}
}

function getRenameTarget() {
	if (state.selectedPayload && state.selectedPayload.itemId) {
		return getLoadedFile(state.selectedPayload.itemId);
	}

	if (state.currentFileId) {
		return getLoadedFile(state.currentFileId);
	}

	return null;
}

function startRenameSelected() {
	const item = getRenameTarget();

	if (!item) {
		showToast("Select a script or folder to rename.", "warning");
		return;
	}

	if (!item.fileId || !item.root || !item.relativePath) {
		showToast("This item cannot be renamed.", "warning");
		return;
	}

	state.renamingItemId = item.fileId;
	state.renameStartedAt = Date.now();
	state.selectedKey = "item:" + item.fileId;
	state.selectedPayload = {
		root: item.root,
		relativePath: item.relativePath,
		itemId: item.fileId,
		label: item.root + "/" + item.relativePath,
	};

	renderTree();
}

async function renameItem(fileId, rawName) {
	const item = getLoadedFile(fileId);
	const newName = sanitizeName(rawName);
	state.renamingItemId = "";
	state.renameStartedAt = 0;

	if (!item) {
		showToast("Item no longer exists.", "warning");
		renderTree();
		return;
	}

	if (!newName) {
		showToast("Name is required.", "warning");
		renderTree();
		return;
	}

	if (newName === item.name) {
		renderTree();
		return;
	}

	try {
		const data = await moveRemoteItem(getAuth(), fileId, {
			root: item.root,
			parentRelativePath: item.parentRelativePath || getParentPath(item.relativePath),
			parentItemId: item.parentItemId || "",
			name: newName,
		});

		await loadSessionFiles(false);
		const renamed = data.item || getLoadedFile(fileId);

		if (renamed && renamed.fileId) {
			state.selectedKey = "item:" + renamed.fileId;
			state.selectedPayload = {
				root: renamed.root,
				relativePath: renamed.relativePath,
				itemId: renamed.fileId,
				label: renamed.root + "/" + renamed.relativePath,
			};
		}

		showToast("Renamed to " + newName + ".", "success");
	} catch (error) {
		showToast(error.message, "error");
		setStatus(error.message, "error");
		renderTree();
	}
}

async function moveItem(fileId, targetParent) {
	if (!fileId || !targetParent || !hasConnection()) return;

	const item = getLoadedFile(fileId);
	if (!item) {
		showToast("Item no longer exists.", "warning");
		return;
	}

	if (isDescendantTarget(item, targetParent)) {
		showToast("You cannot move an item inside itself.", "warning");
		return;
	}

	if (item.root === targetParent.root && getParentPath(item.relativePath) === (targetParent.relativePath || "")) {
		return;
	}

	try {
		await moveRemoteItem(getAuth(), fileId, {
			root: targetParent.root,
			parentRelativePath: targetParent.relativePath || "",
			parentItemId: targetParent.itemId || "",
			name: item.name,
		});

		await loadSessionFiles(false);
		showToast("Moved " + item.name + ".", "success");
	} catch (error) {
		showToast(error.message, "error");
		setStatus(error.message, "error");
	}
}

function getDeleteTarget() {
	if (state.selectedPayload && state.selectedPayload.itemId) {
		return getLoadedFile(state.selectedPayload.itemId);
	}

	if (state.currentFileId) {
		return getLoadedFile(state.currentFileId);
	}

	return null;
}

async function deleteSelectedItem() {
	const item = getDeleteTarget();
	if (!item) {
		showToast("Select a script or folder first.", "warning");
		return;
	}

	const confirmed = await requestConfirm({
		title: "Delete Instance",
		message: "Delete " + item.className + " " + getFullPath(item) + "? Descendant scripts/folders will also be removed.",
		acceptText: "Delete",
	});

	if (!confirmed) return;

	try {
		const data = await deleteRemoteItem(getAuth(), item.fileId);
		const removed = Array.isArray(data.removed) ? data.removed : [{ fileId: item.fileId }];

		for (const removedItem of removed) {
			if (state.openTabs.has(removedItem.fileId)) {
				await closeTab(removedItem.fileId, true);
			}
		}

		state.selectedKey = "";
		state.selectedPayload = null;
		await loadSessionFiles(false);
		showToast("Deleted " + item.name + ".", "success");
	} catch (error) {
		showToast(error.message, "error");
		setStatus(error.message, "error");
	}
}

function openSettings() {
	populateLanguageSelect(refs.languageInput, state.language);
	applyInterfaceTheme(state.settings.interfaceTheme || DEFAULT_SETTINGS.interfaceTheme);
	refs.fontFamilyInput.value = state.settings.fontFamily;
	refs.fontSizeInput.value = state.settings.fontSize;
	refs.autosaveInput.value = state.settings.autosaveMs;
	refs.wordWrapInput.value = state.settings.wordWrap;
	refs.editorThemeInput.value = state.settings.editorTheme || "cloud-dark";
	refs.minimapInput.checked = !!state.settings.minimap;
	refs.settingsModal.classList.add("open");
	updateSettingsPreview();
}

function closeSettings() {
	refs.settingsModal.classList.remove("open");
}

function applySettings() {
	state.language = applyLanguage(refs.languageInput ? refs.languageInput.value : state.language);
	populateLanguageSelect(refs.betaLanguageSelect, state.language);
	updateEditorHeader();
	state.settings = {
		interfaceTheme: applyInterfaceTheme(refs.appearanceInput ? refs.appearanceInput.value : state.settings.interfaceTheme),
		fontFamily: refs.fontFamilyInput.value.trim() || DEFAULT_SETTINGS.fontFamily,
		fontSize: clamp(Number(refs.fontSizeInput.value) || DEFAULT_SETTINGS.fontSize, 10, 28),
		autosaveMs: clamp(Number(refs.autosaveInput.value) || DEFAULT_SETTINGS.autosaveMs, 1000, 15000),
		wordWrap: refs.wordWrapInput.value === "on" ? "on" : "off",
		editorTheme: refs.editorThemeInput.value || "cloud-dark",
		minimap: !!refs.minimapInput.checked,
	};

	saveJson(STORAGE.settings, state.settings);
	state.editor.applySettings(state.settings);
	closeSettings();
	showToast(tx("settings") + " applied.", "success");
}

function resetSettings() {
	state.settings = { ...DEFAULT_SETTINGS };
	saveJson(STORAGE.settings, state.settings);
	applyInterfaceTheme(state.settings.interfaceTheme);
	state.editor.applySettings(state.settings);
	openSettings();
}

function openProjectSearch() {
	if (!hasConnection()) {
		openConnectionModal();
		return;
	}
	refs.projectSearchModal.classList.add("open");
	refs.projectSearchStatus.textContent = "Search every script in the current project.";
	setTimeout(() => { refs.projectSearchInput.focus(); refs.projectSearchInput.select(); }, 30);
}

function closeProjectSearch() {
	refs.projectSearchModal.classList.remove("open");
}

function normalizeSearchText(value) {
	return String(value || "").toLowerCase();
}

async function getSourceForSearch(file) {
	if (state.projectSearchCache.has(file.fileId)) {
		return state.projectSearchCache.get(file.fileId);
	}

	const openTab = state.openTabs.get(file.fileId);
	if (openTab) {
		state.projectSearchCache.set(file.fileId, openTab.source || "");
		return openTab.source || "";
	}

	const data = await fetchSource(getAuth(), file.fileId);
	const source = data.source || "";
	state.projectSearchCache.set(file.fileId, source);
	return source;
}

async function runProjectSearch() {
	const query = refs.projectSearchInput.value.trim();
	refs.projectSearchResults.innerHTML = "";

	if (!query) {
		refs.projectSearchStatus.textContent = "Type something to search.";
		return;
	}

	const scripts = state.files.filter(isScriptItem);
	const needle = normalizeSearchText(query);
	const results = [];
	refs.projectSearchStatus.textContent = "Searching " + scripts.length + " script(s)...";

	for (const file of scripts) {
		try {
			const source = await getSourceForSearch(file);
			const lines = source.split(/\r?\n/);
			for (let index = 0; index < lines.length; index++) {
				if (normalizeSearchText(lines[index]).includes(needle)) {
					results.push({ file, lineNumber: index + 1, text: lines[index] });
					if (results.length >= 150) break;
				}
			}
		} catch (error) {
			results.push({ file, lineNumber: 0, text: "Could not read file: " + error.message, error: true });
		}

		if (results.length >= 150) break;
	}

	refs.projectSearchStatus.textContent = results.length + " result(s) for \"" + query + "\"" + (results.length >= 150 ? " · limited to 150" : "");
	renderProjectSearchResults(results);
}

function renderProjectSearchResults(results) {
	refs.projectSearchResults.innerHTML = "";
	if (results.length === 0) {
		refs.projectSearchResults.innerHTML = '<div class="search-empty">No matches found.</div>';
		return;
	}

	const fragment = document.createDocumentFragment();
	for (const result of results) {
		const button = document.createElement("button");
		button.type = "button";
		button.className = "search-result" + (result.error ? " error" : "");
		button.innerHTML = `
			<div class="search-result-title">${escapeHtml(result.file.name)} <span>${escapeHtml(result.file.className)}</span></div>
			<div class="search-result-path">${escapeHtml(result.file.root + "/" + result.file.relativePath)}${result.lineNumber ? ":" + result.lineNumber : ""}</div>
			<code>${escapeHtml(result.text.trim() || " ")}</code>
		`;
		button.addEventListener("click", async () => {
			await openFile(result.file);
			closeProjectSearch();
			if (result.lineNumber) state.editor.focusLine(result.lineNumber, "primary");
		});
		fragment.appendChild(button);
	}
	refs.projectSearchResults.appendChild(fragment);
}

function updateSettingsPreview() {
	if (!refs.settingsPreview) return;
	const themeName = refs.editorThemeInput.value || state.settings.editorTheme || DEFAULT_SETTINGS.editorTheme;
	refs.settingsPreview.dataset.theme = themeName;
	refs.settingsPreview.style.fontFamily = refs.fontFamilyInput.value || DEFAULT_SETTINGS.fontFamily;
	refs.settingsPreview.style.fontSize = (Number(refs.fontSizeInput.value) || DEFAULT_SETTINGS.fontSize) + "px";
	refs.settingsPreviewMeta.textContent = "Lua · " + (Number(refs.fontSizeInput.value) || DEFAULT_SETTINGS.fontSize) + "px · " + (Number(refs.autosaveInput.value) || DEFAULT_SETTINGS.autosaveMs) + "ms";
}

function openBetaWarning(onContinue) {
	if (!refs.betaWarningModal) {
		if (typeof onContinue === "function") onContinue();
		return;
	}

	populateLanguageSelect(refs.betaLanguageSelect, state.language);
	applyLanguage(state.language);
	refs.betaWarningModal.classList.add("open");
	refs.betaWarningModal.dataset.waiting = "true";
	refs.betaWarningModal._onContinue = onContinue || null;
}

function closeBetaWarning() {
	if (!refs.betaWarningModal) return;
	refs.betaWarningModal.classList.remove("open");
	refs.betaWarningModal.dataset.waiting = "false";
	const callback = refs.betaWarningModal._onContinue;
	refs.betaWarningModal._onContinue = null;
	if (typeof callback === "function") callback();
}


function setupResizer() {
	const saved = Number(localStorage.getItem(STORAGE.sidebar));
	if (saved) {
		document.documentElement.style.setProperty("--side-width", clamp(saved, 260, 620) + "px");
	}

	let dragging = false;

	refs.resizer.addEventListener("mousedown", event => {
		dragging = true;
		document.body.classList.add("resizing");
		event.preventDefault();
	});

	document.addEventListener("mousemove", event => {
		if (!dragging) return;
		const width = clamp(event.clientX, 260, 620);
		document.documentElement.style.setProperty("--side-width", width + "px");
		localStorage.setItem(STORAGE.sidebar, String(width));
	});

	document.addEventListener("mouseup", () => {
		if (!dragging) return;
		dragging = false;
		document.body.classList.remove("resizing");
	});
}

function handleEditorKeys(event, group = state.activeGroup) {
	const key = event.key.toLowerCase();

	if ((event.ctrlKey || event.metaKey) && key === "s") {
		event.preventDefault();
		event.stopPropagation();
		saveCurrentFile(false, getActiveFileId(group));
	}

	if ((event.ctrlKey || event.metaKey) && key === "w") {
		event.preventDefault();
		event.stopPropagation();
		const fileId = getActiveFileId(group);
		if (fileId) closeTab(fileId);
	}

	if ((event.ctrlKey || event.metaKey) && event.shiftKey && key === "e") {
		event.preventDefault();
		event.stopPropagation();
		foldActiveScript();
	}

	if ((event.ctrlKey || event.metaKey) && !event.shiftKey && key === "e") {
		event.preventDefault();
		event.stopPropagation();
		unfoldActiveScript();
	}

	if ((event.ctrlKey || event.metaKey) && key === "i") {
		event.preventDefault();
		event.stopPropagation();
		openCreatePanel(getBestCreationParent(), "Script");
	}
}

function bindEvents() {
	refs.loadButton.addEventListener("click", connectSession);
	if (refs.gateConnectButton) refs.gateConnectButton.addEventListener("click", () => connectSession(refs.gateSessionInput.value, refs.gateSecretInput.value));
	if (refs.gateSessionInput) refs.gateSessionInput.addEventListener("keydown", event => { if (event.key === "Enter") connectSession(refs.gateSessionInput.value, refs.gateSecretInput.value); });
	if (refs.gateSecretInput) refs.gateSecretInput.addEventListener("keydown", event => { if (event.key === "Enter") connectSession(refs.gateSessionInput.value, refs.gateSecretInput.value); });
	refs.connectionButton.addEventListener("click", openConnectionModal);
	refs.closeConnectionButton.addEventListener("click", closeConnectionModal);
	refs.cancelConnectionButton.addEventListener("click", closeConnectionModal);
	refs.disconnectButton.addEventListener("click", disconnectSession);
	refs.refreshButton.addEventListener("click", () => loadSessionFiles(true));
	refs.saveButton.addEventListener("click", () => saveCurrentFile(false));
	if (refs.splitButton) refs.splitButton.addEventListener("click", () => splitTab(state.currentFileId));
	refs.closeSplitButton.addEventListener("click", closeSplit);
	refs.secondaryCloseButton.addEventListener("click", closeSplit);
	refs.projectSearchButton.addEventListener("click", openProjectSearch);
	refs.closeProjectSearchButton.addEventListener("click", closeProjectSearch);
	refs.runProjectSearchButton.addEventListener("click", runProjectSearch);
	refs.projectSearchInput.addEventListener("keydown", event => {
		if (event.key === "Enter") runProjectSearch();
		if (event.key === "Escape") closeProjectSearch();
	});
	for (const input of [refs.languageInput, refs.appearanceInput, refs.fontFamilyInput, refs.fontSizeInput, refs.autosaveInput, refs.wordWrapInput, refs.editorThemeInput, refs.minimapInput]) {
		if (!input) continue;
		input.addEventListener("input", updateSettingsPreview);
		input.addEventListener("change", updateSettingsPreview);
	}
	refs.searchInput.addEventListener("input", renderTree);
	refs.editorShell.addEventListener("dragover", event => {
		const sourceId = state.draggingTabId || event.dataTransfer.getData("text/cloud-tab");
		if (!sourceId || !state.openTabs.has(sourceId)) return;
		event.preventDefault();
		refs.splitDropHint.classList.add("visible");
	});
	refs.editorShell.addEventListener("dragleave", () => refs.splitDropHint.classList.remove("visible"));
	refs.editorShell.addEventListener("drop", event => {
		const sourceId = state.draggingTabId || event.dataTransfer.getData("text/cloud-tab");
		refs.splitDropHint.classList.remove("visible");
		if (!sourceId || !state.openTabs.has(sourceId)) return;
		event.preventDefault();
		const rect = refs.editorShell.getBoundingClientRect();
		if (event.clientX > rect.left + rect.width * 0.45) splitTab(sourceId);
	});
	refs.sessionInput.addEventListener("keydown", event => {
		if (event.key === "Enter") refs.secretInput.focus();
	});
	refs.secretInput.addEventListener("keydown", event => {
		if (event.key === "Enter") connectSession();
	});

	refs.closeCreateButton.addEventListener("click", closeCreatePanel);
	refs.cancelCreateButton.addEventListener("click", closeCreatePanel);
	refs.confirmCreateButton.addEventListener("click", createItem);
	refs.createNameInput.addEventListener("keydown", event => {
		if (event.key === "Enter") createItem();
		if (event.key === "Escape") closeCreatePanel();
	});

	refs.closeConfirmButton.addEventListener("click", () => closeConfirm(false));
	refs.cancelConfirmButton.addEventListener("click", () => closeConfirm(false));
	refs.acceptConfirmButton.addEventListener("click", () => closeConfirm(true));

	refs.settingsButton.addEventListener("click", openSettings);
	refs.closeSettingsButton.addEventListener("click", closeSettings);
	refs.saveSettingsButton.addEventListener("click", applySettings);
	refs.resetSettingsButton.addEventListener("click", resetSettings);
	if (refs.languageInput) {
		refs.languageInput.addEventListener("change", () => {
			state.language = applyLanguage(refs.languageInput.value);
			populateLanguageSelect(refs.betaLanguageSelect, state.language);
			updateEditorHeader();
		});
	}
	if (refs.betaLanguageSelect) {
		refs.betaLanguageSelect.addEventListener("change", () => {
			state.language = applyLanguage(refs.betaLanguageSelect.value);
			populateLanguageSelect(refs.languageInput, state.language);
			updateEditorHeader();
		});
	}
	if (refs.appearanceInput) {
		refs.appearanceInput.addEventListener("change", () => {
			state.settings.interfaceTheme = applyInterfaceTheme(refs.appearanceInput.value);
			saveJson(STORAGE.settings, state.settings);
		});
	}
	if (refs.gateAppearanceSelect) {
		refs.gateAppearanceSelect.addEventListener("change", () => {
			state.settings.interfaceTheme = applyInterfaceTheme(refs.gateAppearanceSelect.value);
			saveJson(STORAGE.settings, state.settings);
		});
	}
	if (refs.betaContinueButton) refs.betaContinueButton.addEventListener("click", closeBetaWarning);

	window.addEventListener("keydown", event => {
		handleGlobalShortcut(event);
	}, true);

	window.addEventListener("beforeunload", event => {
		saveWorkspaceState();
		const hasDirtyTabs = Array.from(state.openTabs.values()).some(tab => tab.dirty);
		if (!hasDirtyTabs) return;
		event.preventDefault();
		event.returnValue = "";
	});

	document.addEventListener("keydown", event => {
		if (handleGlobalShortcut(event)) return;
		const key = event.key.toLowerCase();

		if ((event.ctrlKey || event.metaKey) && key === "s") {
			event.preventDefault();
			saveCurrentFile(false);
		}

		if ((event.ctrlKey || event.metaKey) && key === "w") {
			event.preventDefault();
			if (state.currentFileId) closeTab(state.currentFileId);
		}

		if ((event.ctrlKey || event.metaKey) && key === "i") {
			event.preventDefault();
			openCreatePanel(getBestCreationParent(), "Script");
		}

		if (event.key === "F2" && !isInputLike(event.target)) {
			event.preventDefault();
			startRenameSelected();
		}

		if (event.key === "Delete" && !isInputLike(event.target) && getDeleteTarget()) {
			event.preventDefault();
			deleteSelectedItem();
		}

		if (event.key === "Escape") {
			closeProjectSearch();
			closeCreatePanel();
			closeSettings();
			closeConfirm(false);
			if (refs.connectionModal.classList.contains("open") && hasConnection()) closeConnectionModal();
		}
	});
}

function bootEditor() {
	state.editor = createEditorController({
		host: refs.monacoHost,
		fallback: refs.fallbackEditor,
		secondaryHost: refs.monacoHostSecondary,
		secondaryFallback: refs.fallbackEditorSecondary,
		shell: refs.editorShell,
		settings: state.settings,
		onChange: markCurrentDirty,
		onFallbackKeyDown: handleEditorKeys,
		onCursor(position, group) {
			state.activeGroup = group || state.activeGroup;
			if (Date.now() >= state.suppressViewStateSaveUntil) saveEditorViewForGroup(group);
			refs.footerRight.textContent = "Ln " + position.lineNumber + ", Col " + position.column + " · Ctrl+1-9 tabs · Ctrl+W close tab · Ctrl+Shift+E fold · Ctrl+E unfold";
			updateEditorHeader();
		},
		onActiveGroup: setActiveGroup,
		onSave: group => saveCurrentFile(false, getActiveFileId(group)),
		onClose: group => {
			const fileId = getActiveFileId(group);
			if (fileId) closeTab(fileId);
		},
		onCreate: () => openCreatePanel(getBestCreationParent(), "Script"),
		onProjectSearch: openProjectSearch,
		onFoldAll: foldActiveScript,
		onUnfoldAll: unfoldActiveScript,
	});
}

function boot() {
	const savedSession = sessionStorage.getItem(SESSION_STORAGE.sessionId) || "";
	const savedSecret = sessionStorage.getItem(SESSION_STORAGE.secret) || "";

	state.sessionId = savedSession;
	state.secret = savedSecret;

	applyInterfaceTheme(state.settings.interfaceTheme || DEFAULT_SETTINGS.interfaceTheme);
	setupResizer();
	bootEditor();
	bindEvents();
	populateLanguageSelect(refs.languageInput, state.language);
	populateLanguageSelect(refs.betaLanguageSelect, state.language);
	applyLanguage(state.language);
	renderTree();
	updateEditorHeader();
	updateConnectionUi(hasConnection(), hasConnection() ? "Connected" : "Disconnected");
	syncConnectionModalMode();

	if (hasConnection()) {
		setTimeout(async () => {
			const ok = await loadSessionFiles(true);
			if (ok) {
				await restoreWorkspaceState();
				startPolling();
			}
		}, 150);
		setTimeout(() => openBetaWarning(null), 180);
	} else {
		setTimeout(() => openBetaWarning(openConnectionModal), 150);
	}
}

boot();
