import { STORAGE } from "./config.js";
import { loadJson, saveJson } from "./helpers.js";

export const LANGUAGES = [
	{ code: "en", label: "English" },
	{ code: "pt-BR", label: "Português (Brasil)" },
	{ code: "es", label: "Español" },
	{ code: "fr", label: "Français" },
	{ code: "de", label: "Deutsch" },
];

export const TRANSLATIONS = {
	en: {
		brandSubtitle: "A complete integrated development environment for Roblox.",
		downloadApp: "Download Cloud App",
		robloxPlugin: "Plugin",
		explorer: "Explorer",
		privateSession: "Private session",
		project: "Project",
		searchPlaceholder: "Search by name, class or path",
		noFileOpen: "No file open",
		filePathEmpty: "Connect to a private Cloud session and open a script.",
		search: "Search",
		closeSplit: "Close Split",
		save: "Save",
		ready: "Ready",
		footerHelp: "Ctrl+W close tab · Ctrl+1-9 switch tabs · Ctrl+Shift+E fold script · Ctrl+E unfold script",
		connectionTitle: "Private Connection",
		secureTitle: "Session data is hidden from the sidebar.",
		secureText: "The server checks the secret before reading, saving, moving or deleting files.",
		sessionId: "Session ID",
		sessionSecret: "Session Secret",
		pasteSessionId: "Paste session ID",
		pasteSessionSecret: "Paste session secret",
		forget: "Forget",
		cancel: "Cancel",
		connect: "Connect",
		newInstance: "New Instance",
		name: "Name",
		instanceName: "Instance name",
		create: "Create",
		confirm: "Confirm",
		settings: "Editor Settings",
		interfaceLanguage: "Interface language",
		appearance: "Appearance",
		systemDefault: "System default",
		dark: "Dark",
		light: "Light",
		fontFamily: "Font family",
		fontSize: "Font size",
		autosave: "Autosave ms",
		wordWrap: "Word wrap",
		off: "Off",
		on: "On",
		editorTheme: "Editor theme",
		minimap: "Minimap",
		themePreview: "Theme Preview",
		reset: "Reset",
		apply: "Apply",
		betaTitle: "ATTENTION",
		betaEyebrow: "Cloud Beta Access",
		betaText: "Cloud is currently in beta and is available only to a limited number of computers involved in the project. If you have access, you may use it freely, test it, and use it in your own Roblox projects.",
		betaNote: "Only the interface language changes. Your code is never translated.",
		continueForge: "Continue to Cloud",
		language: "Language",
	},
	"pt-BR": {
		brandSubtitle: "A complete integrated development environment for Roblox.",
		downloadApp: "Baixar Cloud App",
		robloxPlugin: "Plugin",
		explorer: "Explorador",
		privateSession: "Sessão privada",
		project: "Projeto",
		searchPlaceholder: "Buscar por nome, classe ou caminho",
		noFileOpen: "Nenhum arquivo aberto",
		filePathEmpty: "Conecte uma sessão privada do Cloud e abra um script.",
		search: "Buscar",
		closeSplit: "Fechar divisão",
		save: "Salvar",
		ready: "Pronto",
		footerHelp: "Ctrl+W fecha aba · Ctrl+1-9 troca abas · Ctrl+Shift+E compacta script · Ctrl+E expande script",
		connectionTitle: "Conexão privada",
		secureTitle: "Os dados da sessão ficam ocultos na barra lateral.",
		secureText: "O servidor verifica o segredo antes de ler, salvar, mover ou excluir arquivos.",
		sessionId: "ID da sessão",
		sessionSecret: "Segredo da sessão",
		pasteSessionId: "Cole o ID da sessão",
		pasteSessionSecret: "Cole o segredo da sessão",
		forget: "Esquecer",
		cancel: "Cancelar",
		connect: "Conectar",
		newInstance: "Nova instância",
		name: "Nome",
		instanceName: "Nome da instância",
		create: "Criar",
		confirm: "Confirmar",
		settings: "Configurações do editor",
		interfaceLanguage: "Idioma da interface",
		appearance: "Aparência",
		systemDefault: "Padrão do sistema",
		dark: "Escuro",
		light: "Claro",
		fontFamily: "Fonte",
		fontSize: "Tamanho da fonte",
		autosave: "Autosave em ms",
		wordWrap: "Quebra de linha",
		off: "Desligado",
		on: "Ligado",
		editorTheme: "Tema do editor",
		minimap: "Minimapa",
		themePreview: "Prévia do tema",
		reset: "Redefinir",
		apply: "Aplicar",
		betaTitle: "ATENÇÃO",
		betaEyebrow: "Acesso Beta do Cloud",
		betaText: "Esta aplicação está em BETA e está disponível apenas em um número limitado de computadores usados pela equipe de desenvolvimento do projeto. Se você tiver acesso, pode usar livremente, testar e usar em seus projetos no Roblox.",
		betaNote: "Somente a interface muda de idioma. O seu código nunca é traduzido.",
		continueForge: "Continuar para o Cloud",
		language: "Idioma",
	},
	es: {
		brandSubtitle: "A complete integrated development environment for Roblox.",
		downloadApp: "Descargar Cloud App",
		robloxPlugin: "Plugin",
		explorer: "Explorador",
		privateSession: "Sesión privada",
		project: "Proyecto",
		searchPlaceholder: "Buscar por nombre, clase o ruta",
		noFileOpen: "Ningún archivo abierto",
		filePathEmpty: "Conecta una sesión privada de Cloud y abre un script.",
		search: "Buscar",
		closeSplit: "Cerrar división",
		save: "Guardar",
		ready: "Listo",
		footerHelp: "Ctrl+W cerrar pestaña · Ctrl+1-9 cambiar pestañas · Ctrl+Shift+E plegar script · Ctrl+E desplegar script",
		connectionTitle: "Conexión privada",
		secureTitle: "Los datos de sesión están ocultos en la barra lateral.",
		secureText: "El servidor verifica el secreto antes de leer, guardar, mover o eliminar archivos.",
		sessionId: "ID de sesión",
		sessionSecret: "Secreto de sesión",
		pasteSessionId: "Pega el ID de sesión",
		pasteSessionSecret: "Pega el secreto de sesión",
		forget: "Olvidar",
		cancel: "Cancelar",
		connect: "Conectar",
		newInstance: "Nueva instancia",
		name: "Nombre",
		instanceName: "Nombre de instancia",
		create: "Crear",
		confirm: "Confirmar",
		settings: "Configuración del editor",
		interfaceLanguage: "Idioma de la interfaz",
		appearance: "Apariencia",
		systemDefault: "Predeterminado del sistema",
		dark: "Oscuro",
		light: "Claro",
		fontFamily: "Familia de fuente",
		fontSize: "Tamaño de fuente",
		autosave: "Autoguardado ms",
		wordWrap: "Ajuste de línea",
		off: "Apagado",
		on: "Encendido",
		editorTheme: "Tema del editor",
		minimap: "Minimapa",
		themePreview: "Vista previa del tema",
		reset: "Restablecer",
		apply: "Aplicar",
		betaTitle: "ATENCIÓN",
		betaEyebrow: "Acceso Beta de Cloud",
		betaText: "Esta aplicación está en BETA y solo está disponible en un número limitado de computadoras usadas por el equipo de desarrollo del proyecto. Si tienes acceso, puedes usarla libremente, probarla y usarla en tus proyectos de Roblox.",
		betaNote: "Solo cambia el idioma de la interfaz. Tu código nunca se traduce.",
		continueForge: "Continuar a Cloud",
		language: "Idioma",
	},
	fr: {
		brandSubtitle: "A complete integrated development environment for Roblox.",
		downloadApp: "Télécharger Cloud App",
		robloxPlugin: "Plugin",
		explorer: "Explorateur",
		privateSession: "Session privée",
		project: "Projet",
		searchPlaceholder: "Rechercher par nom, classe ou chemin",
		noFileOpen: "Aucun fichier ouvert",
		filePathEmpty: "Connectez une session Cloud privée et ouvrez un script.",
		search: "Rechercher",
		closeSplit: "Fermer la division",
		save: "Enregistrer",
		ready: "Prêt",
		footerHelp: "Ctrl+W fermer l’onglet · Ctrl+1-9 changer d’onglet · Ctrl+Shift+E plier le script · Ctrl+E déplier le script",
		connectionTitle: "Connexion privée",
		secureTitle: "Les données de session sont masquées dans la barre latérale.",
		secureText: "Le serveur vérifie le secret avant de lire, enregistrer, déplacer ou supprimer des fichiers.",
		sessionId: "ID de session",
		sessionSecret: "Secret de session",
		pasteSessionId: "Collez l’ID de session",
		pasteSessionSecret: "Collez le secret de session",
		forget: "Oublier",
		cancel: "Annuler",
		connect: "Connecter",
		newInstance: "Nouvelle instance",
		name: "Nom",
		instanceName: "Nom de l’instance",
		create: "Créer",
		confirm: "Confirmer",
		settings: "Paramètres de l’éditeur",
		interfaceLanguage: "Langue de l’interface",
		appearance: "Apparence",
		systemDefault: "Système",
		dark: "Sombre",
		light: "Clair",
		fontFamily: "Police",
		fontSize: "Taille de police",
		autosave: "Sauvegarde auto ms",
		wordWrap: "Retour à la ligne",
		off: "Désactivé",
		on: "Activé",
		editorTheme: "Thème de l’éditeur",
		minimap: "Minicarte",
		themePreview: "Aperçu du thème",
		reset: "Réinitialiser",
		apply: "Appliquer",
		betaTitle: "ATTENTION",
		betaEyebrow: "Accès bêta Cloud",
		betaText: "Cette application est actuellement en BETA et n’est disponible que sur un nombre limité d’ordinateurs utilisés par l’équipe de développement du projet. Si vous y avez accès, vous pouvez l’utiliser librement, la tester et l’utiliser dans vos projets Roblox.",
		betaNote: "Seule la langue de l’interface change. Votre code n’est jamais traduit.",
		continueForge: "Continuer vers Cloud",
		language: "Langue",
	},
	de: {
		brandSubtitle: "A complete integrated development environment for Roblox.",
		downloadApp: "Cloud App herunterladen",
		robloxPlugin: "Plugin",
		explorer: "Explorer",
		privateSession: "Private Sitzung",
		project: "Projekt",
		searchPlaceholder: "Nach Name, Klasse oder Pfad suchen",
		noFileOpen: "Keine Datei geöffnet",
		filePathEmpty: "Verbinde eine private Cloud-Sitzung und öffne ein Script.",
		search: "Suchen",
		closeSplit: "Split schließen",
		save: "Speichern",
		ready: "Bereit",
		footerHelp: "Ctrl+W Tab schließen · Ctrl+1-9 Tabs wechseln · Ctrl+Shift+E Script einklappen · Ctrl+E ausklappen",
		connectionTitle: "Private Verbindung",
		secureTitle: "Sitzungsdaten sind in der Seitenleiste verborgen.",
		secureText: "Der Server prüft das Secret vor dem Lesen, Speichern, Verschieben oder Löschen von Dateien.",
		sessionId: "Sitzungs-ID",
		sessionSecret: "Sitzungs-Secret",
		pasteSessionId: "Sitzungs-ID einfügen",
		pasteSessionSecret: "Sitzungs-Secret einfügen",
		forget: "Vergessen",
		cancel: "Abbrechen",
		connect: "Verbinden",
		newInstance: "Neue Instanz",
		name: "Name",
		instanceName: "Instanzname",
		create: "Erstellen",
		confirm: "Bestätigen",
		settings: "Editor-Einstellungen",
		interfaceLanguage: "Sprache der Oberfläche",
		appearance: "Darstellung",
		systemDefault: "Systemstandard",
		dark: "Dunkel",
		light: "Hell",
		fontFamily: "Schriftfamilie",
		fontSize: "Schriftgröße",
		autosave: "Autosave ms",
		wordWrap: "Zeilenumbruch",
		off: "Aus",
		on: "Ein",
		editorTheme: "Editor-Theme",
		minimap: "Minimap",
		themePreview: "Theme-Vorschau",
		reset: "Zurücksetzen",
		apply: "Anwenden",
		betaTitle: "ACHTUNG",
		betaEyebrow: "Cloud Beta-Zugang",
		betaText: "Diese Anwendung befindet sich derzeit in der BETA und ist nur auf einer begrenzten Anzahl von Computern verfügbar, die vom Entwicklungsteam des Projekts genutzt werden. Wenn du Zugang hast, kannst du sie frei testen und in deinen Roblox-Projekten verwenden.",
		betaNote: "Nur die Oberfläche wird übersetzt. Dein Code wird niemals übersetzt.",
		continueForge: "Weiter zu Cloud",
		language: "Sprache",
	},
};

function normalizeLanguage(language) {
	const value = String(language || "").trim();
	return LANGUAGES.some(item => item.code === value) ? value : "en";
}

export function getLanguage() {
	return normalizeLanguage(loadJson(STORAGE.language, "en"));
}

export function setLanguage(language) {
	const normalized = normalizeLanguage(language);
	saveJson(STORAGE.language, normalized);
	return normalized;
}

export function t(language, key) {
	const normalized = normalizeLanguage(language);
	return (TRANSLATIONS[normalized] && TRANSLATIONS[normalized][key]) || TRANSLATIONS.en[key] || key;
}

function setText(selector, value) {
	const element = document.querySelector(selector);
	if (element) element.textContent = value;
}

function setPlaceholder(selector, value) {
	const element = document.querySelector(selector);
	if (element) element.placeholder = value;
}

export function populateLanguageSelect(select, activeLanguage = getLanguage()) {
	if (!select) return;
	select.innerHTML = "";
	for (const item of LANGUAGES) {
		const option = document.createElement("option");
		option.value = item.code;
		option.textContent = item.label;
		select.appendChild(option);
	}
	select.value = normalizeLanguage(activeLanguage);
}

export function applyLanguage(language) {
	const lang = setLanguage(language);
	document.documentElement.lang = lang;

	setText(".brand-copy span", t(lang, "brandSubtitle"));
	setText("#downloadAppButton", t(lang, "downloadApp"));
	setText("#robloxPluginButton", t(lang, "robloxPlugin"));
	setText(".sidebar-title > span", t(lang, "explorer"));
	setText(".connection-card-title", t(lang, "privateSession"));
	setText(".project-header > span:first-child", t(lang, "project"));
	setPlaceholder("#searchInput", t(lang, "searchPlaceholder"));
	setText("#projectSearchButton", t(lang, "search"));
	setText("#closeSplitButton", t(lang, "closeSplit"));
	setText("#saveButton", t(lang, "save"));
	setText("#footerLeft", t(lang, "ready"));
	setText("#footerRight", t(lang, "footerHelp"));
	setText("#connectionModal .modal-title", t(lang, "connectionTitle"));
	setText("#connectionModal .secure-note strong", t(lang, "secureTitle"));
	setText("#connectionModal .secure-note span", t(lang, "secureText"));
	setText('label[for="sessionInput"]', t(lang, "sessionId"));
	setText('label[for="secretInput"]', t(lang, "sessionSecret"));
	setPlaceholder("#sessionInput", t(lang, "pasteSessionId"));
	setPlaceholder("#secretInput", t(lang, "pasteSessionSecret"));
	setText("#disconnectButton", t(lang, "forget"));
	setText("#cancelConnectionButton", t(lang, "cancel"));
	setText("#loadButton", t(lang, "connect"));
	setText("#createModal .modal-title", t(lang, "newInstance"));
	setText('label[for="createNameInput"]', t(lang, "name"));
	setPlaceholder("#createNameInput", t(lang, "instanceName"));
	setText("#cancelCreateButton", t(lang, "cancel"));
	setText("#confirmCreateButton", t(lang, "create"));
	setText("#confirmTitle", t(lang, "confirm"));
	setText("#cancelConfirmButton", t(lang, "cancel"));
	setText("#acceptConfirmButton", t(lang, "confirm"));
	setText("#settingsModal .modal-title", t(lang, "settings"));
	setText('label[for="languageInput"]', t(lang, "interfaceLanguage"));
	setText('label[for="appearanceInput"]', t(lang, "appearance"));
	setText('#appearanceInput option[value="system"]', t(lang, "systemDefault"));
	setText('#appearanceInput option[value="dark"]', t(lang, "dark"));
	setText('#appearanceInput option[value="light"]', t(lang, "light"));
	setText('label[for="fontFamilyInput"]', t(lang, "fontFamily"));
	setText('label[for="fontSizeInput"]', t(lang, "fontSize"));
	setText('label[for="autosaveInput"]', t(lang, "autosave"));
	setText('label[for="wordWrapInput"]', t(lang, "wordWrap"));
	setText('#wordWrapInput option[value="off"]', t(lang, "off"));
	setText('#wordWrapInput option[value="on"]', t(lang, "on"));
	setText('label[for="editorThemeInput"]', t(lang, "editorTheme"));
	setText('label[for="minimapInput"]', t(lang, "minimap"));
	setText(".preview-head span:first-child", t(lang, "themePreview"));
	setText("#resetSettingsButton", t(lang, "reset"));
	setText("#saveSettingsButton", t(lang, "apply"));
	setText("#betaEyebrow", t(lang, "betaEyebrow"));
	setText("#betaTitle", t(lang, "betaTitle"));
	setText("#betaWarningText", t(lang, "betaText"));
	setText("#betaWarningNote", t(lang, "betaNote"));
	setText('label[for="betaLanguageSelect"]', t(lang, "language"));
	setText("#betaContinueButton", t(lang, "continueForge"));

	const fileTitle = document.querySelector("#fileTitle");
	if (fileTitle && fileTitle.textContent === TRANSLATIONS.en.noFileOpen) fileTitle.textContent = t(lang, "noFileOpen");
	const filePath = document.querySelector("#filePath");
	if (filePath && filePath.textContent === TRANSLATIONS.en.filePathEmpty) filePath.textContent = t(lang, "filePathEmpty");

	return lang;
}
