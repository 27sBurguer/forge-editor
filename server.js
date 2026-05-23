const http = require("http");

const PORT = process.env.PORT || 3000;
const MAX_BODY_SIZE = 60_000_000;
const sessions = new Map();

const ROOT_ORDER = [
	"Workspace",
	"ReplicatedStorage",
	"ServerScriptService",
	"ServerStorage",
	"StarterGui",
	"StarterPack",
	"StarterPlayer",
	"ReplicatedFirst",
	"Lighting",
	"MaterialService",
	"Teams",
	"SoundService",
	"TextChatService",
];

const TRACKED_ROOTS = new Set(ROOT_ORDER);
const SCRIPT_CLASSES = new Set(["Script", "LocalScript", "ModuleScript"]);
const FOLDER_CLASSES = new Set(["Folder"]);
const CREATABLE_CLASSES = new Set(["Folder", "Script", "LocalScript", "ModuleScript"]);

function sendJson(res, statusCode, data) {
	const body = JSON.stringify(data);

	res.writeHead(statusCode, {
		"Content-Type": "application/json",
		"Access-Control-Allow-Origin": "*",
		"Access-Control-Allow-Methods": "GET, POST, OPTIONS",
		"Access-Control-Allow-Headers": "Content-Type, X-StudioBridge-Session, X-StudioBridge-Secret",
		"Cache-Control": "no-store",
	});

	res.end(body);
}

function sendHtml(res, statusCode, html) {
	res.writeHead(statusCode, {
		"Content-Type": "text/html; charset=utf-8",
		"Cache-Control": "no-store",
	});

	res.end(html);
}

function readBody(req) {
	return new Promise((resolve, reject) => {
		let body = "";

		req.on("data", chunk => {
			body += chunk;

			if (body.length > MAX_BODY_SIZE) {
				req.destroy();
				reject(new Error("Request body too large"));
			}
		});

		req.on("end", () => {
			if (!body) {
				resolve(null);
				return;
			}

			try {
				resolve(JSON.parse(body));
			} catch (error) {
				reject(error);
			}
		});

		req.on("error", reject);
	});
}

function getSessionHeaders(req) {
	return {
		sessionId: String(req.headers["x-studiobridge-session"] || "").trim(),
		secret: String(req.headers["x-studiobridge-secret"] || "").trim(),
	};
}

function hashString(value) {
	let hash = 5381;
	value = String(value || "");

	for (let index = 0; index < value.length; index++) {
		hash = ((hash * 33) + value.charCodeAt(index)) >>> 0;
	}

	return hash.toString(16).toUpperCase().padStart(8, "0");
}

function normalizeText(value, fallback) {
	return typeof value === "string" ? value : (fallback || "");
}

function isScriptClass(className) {
	return SCRIPT_CLASSES.has(className);
}

function isFolderClass(className) {
	return FOLDER_CLASSES.has(className);
}

function sanitizeName(name) {
	const value = String(name || "").trim();

	if (!value) {
		return "";
	}

	return value.replace(/[\\/\0]/g, "-").slice(0, 80);
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

	return parent ? parent + "/" + cleanName : cleanName;
}

function generateItemId(root, relativePath, className) {
	return "ITEM-" + hashString(root + "|" + normalizeRelativePath(relativePath) + "|" + className + "|" + Date.now() + "|" + Math.random());
}

function normalizeUploadedFiles(files) {
	return files.map(file => {
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
			sourceHash: normalizeText(file.sourceHash, "") || hashString(isScriptClass(className) ? source : className + "|" + itemId + "|" + root + "|" + relativePath),
			updatedAt: Date.now(),
		};
	}).filter(file => file.root && TRACKED_ROOTS.has(file.root) && file.relativePath && file.itemId);
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
		sourceHash: file.sourceHash || hashString(isScriptClass(file.className) ? file.source || "" : file.className + "|" + (file.itemId || file.fileId) + "|" + file.root + "|" + file.relativePath),
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
	if (!normalized) return null;
	return sessionData.files.find(file => file.root === root && file.relativePath === normalized) || null;
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
		return { ok: false, error: "Parent instance does not exist in the current Studio tree." };
	}

	return { ok: true, parent };
}

function pushChange(sessionData, change) {
	const revision = sessionData.nextRevision++;
	const payload = Object.assign({ revision, createdAt: Date.now() }, change);
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
		if (!current || visited.has(current.fileId)) continue;
		visited.add(current.fileId);
		removed.push(current);

		for (const child of getChildrenByParentId(sessionData, current.fileId)) {
			queue.push(child);
		}
	}

	for (const file of sessionData.files) {
		if (visited.has(file.fileId)) continue;
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
		if (cursor.parentItemId === ancestorItemId) return true;
		if (visited.has(cursor.parentItemId)) return false;
		visited.add(cursor.parentItemId);
		cursor = findItem(sessionData, cursor.parentItemId);
	}

	return false;
}

function getHomeHtml() {
	return String.raw`<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8" />
	<meta name="viewport" content="width=device-width, initial-scale=1.0" />
	<title>Forge</title>
	<link rel="icon" type="image/png" href="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAZo0lEQVR4nO17eZhV1ZXvb+29z7lTVTFEEDW22ih2qK+NreS1n50g5ZCnqASHe4MjtkaIdvoZDQaiwLmHQNK0U7QdGkxiC6Lm3KARCahRC5NuYwxJOm2KRE2eOIDRQoaquveeYe+93h/n3hoocI7/PNf33T/q1Nl7r/3ba177AB/Tx/Qx/f9M9FEswgwC+KNYaggR0Ue/KDNTEASys9NTQVCUHzkDQ3gBdXZ6ipn3etAfigQwg1AJBIpdTOTb3f//yitP53pe68rFWnwkgAgZUYb3r3/qs9N7m8+CoChLpYrZ/d0PBAAzaEPZkx2+r5vP/vu/bh9br/ZOSuL4GKPNEYbtwQB/gi0XAHwEADAAAgmqKaVecBx3DWGfu449+dLtewLhfQMQBIEslUoGALZsXJN/advvT9dJOMNoPdl15GgpBYyxMMbAGAtm/stZAQYsM5gHVpBSwHUUXFchiu2rxrpfOWH6NWsG8w28DwCYmcrlMvm+b59Zd3NbYquztI6+7Cgab5kRRjGMNhZENl2AGhsfYI6IiJmJiBoG8v0RAWCku85lXaFUQ8AYqIcxtDEJMyjjSuU4LhItzjvhjIX3DpaE97T44IGda5ecDxOXXSXG18MIcawNETXntAwGgZSUAkoKCCFADV9grYUxFtpYwMKAwAxIovfCD4GtZaUkKUfBGHqKSP5USNpltZ1goU/NuvKAarVuAWIpiaRytJstHPW5U+ZtYvaIyLfq3S7X6Xmqo+TrzrW3jmO97TbF8ZlhEqNW1ZoECQDElllKIbJZRwghUA8TMGNbYvAmGbvDgiJBcJgxEhBjCdg3X3AlkEqOTqwBgUAk3okfZsuOkiSl3C5k7h+Pn37NmsH//81v7hq585VX/iWXy86u1eo20WSzGXKrfX3fBjCtUtkkmqf1zpvv9FRHh68ff9D/nIC5R0n8VW9vPWUWRGC2rqtkJuMijPQOIeSTUjqPkqs2jm4dsfnTk7+yg3mwcyA888yKtmRH94E6qR5ltD7JGn1SxpXjtNYIw8QwQYiGSA3fPCCIrZtxNVP+xBPPuPZnnZ6nMGXgnY6O1DD/ZPXCVY7kc6u1UBORFELqXHb04cd94eqXPM8T7ygBzc0/9oBfJJus1EZnqlWthRCKLRspIfKFnIxj+wdrnTtGj92/Mum42a8PniMIinLHjlFi69bnef/9D6etW5/nY465oAdAV+O38umn7xwdvfnnLzD48kJBToqiGEliDAka5jmYWefzOVWLeNUpX7z2Z0HguR0lP4Y/eM1AFotF++yG2762s3vLNCIqWGtNPpdxEl3/ewAvTZmCtweguflHAu9cyfGqMIrZGmtJCGWt0YV8VmmDtwyrbxYO+Jvlxx5bqjc3PKZrInW3b+Ji10Smkm8ANCzvU81TpEolEEUAFVRw7LGXbgdwFzPf/dRDS84Xghe1FJyDevtCA4IkIqBp5RlkLEMpZ7XneWJMF4bFHqVSyXieJ3zf//O6+77xTMZVJ9bqsSFAGaMPbL63VwCCIJAdHSX9yGrvZGGSe8IwttYyABJsrGltzanEiPVOy6jLO065cnMTsClTyoaIDAbUizsfXDTd2KRkjP2kFKKblPOQEN4K5pJhgEoAMzOhUhGUeo8VnWuuX5cku25sKWQv6KvVrTVMJIjAADOLONbIZLNv+L5n24PiHlVlCiDgeSBKtggiMHPqjQn9ccseAWDPE1QqmQ0PLz0squ+6P0liaGPT8AJsCoWsTIxcetLZ/rxBkmJSvfMBgJg9Atrp0R88911CchGxAbEF2EIBZ66//9oZmbHjSuUN3TUul5txuxmYb842ABc+ttr7dcZ1b4rj2BpjkYLAVkkhteF9GhKwNwBsh+/btavm7meMACwLYwyRcP7UfGeYtWUGVdo3EfNGp9qz435iMyJJrAVDAKxzuYzURs456Wx/XhAUJXueaBicfkcfBIEg8u0jwXNzW/Liop27+pK+aqjDMDbVamR27OyLC1lxSvX1LTf5vm8rldIQPjo6fM3M1Ol56vNn+d+xcM9TyiFBZNkyM5iJgCisneH7vu1uH76PICjKMoCfrrt5DMDH1OoxkyCnFiY92dzonwPAlCllMwy5ZqS09t5rFxUyWLCzp5oaPLa6tSWvokTMn3rO4iXLls1yZs1erndP8xoBDnd23trS+9rLfxJk99Ha7g42C5CFEFzI73voCWdf/XJDX4fp8sZls5xJs5cn636wcKZDyX/U6qFmhhQEdlw3ZspPnjrD+2Vnp6ewYeDom17gx6u+8T3XwcV91TBqa8lm6gm+e9q53760GdMMUQFmT4BK9okfLT086ntrbm9vYggkrU51Pop5xdRz083Pnr1cz95jjlsmAGy3bx9PzGOTxKQh31Aiyxa5rKsi3XMEgJfb29v3KMaTZi9PNi6b5Uz64qK7f7zqmkNb8rn5PT01YwhCaJ2Vsr7myQf98zs6vCf6B/nAxo1r8tte/MViIn1xtS82ROyEkba5XOutg+cfAkClsolKgF3Ts31xNiPcMGJDAuxmlAhj88K4tvGXBcWiLM5apmfNWgagLFAG4Pu8uyRE1jDj7asAzAzi4RYcAHmeR+UyAJQZIN05wVMdxy9a8PCKqyfn8u7kej02cWKEwxhnqubxtffMXSdJbrAke9nqw17/w39Oyzji0Go1tAAhn3VFnOCJE85a+FvP80Qp9UwDYsnsiVKpYn7y4KK/lWTPqFbrlgiCrYUQgkjkLps0bXZtzOUTqVIpCSJiIt+S71sCuJn7E/kMgMZm9v8jW97qKsHM1oIZzR8zsyBCFOnIUZn/BoCuri4GUt0FwL7vWyLfEhGj7FGDSeRbW2YZwyERiAAkieY4iqEET3Uc+6+uTO7IOHwVWXNota9uABJgBpGAcjL/BjS8w+4SUKmkIhhWa/+UdaWMYmgAVMjnZJTwg9Mu9J9ctmyW09HhJwDw9CM3jI7q9b+SRHH+k//7xUmTJiXMICJwEARy0rRSbd291/5LPku3bN/RqxlsCUSN5IVHjmxxeqr6lhNL87ek+uib5skQEZ5ae92EOAxbCqplC33hq2/Ahw0Czz1h+sLnH145745CXl7Z21fXRKQYQL0eG8agdJAgiEgy0ii1FukXD80dtT7l0R+aDTYZ3/iTZSNefe2FPwoy+xjDFmC4rotsfuRnTjhz/m+IwI8EN4yG2b5E6/gsa+0Ya5ldV71I5NxyyrlLbvM8T5TLZUa5TOQvsg+vnHujq/hKIsAYCyEIQgiECd13yJF/d1F7pUujXGagTES+XXf//Bkwel6SxO1EpIQQO5Vy1msn943Tzl7wchAU5Uh30r7hrjefN0YXLAP0NiE9M+u21ryKDc059dxv39AM7oYA0Ol5qsP39fr75p8pOFndV60bIkIu58gowYbpF13fwQz6+aM3jNre/UZnLiOP6O2rw9hUfR0l0dqSR29V3zpt5tJ/Zs8T5Pu2CexjgX8cm+gsY8yBJMSbynEfPqnor+1nsvH+w/d84+s5F0vDNLsEAyyIqKWQRax5SzbfetzxZy74vwTwmru/flfWxUW91VAT0Z7jGQZLQSAhekaNPeiwyVOv6G56qSEqsKHxRxJHUzMOMROYLZMQEo6jVgDpRtas6L4unxVHbN9VjQjkNq17oo3dvrPXtLUWvrLu/gWP0Qz/4SAIJFEajn6+5D2FZgw8wFwjuk3T0vX3e0eZpLa0pydOrSeRBECWwbt66klra/aA3p6e5WA+kUG0/v7MPdqEFzGz2JsAMLPJ5TIqTOj+yVOv6E55oiEVIQEAvu8bZhbGmGPiJCFikBCQtVocuq2tTwDgzuBfx+kknNHbW7MCcImahp8BQDAzaR3bOAwvBwBUKmjMbYOg2F8k7fQ8lTKSDt5QTnmI4/qljgIsWwaxHJibiQTc3r66FTDHP/HD8t8Sgff/1GHPhLHe6igpAGsHvT/4J6NYWyeXvT3dbmUYSMLzPAGAn1h7437W2vFJkhps11EgEl0nnj73VQCIbe94R8m8NkwAaJBRB6d6KOLYCrbmUGaWpUqlPx8oFgPb3b2JS6WK6W7fxE2L35A+CwBszKeSxIKYhs3d8KfsOIrrcTwRAI488sKqEPJZ11FgSzxsjIXJZ10ylp6cWvT/JzWww4uiqr19EwFArWf7Ia4js2EYMwislIRh/m1TXwwQW2aAgT0VmZt5GjMPDotTYe6P8wlNJpr2oTneMjSa+R5juFRzI8oE4uYjIvFrITCdwbx7MYmZARJQmQHX52N4zKHGdE1s+FgcoKQAwLbJFpF8EQA8zxNt2fwf3uzr7VaKPmGMTWcfyp9xHenEGr8iIhsERVksBpaIeP3qxfvZsO+bBHsks/iTcPMLiRY+73meaDImpfy5o/iEOltLRHK3CIqJgDBK9IgRbb/qB0CKF6zVwLC6f+r66lHywkGf/uJ65sVENGD5B5Por6JYvU8/0I2jIEGvA8DBB292Pzt9bq9Ume+0tuQFW2hmGAYsA9YyawJUrJndbOHG5uTlcpleWHdzJty54+GMwiVRGB3tCFsK+3Y+3rnq+n3KZZ+72zcxAHJaRi+rhabHUdKxjISZbaPYa6zlZERbQUrp3HXC2QteDryiCwCOzLyhDYMHqyQAy7AZ14GjsssmTZqUbCh7ey3HD0SChguNZBvETGnOxX0AcPDmgzV7npg28+ilvXW9asSIgpvNKKkECUcK0ZLLqEzGZcvupafM8H/NqV2B7/v2jzu2HeM6OHr79t5Ea2N39PRFuYz8ZJ/pnkoEHtM1kdjzaOpZ816TIjtDKqevtZBxHCWFEiQyrpSjRuTdWmgebzvooKs8zxNjpky0AKBtUjPGNiSAm8fHUpCs1vVOlWtdCQBTyuVhut+kQf5zIFoFMKTGvgFAh+8zfDCA83+86prHQGomE48HKGahNlqWt5wx81vPMHuCKLX8/eAOFqvd5gaANGbwBJG/fu3d8/+Xgb4KZP+B2RYgnFcjo4LTZy65jYhMWkkqDkzAQ+I/MNgUshkVJXT/1NK1e3R9ewSAIavcqFoxgQkEZmoBgCkA/AHDRqee960VAFa81NmZPXjKFE1EGmgENI3WWKlUsZ7niUNHjX7mua2bfzV6dMvRPb11FPKZTLWebBmdG7cu7QmUDXwfRL5lzxM00/89gEuZWWzevME95JCOEABw/rf6DWcQNM+M8kIINFoPTVsm49gat3XUXl3fYBLNKEgI2saWwcwEywAx2Or90ERgEMhBEEjP88QhHR0hEekgKMogCCTKaTLTdK0AMGHqFVF+1CdODxN8L+O6vzZGBE5uxIkd583ZVi57RETseZ4IgqKstG+idK6iJCJ7yCEdITOo0/MUMOA1uhqGm63ZVwoC24YYMJt81iXNePLU0sLn9ub6hkhAwwgBkFsSHQKAYIKxlmG0PQzAQKjYoGZrqdnVqVQGnjWpAQIA0ClnzX8dwJeavZyBsWUuA4J2K4QEQVGmHV1CuumhFnzKFMD3AaP1BOk0p2u6PoLrZt/W9Q0BoKtrIgNAPpd7aftbPaEgyloL0okBW/o0EaHD9/eIIhG4UckxnZ13Zc0bmycaoCUr1KvHlRa81ASiXC6jUimJUqligqAo0zXL3IgP+PFg8QGJif5aMOIRI/f5/TFTr+h5u5ZF9+3poVlrjrImbb+B2WYcJcPIPn/I0Qc9snvWtzdqrkLMTKuXX/E/QnB7FBsjBKQgGbaOGDvh5HMWvLqnklUzifnRXVd/mVjP0caMl4JgDELXdR43Mjtn+gWLn999bDMhWRt442y9fr2Oo2kk0MoWEEJugVB3nHHxdUsWLlwoyrsXWzhtN65Zsywfbv3di4J4/0RbBti0teRUouVV0y+57qZmgvdOAIjGKUkisiTEM46jUmUybHJZJxtGvScCoCm7FVCDYlGS79vV3/3a4qyDO5I4GR9HCdfD2CZJnAWb0ziq/mztffM/5fs+N11jQyLo8XuX7Bv19DyloM+L46Q1DGMbRTHHcXRAzuXFleVX3u37i2zZ84aIQlAJBDOId75yjOvI/RNtLABIIWS1nuwcMWbfd3R9wwBokpLuOrYgZhCBoLVBHMUXAuANg3QpCIqyVKmYh+76xj84wl67c1efToyxREQEEgBxbzWMleAx9Z6+5cyMcmNse/sm8n3f7qq9dX3OERN29dYjAEwgQURkrbXbd/TFhYy4cM3dc7/o+771UiPYoAqIwDqqXSAFAYAFUuMnhbqvY9qcbQ3X96668QIAyuVUVw44cPQT9SjZpiRJEFM9iqwkO3nNymuO8n2/v+zVDJ+TpH4JwGy5PyNE40dEcHtroSWYz65dueAI3/dtp+epUqliHr93yb5JHJ3VW61ZAC4PBF5ghmBARklso3ptVoNPC6TSUyxW7GP3evtbo8+u1kJmhmRmGcbGuG1ttwNAcVCy9a4A6C9jnTRvl5Tu6lzGBTNbtsRKkghrfQsAMFAEAExpAGatnaC1aTRId5u5mcEpyVpHfwMAzfp9b7hrvCNlzjQyy92ZIjAliRHMfAgzq4b9oCmAIAL39PXMyWZUi2U2YNh81oVlevL0Gf7vvIZdek8AAECxmKKWy+dvixNrKF1MVGuRdQRNf+j7c48vlUomCAJZLvfrZUREe7360Qj+iCzqQzYo3brltz8kAjHSzM8CabOlw/f1+pWLDic2l1VroQWTTDMBQdls4SYA2Ft5/R0BIPJtUCzKU89f/JxhejCXzQhjrWUwtNYcx/U7Nq5ZlkelgnZsUgAgpfyZUoKYrR0k/mBm2EblN4ziKJ/PbwSAYldaaBWjDnzeGN6qGhXjYWMtjONIIiF/QUS20/PUmK4uAhF6+7YtJ+KsMczMbLMZJcPIPnv6zCWPpoFP6V0Zv2EAAEBx4kQGQK2F1vla21iK9LZCFGvrOjRh8+vP35EWOiaCmWn0iLZ/D0OzPeMqhy0nQNr8Y4YBczKyLS+Vk7n98+f6W4Mg9RpBUBTTps2uOW5maWshJ5DG37o5FoxESnISbbVyWq4HQJuxWXX4vv7hsq8uymbE5Fo9NkSQAEOQRDZfmEdEtlnbeC+0h9ZY2jIKll25KOdgwa7emhZEisG6pZBTiVXzz770+iXrbv7nzNQr/i168M65UyxHP3QkPhHHCSwDSgq4roMw5gfyBx587im/2J6g7HPTUrDnCbFokQ3uuOK2jEuXa61htAUorUQZg9CQvLg468b7mutU7vzaTAX9H/Uw0mAoy6xbC1lVT3DPjMtuvmBv1+DeMwCNbEsUi3NF8O93P6MEH1ULEyMIEoDO57LKQM05+9Ibbmi0yJK193zzoCTa+X90En/OMrcopTZLkbl/+iVLVwxah3dfhwj8wPfnfgEmmqkTfTiEiFzHeZYpd9sZFy9+LvA8t+T78QPfu/ock4SrkiSx1rIAmF1HCpDz2qh9xx35n7+NdgBp+v2BAQBSd+P7vn3g7nkTTK3vl0brVmP7q0CmkM9IC7X0zEtvnDccwCFl5/47Am+3DgAIIWDtcP4fXD7nq9ZGN0VxbK1N8wMhYF3XIahCx9lfWvrT93v6ewUAGFCF1XfOOdmaaF0Sxw1/T4KZTWtLThor1udb2y4/5Rx/c1AsyjETJ1KH7xv2PKq0t9O7MUjN2CJNn4+TUwB0+E/pNauu3yepbrlRkL2gVqtb22ixEsEU8jkVJ/JLpctu+N67DXnfMwDAQMMkWDbnXMHRqiiK2bJlIiGYrc5nM8owvaWc7DfHtX1m+bGlgSsyXV0TqQxYlPuTniHEDGq4U9HenlaM0+csHvr+1efHcbTIkTiotxo11c8C4JZCTsZGfL305Zuu+6Cbf0cABoNQWXZVERyvtFpn4sSkPTlmI6WQ+WwGseY/SMe9Iz96VKWR/g4hz4MAPAA+fH94ivpIcMPoqPr6tCiM/kkJTIrjBLE2RhBJy2yUFDKTcWGhrijOvumWD2Pz7wqAISAsv/pzsOEqSXxgXzUyJEBgIm5ek3MdRLHZIaR4UjmZR92s+8sRI1tfnnz6tcOvya37Ttsbb3YfaHX9KK31SdrokzJKjNPaIIwTA5Bo3AQ1+ayrLGgnqcwlxUtveMDzPOV/CJt/1wAAQHPR1Suv2Y9rtVsF7JlRFCPRRhOl8YRlsBJCZjIOhCCEkQZA20B4E6AdDI4I5IB5JANjwXbfXNYBMyOKEiTGGqIUVICNlELlcxkYKzYo1fLl6V9a/PyHufn3BAAw9KrsA3fOOV8noe8o+uswjJFok5YmiAmgtFXFUFIKSCkgxEDYb62Fsdy8RG1SG8GCQczMcKSQuWwGibFvSCf7rbNn3XgLM+/1yvtHBgCAIZel1628uS2KXp6VxPFsKXAoW4sw1rDGWhDskMb17mawPzJgMIOkIJlxHUgpkRiz1XWz33dU622n/aP/ZzRujLwfP/9O9AGuyw+cxsY1y/Jbuv90WhSH52itJzuSRktBjVM2sJbRbKull2sJUlBDMgSYgSjWfcpxn3bczA/ybeN+dHLpa9t3X+cvQR/4g4ly+Tjp+0/16+Sjq68bW9+x7TOxCf/eanOENXwQsx1j2eYJJAFYIqoR0VtE4lXlyN8p5Tw7ctQ+v+g4a95rzXkGt9Y+CI/vRB/aJzOVSlF0dU3kPYnpK08HuU2vvZqrhj2qrSVjxhQ+GR558swqdkuJG65SlMtl81F98PShADCYmJkqlZIY0zWRujdt4kabfI9ULBbl5RMnUnd7O3d1de0RvL80fegA7ImGfzZHe6ohfUwf08f0MX3k9P8Aq+Mp6bZTQWgAAAAASUVORK5CYII=" />
	<style>
		:root {
			--side-width: 340px;
			--bg: #17130d;
			--panel: #221c14;
			--panel-2: #2a2117;
			--panel-3: #34291d;
			--title: #211910;
			--border: #4a3a25;
			--border-soft: #342819;
			--text: #eadfc9;
			--muted: #b19e7d;
			--muted-2: #8a795d;
			--blue: #c7963f;
			--blue-soft: #4c3517;
			--green: #4f9d69;
			--red: #8f352c;
			--red-2: #ff9b7a;
			--yellow: #e2b64d;
			--purple: #cfa6ff;
			--shadow: 0 18px 50px rgba(0, 0, 0, 0.35);
		}

		* { box-sizing: border-box; }

		html,
		body {
			margin: 0;
			width: 100%;
			height: 100%;
			background: radial-gradient(circle at 50% -20%, rgba(199, 150, 63, 0.11), transparent 38%), var(--bg);
			color: var(--text);
			font-family: "Segoe UI", Inter, Arial, sans-serif;
			overflow: hidden;
		}

		button,
		input,
		select,
		textarea {
			font-family: inherit;
		}

		button {
			border: 0;
			outline: 0;
			cursor: pointer;
			background: transparent;
			color: var(--text);
		}

		button:disabled {
			cursor: default;
			opacity: 0.5;
		}

		.app {
			display: grid;
			grid-template-columns: var(--side-width) 5px minmax(0, 1fr);
			grid-template-rows: 34px minmax(0, 1fr) 24px;
			width: 100vw;
			height: 100vh;
			background: radial-gradient(circle at 60% 0%, rgba(199, 150, 63, 0.08), transparent 35%), var(--bg);
		}

		.titlebar {
			grid-column: 1 / -1;
			grid-row: 1;
			display: grid;
			grid-template-columns: var(--side-width) 5px minmax(0, 1fr);
			align-items: center;
			background: var(--title);
			border-bottom: 1px solid #202020;
			user-select: none;
		}

		.brand {
			display: flex;
			align-items: center;
			gap: 8px;
			padding: 0 12px;
			font-size: 12px;
			font-weight: 600;
			color: #cccccc;
		}

		.brand-icon {
			width: 18px;
			height: 18px;
			border-radius: 5px;
			background-image: url("data:image/png;base64,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");
			background-size: cover;
			background-position: center;
			box-shadow: 0 0 16px rgba(199, 150, 63, 0.38);
		}

		.command-center {
			grid-column: 3;
			justify-self: center;
			width: min(520px, 70%);
			height: 24px;
			display: flex;
			align-items: center;
			justify-content: center;
			border: 1px solid #4b4b4b;
			border-radius: 6px;
			background: #252526;
			color: #bdbdbd;
			font-size: 12px;
		}

		.title-actions {
			position: absolute;
			top: 5px;
			right: 8px;
			display: flex;
			align-items: center;
			gap: 6px;
		}

		.icon-button {
			width: 26px;
			height: 24px;
			display: inline-grid;
			place-items: center;
			border-radius: 5px;
			color: #cccccc;
			font-size: 14px;
		}

		.icon-button:hover { background: #454545; color: white; }

		.sidebar {
			grid-column: 1;
			grid-row: 2;
			display: flex;
			flex-direction: column;
			min-width: 0;
			background: var(--panel);
			border-right: 1px solid var(--border-soft);
		}

		.resizer {
			grid-column: 2;
			grid-row: 2;
			background: transparent;
			cursor: col-resize;
		}

		.resizer:hover,
		body.resizing .resizer { background: var(--blue); }

		.sidebar-title {
			height: 35px;
			display: flex;
			align-items: center;
			justify-content: space-between;
			padding: 0 10px 0 14px;
			font-size: 11px;
			letter-spacing: 0.04em;
			text-transform: uppercase;
			color: #bbbbbb;
		}

		.sidebar-actions { display: flex; gap: 4px; }

		.session-panel {
			padding: 0 10px 10px;
			border-bottom: 1px solid var(--border-soft);
		}

		.session-row {
			display: grid;
			grid-template-columns: minmax(0, 1fr) 60px;
			gap: 7px;
		}

		input,
		select {
			height: 30px;
			width: 100%;
			border: 1px solid #3c3c3c;
			background: #1b1b1b;
			color: var(--text);
			padding: 0 9px;
			font-size: 12px;
			outline: none;
			border-radius: 4px;
		}

		input:focus,
		select:focus {
			border-color: var(--blue);
			box-shadow: 0 0 0 1px rgba(0, 122, 204, 0.35);
		}

		.primary-button,
		.secondary-button,
		.danger-button,
		.ghost-button {
			height: 30px;
			padding: 0 12px;
			border-radius: 5px;
			font-size: 12px;
			font-weight: 600;
			border: 1px solid transparent;
			transition: background 0.16s ease, border-color 0.16s ease, transform 0.10s ease, box-shadow 0.16s ease;
		}

		.primary-button { background: linear-gradient(180deg, #d6a44e, #9f6b23); color: #170f07; box-shadow: 0 0 0 1px rgba(255, 221, 150, 0.12) inset; }
		.primary-button:hover:not(:disabled) { background: linear-gradient(180deg, #e7b95f, #b77b29); box-shadow: 0 8px 22px rgba(199, 150, 63, 0.18); }
		.secondary-button { background: #3a3a3d; border-color: #4b4b4f; color: #eeeeee; }
		.secondary-button:hover:not(:disabled) { background: #454549; }
		.danger-button { background: #5f2323; border-color: #873333; color: #ffd8d8; }
		.danger-button:hover:not(:disabled) { background: #732c2c; }
		.ghost-button { background: transparent; border-color: #454545; color: #dddddd; }
		.ghost-button:hover:not(:disabled) { background: #333333; }

		.status {
			margin-top: 7px;
			min-height: 31px;
			padding: 7px 8px;
			border: 1px solid var(--border-soft);
			background: #1d1d1d;
			color: var(--muted);
			font-size: 12px;
			line-height: 1.35;
			border-radius: 4px;
		}

		.status.success { color: #b7f0b1; border-color: rgba(137, 209, 133, 0.35); background: rgba(137, 209, 133, 0.08); }
		.status.warning { color: #ffe7a3; border-color: rgba(204, 167, 0, 0.35); background: rgba(204, 167, 0, 0.08); }
		.status.error { color: #ffc0b6; border-color: rgba(244, 135, 113, 0.4); background: rgba(244, 135, 113, 0.09); }

		.project-header {
			display: flex;
			align-items: center;
			justify-content: space-between;
			padding: 10px 10px 6px;
			font-size: 11px;
			letter-spacing: 0.04em;
			text-transform: uppercase;
			color: #bbbbbb;
		}

		.file-count { color: #9cdcfe; }

		.search-wrap { padding: 0 10px 8px; }

		.tree {
			flex: 1;
			overflow: auto;
			padding: 0 4px 12px 4px;
			user-select: none;
		}

		.tree-row {
			position: relative;
			height: 24px;
			display: flex;
			align-items: center;
			gap: 3px;
			border-radius: 3px;
			font-size: 13px;
			color: #cccccc;
			white-space: nowrap;
		}

		.tree-row { transition: background 0.12s ease, color 0.12s ease, transform 0.08s ease; }
		.tree-row:hover { background: rgba(199, 150, 63, 0.10); }
		.tree-row.selected { background: linear-gradient(90deg, rgba(199, 150, 63, 0.35), rgba(92, 63, 27, 0.26)); color: #fff7e8; }
		.tree-row.opened:not(.selected) { background: rgba(199, 150, 63, 0.09); }
		.tree-row.drag-over { outline: 1px solid var(--blue); background: rgba(0, 122, 204, 0.24); }

		.chevron {
			width: 16px;
			height: 20px;
			display: grid;
			place-items: center;
			color: #c8c8c8;
			font-size: 10px;
			flex: 0 0 auto;
		}

		.chevron.empty { color: transparent; pointer-events: none; }
		.node-icon { width: 18px; text-align: center; flex: 0 0 auto; font-size: 14px; }
		.node-icon.root { color: #75beff; }
		.node-icon.folder { color: #dcb67a; }
		.node-icon.script { color: #75beff; }
		.node-icon.module { color: var(--purple); }
		.node-icon.instance { color: #bdbdbd; }

		.node-name {
			min-width: 0;
			overflow: hidden;
			text-overflow: ellipsis;
			flex: 1;
		}

		.node-rename-input {
			min-width: 0;
			flex: 1;
			height: 22px;
			border: 1px solid var(--blue);
			background: #111111;
			color: var(--text);
			border-radius: 7px;
			padding: 0 7px;
			font-size: 12px;
			outline: none;
			box-shadow: 0 0 0 2px rgba(0, 122, 204, 0.22);
		}

		.node-actions {
			display: none;
			align-items: center;
			gap: 2px;
			padding-right: 4px;
		}

		.tree-row:hover .node-actions,
		.tree-row.selected .node-actions { display: flex; }

		.node-action {
			width: 19px;
			height: 19px;
			display: grid;
			place-items: center;
			border-radius: 3px;
			color: #dcdcdc;
			font-size: 15px;
		}

		.node-action:hover { background: rgba(255, 255, 255, 0.15); }

		.tree-empty {
			margin: 16px 10px;
			padding: 16px 12px;
			border: 1px dashed #444444;
			border-radius: 6px;
			color: var(--muted);
			font-size: 12px;
			line-height: 1.45;
		}

		.main {
			grid-column: 3;
			grid-row: 2;
			display: flex;
			flex-direction: column;
			min-width: 0;
			background: var(--bg);
		}

		.tabs {
			height: 35px;
			display: flex;
			align-items: stretch;
			background: var(--panel-2);
			border-bottom: 1px solid #1b1b1b;
			overflow-x: auto;
			overflow-y: hidden;
		}

		.tab {
			min-width: 145px;
			max-width: 250px;
			display: flex;
			align-items: center;
			gap: 7px;
			padding: 0 8px 0 10px;
			border-right: 1px solid #1f1f1f;
			background: #2d2d2d;
			color: #cccccc;
			font-size: 12px;
			cursor: pointer;
		}

		.tab.active { background: var(--bg); color: white; }
		.tab-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; }
		.tab-close { width: 18px; height: 18px; border-radius: 3px; color: #bbbbbb; display: grid; place-items: center; font-size: 13px; }
		.tab-close:hover { background: #454545; color: white; }
		.dirty-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--yellow); display: none; flex: 0 0 auto; }
		.tab.dirty .dirty-dot { display: block; }

		.editor-header {
			height: 42px;
			display: flex;
			align-items: center;
			justify-content: space-between;
			gap: 12px;
			padding: 0 10px 0 12px;
			border-bottom: 1px solid var(--border-soft);
			background: #1f1f1f;
		}

		.editor-title { min-width: 0; }
		.editor-title strong { display: block; font-size: 13px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
		.editor-title span { display: block; margin-top: 2px; color: var(--muted); font-size: 11px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
		.editor-actions { display: flex; align-items: center; gap: 7px; flex: 0 0 auto; }

		.editor-shell {
			position: relative;
			flex: 1;
			min-height: 0;
			background: var(--bg);
		}

		.hint-pill {
			height: 24px;
			display: inline-flex;
			align-items: center;
			padding: 0 9px;
			border: 1px solid rgba(199, 150, 63, 0.34);
			border-radius: 999px;
			background: rgba(199, 150, 63, 0.10);
			color: #e2c184;
			font-size: 11px;
			font-weight: 600;
		}

		#monacoEditor,
		#fallbackEditor {
			position: absolute;
			inset: 0;
		}

		#fallbackEditor {
			width: 100%;
			height: 100%;
			resize: none;
			border: 0;
			outline: 0;
			background: var(--bg);
			color: var(--text);
			font-family: Consolas, "Cascadia Code", monospace;
			font-size: 13px;
			line-height: 1.55;
			padding: 14px 18px;
			display: none;
			tab-size: 4;
		}

		.placeholder {
			position: absolute;
			inset: 0;
			display: grid;
			place-items: center;
			pointer-events: none;
			background: var(--bg);
			z-index: 2;
		}

		.placeholder-card {
			width: min(520px, 80%);
			padding: 28px;
			border: 1px solid #424242;
			background: #252526;
			box-shadow: var(--shadow);
			text-align: center;
		}

		.placeholder-card h1 { margin: 0 0 10px; font-size: 24px; font-weight: 650; }
		.placeholder-card p { margin: 0; color: #bbbbbb; font-size: 13px; line-height: 1.55; }

		.footer {
			grid-column: 1 / -1;
			grid-row: 3;
			display: flex;
			align-items: center;
			justify-content: space-between;
			gap: 12px;
			padding: 0 9px;
			background: var(--blue);
			color: white;
			font-size: 11px;
		}

		.modal-backdrop {
			position: fixed;
			inset: 0;
			display: none;
			align-items: center;
			justify-content: center;
			background: rgba(0, 0, 0, 0.42);
			z-index: 30;
		}

		.modal-backdrop.open { display: flex; }

		.modal {
			width: min(520px, calc(100vw - 34px));
			background: #252526;
			border: 1px solid #454545;
			box-shadow: var(--shadow);
			border-radius: 8px;
			overflow: hidden;
		}

		.modal-head {
			height: 44px;
			display: flex;
			align-items: center;
			justify-content: space-between;
			padding: 0 14px;
			background: #2d2d30;
			border-bottom: 1px solid #3c3c3c;
		}

		.modal-title { font-size: 14px; font-weight: 650; }
		.modal-body { padding: 14px; display: grid; gap: 12px; }
		.modal-actions { display: flex; justify-content: flex-end; gap: 8px; padding-top: 4px; }

		.location-box {
			padding: 9px 10px;
			border: 1px solid #3c3c3c;
			background: #1b1b1b;
			border-radius: 5px;
			color: #c7c7c7;
			font-size: 12px;
			line-height: 1.4;
		}

		.type-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; }
		.type-card {
			height: 72px;
			display: grid;
			place-items: center;
			gap: 3px;
			border: 1px solid #454545;
			border-radius: 7px;
			background: #1f1f1f;
			color: #d4d4d4;
		}

		.type-card:hover { background: #303030; }
		.type-card.active { border-color: var(--blue); background: rgba(0, 122, 204, 0.18); box-shadow: inset 0 0 0 1px rgba(0, 122, 204, 0.35); }
		.type-card .type-icon { font-size: 22px; line-height: 22px; }
		.type-card .type-name { font-size: 11px; font-weight: 600; }

		.setting-grid { display: grid; grid-template-columns: 150px minmax(0, 1fr); gap: 10px; align-items: center; }
		.setting-grid label { color: #c5c5c5; font-size: 12px; }
		.setting-grid input[type="checkbox"] { width: 16px; height: 16px; }

		.toast-stack {
			position: fixed;
			right: 16px;
			bottom: 36px;
			display: grid;
			gap: 8px;
			z-index: 40;
			pointer-events: none;
		}

		.toast {
			width: min(420px, calc(100vw - 32px));
			padding: 10px 12px;
			border: 1px solid #454545;
			background: #252526;
			box-shadow: var(--shadow);
			border-radius: 8px;
			color: #e6e6e6;
			font-size: 13px;
			line-height: 1.4;
			animation: toastIn 0.16s ease-out;
		}

		.toast.success { border-color: rgba(137, 209, 133, 0.55); }
		.toast.error { border-color: rgba(244, 135, 113, 0.6); }
		.toast.warning { border-color: rgba(204, 167, 0, 0.6); }

		@keyframes toastIn {
			from { opacity: 0; transform: translateY(8px); }
			to { opacity: 1; transform: translateY(0); }
		}

		::-webkit-scrollbar { width: 10px; height: 10px; }
		::-webkit-scrollbar-track { background: transparent; }
		::-webkit-scrollbar-thumb { background: #444; border-radius: 999px; border: 3px solid transparent; background-clip: content-box; }
		::-webkit-scrollbar-thumb:hover { background: #5a5a5a; border: 3px solid transparent; background-clip: content-box; }

		/* Forge polished compiler UI overrides */
		:root {
			--bg: #181818;
			--panel: #1f1f1f;
			--panel-2: #252526;
			--panel-3: #2d2d30;
			--title: #1f1f1f;
			--border: #343434;
			--border-soft: #2b2b2b;
			--text: #d4d4d4;
			--muted: #9ca3af;
			--muted-2: #6b7280;
			--blue: #007acc;
			--blue-soft: rgba(0, 122, 204, 0.16);
			--green: #2ea043;
			--red: #8b2d2d;
			--red-2: #ff9b9b;
			--yellow: #d7ba7d;
			--purple: #c586c0;
			--shadow: 0 22px 70px rgba(0, 0, 0, 0.42);
		}

		html,
		body {
			background: radial-gradient(circle at 52% -25%, rgba(0, 122, 204, 0.13), transparent 38%), #181818;
		}

		.app {
			background: linear-gradient(180deg, rgba(255,255,255,0.018), transparent 120px), #181818;
		}

		.titlebar {
			background: rgba(31, 31, 31, 0.94);
			border-bottom-color: #2a2a2a;
			backdrop-filter: blur(18px);
		}

		.brand { color: #f3f4f6; font-weight: 700; }
		.brand-icon { border-radius: 7px; box-shadow: 0 0 18px rgba(0, 122, 204, 0.22); }
		.command-center {
			height: 24px;
			border-radius: 999px;
			border-color: #3a3a3a;
			background: rgba(24, 24, 24, 0.78);
			color: #cbd5e1;
		}

		.sidebar {
			background: rgba(31, 31, 31, 0.95);
			border-right-color: #2f2f2f;
			box-shadow: inset -1px 0 0 rgba(255, 255, 255, 0.02);
		}

		.sidebar-title,
		.project-header { color: #a8b3c3; }

		.session-panel { padding-bottom: 12px; }

		input,
		select {
			height: 34px;
			border-radius: 11px;
			border-color: #373737;
			background: #242424;
			transition: border-color 0.16s ease, box-shadow 0.16s ease, background 0.16s ease;
		}

		input:hover,
		select:hover { background: #292929; }

		input:focus,
		select:focus {
			border-color: var(--blue);
			box-shadow: 0 0 0 3px rgba(0, 122, 204, 0.18);
		}

		.primary-button,
		.secondary-button,
		.danger-button,
		.ghost-button {
			height: 34px;
			border-radius: 11px;
			font-weight: 700;
			letter-spacing: 0.01em;
		}

		.primary-button {
			background: linear-gradient(180deg, #1389d8, #006fbf);
			color: #ffffff;
			box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.08) inset;
		}
		.primary-button:hover:not(:disabled) { background: linear-gradient(180deg, #249be9, #047bd2); box-shadow: 0 10px 28px rgba(0, 122, 204, 0.22); }
		.secondary-button { background: #303033; border-color: #454549; color: #eeeeee; }
		.secondary-button:hover:not(:disabled) { background: #3a3a3f; }
		.danger-button { background: #5f2228; border-color: #7e2e36; color: #ffdadd; }
		.danger-button:hover:not(:disabled) { background: #722832; }

		.icon-button {
			border-radius: 9px;
			transition: background 0.15s ease, transform 0.12s ease, color 0.15s ease;
		}
		.icon-button:hover { background: rgba(255, 255, 255, 0.08); transform: translateY(-1px); }

		.status,
		.location-box,
		.tree-empty {
			border-radius: 12px;
			background: rgba(37, 37, 38, 0.86);
			border-color: #363636;
		}

		.tree { padding: 4px 6px 14px 6px; }
		.tree-row {
			height: 28px;
			border-radius: 9px;
			padding-right: 4px;
			transition: background 0.14s ease, color 0.14s ease, transform 0.10s ease, box-shadow 0.14s ease;
		}
		.tree-row:hover { background: rgba(255, 255, 255, 0.055); }
		.tree-row.selected { background: linear-gradient(90deg, rgba(0, 122, 204, 0.42), rgba(0, 122, 204, 0.16)); color: #ffffff; box-shadow: inset 3px 0 0 #4fb4ff; }
		.tree-row.opened:not(.selected) { background: rgba(255,255,255,0.035); }
		.tree-row.drag-over { outline: 1px solid #4fb4ff; background: rgba(0, 122, 204, 0.24); }
		.node-action { border-radius: 7px; }

		.main { background: #1e1e1e; }
		.tabs { height: 38px; background: #252526; border-bottom-color: #2f2f2f; }
		.tab {
			min-width: 155px;
			background: #252526;
			border-right-color: #333333;
			transition: background 0.14s ease, color 0.14s ease, box-shadow 0.14s ease;
		}
		.tab:hover { background: #2d2d30; }
		.tab.active { background: #1e1e1e; color: #ffffff; box-shadow: inset 0 2px 0 #007acc; }
		.tab-close { border-radius: 7px; }

		.editor-header {
			height: 50px;
			background: rgba(30, 30, 30, 0.96);
			border-bottom-color: #2d2d2d;
			backdrop-filter: blur(18px);
		}

		.hint-pill {
			border-color: rgba(0, 122, 204, 0.35);
			background: rgba(0, 122, 204, 0.12);
			color: #9cdcfe;
		}

		.placeholder { background: radial-gradient(circle at center, rgba(0, 122, 204, 0.06), transparent 34%), #1e1e1e; }
		.placeholder-card {
			border-radius: 24px;
			background: rgba(37, 37, 38, 0.88);
			border-color: #3b3b3b;
			animation: panelIn 0.22s ease-out;
		}

		.modal-backdrop { background: rgba(0, 0, 0, 0.5); backdrop-filter: blur(10px); }
		.modal-backdrop.open { display: flex; animation: fadeIn 0.14s ease-out; }
		.modal {
			border-radius: 18px;
			background: #252526;
			border-color: #454545;
			animation: panelIn 0.18s ease-out;
		}
		.modal-head { height: 50px; background: #2d2d30; border-bottom-color: #3b3b3d; }
		.modal-body { padding: 16px; gap: 14px; }
		.type-card {
			height: 82px;
			border-radius: 15px;
			background: #1f1f1f;
			transition: background 0.16s ease, border-color 0.16s ease, transform 0.12s ease, box-shadow 0.16s ease;
		}
		.type-card:hover { background: #2b2b2d; transform: translateY(-1px); }
		.type-card.active { border-color: #4fb4ff; background: rgba(0, 122, 204, 0.16); box-shadow: 0 0 0 1px rgba(79, 180, 255, 0.28) inset; }

		.toast {
			border-radius: 15px;
			background: rgba(37, 37, 38, 0.96);
			backdrop-filter: blur(14px);
			animation: toastIn 0.2s ease-out;
		}

		.footer { background: #007acc; color: #ffffff; }

		@keyframes fadeIn {
			from { opacity: 0; }
			to { opacity: 1; }
		}

		@keyframes panelIn {
			from { opacity: 0; transform: translateY(8px) scale(0.985); }
			to { opacity: 1; transform: translateY(0) scale(1); }
		}


		/* Forge Codex polish */
		body { background: #171717; }
		.app { background: #171717; }
		.titlebar { height: 36px; background: rgba(24,24,24,0.88); backdrop-filter: blur(18px); border-bottom-color: rgba(255,255,255,0.07); }
		.command-center { max-width: 520px; border-radius: 13px; background: rgba(255,255,255,0.035); border: 1px solid rgba(255,255,255,0.08); color: #b9b9b9; }
		.sidebar { background: #1d1d1d; border-right-color: rgba(255,255,255,0.07); }
		.session-panel, .placeholder-card, .status, .search-wrap input, .location-box, input, select { border-radius: 14px; }
		.tree-row { border-radius: 10px; transition: background 0.14s ease, transform 0.10s ease, color 0.14s ease; }
		.tree-row:hover { background: rgba(255,255,255,0.045); }
		.tree-row.selected { background: rgba(0,122,204,0.28); box-shadow: inset 0 0 0 1px rgba(75,172,255,0.22); }
		.primary-button, .secondary-button, .danger-button, .icon-button { border-radius: 12px; transition: transform 0.12s ease, filter 0.14s ease, background 0.14s ease, border-color 0.14s ease; }
		.primary-button:hover, .secondary-button:hover, .danger-button:hover, .icon-button:hover { transform: translateY(-1px); }
		.tabs { background: #202020; }
		.tab { border-radius: 12px 12px 0 0; margin: 4px 3px 0 0; border-right: 0; cursor: grab; }
		.tab:active { cursor: grabbing; }
		.tab.dragging { opacity: 0.55; }
		.modal-backdrop { align-items: flex-start; justify-content: flex-start; padding: 0; background: transparent; backdrop-filter: none; pointer-events: none; }
		.modal-backdrop.open { display: flex; }
		#createModal.open .modal { pointer-events: auto; width: 360px; max-width: calc(100vw - 28px); position: fixed; left: var(--create-x, 340px); top: var(--create-y, 88px); border-radius: 18px; box-shadow: 0 18px 70px rgba(0,0,0,0.45); animation: popIn 0.14s ease-out; }
		#confirmModal.open, #settingsModal.open { pointer-events: auto; align-items: center; justify-content: center; background: rgba(0,0,0,0.5); backdrop-filter: blur(10px); }
		#confirmModal.open .modal, #settingsModal.open .modal { pointer-events: auto; }
		.type-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); }
		.type-card { border-radius: 14px; min-height: 70px; }
		@keyframes popIn { from { opacity: 0; transform: translateY(6px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
		@keyframes breathe { 0%,100% { transform: scale(1); filter: drop-shadow(0 0 0 rgba(0,122,204,0)); } 50% { transform: scale(1.055); filter: drop-shadow(0 0 18px rgba(0,122,204,0.30)); } }
		.monaco-editor .suggest-widget { border-radius: 14px !important; overflow: hidden !important; box-shadow: 0 18px 60px rgba(0,0,0,0.44) !important; }
		.monaco-editor .suggest-widget .monaco-list-row { border-radius: 8px !important; }
		.monaco-editor .suggest-widget .monaco-icon-label,
		.monaco-editor .suggest-widget .label-name,
		.monaco-editor .suggest-widget .details-label { color: #d4d4d4 !important; }
		.monaco-editor .suggest-widget .monaco-highlighted-label .highlight { color: #4fb4ff !important; font-weight: 700 !important; }

		/* Compact create popover */
		#createModal.open .modal {
			width: 326px;
			border-radius: 22px;
			background: rgba(38,38,40,0.96);
			border: 1px solid rgba(255,255,255,0.10);
			box-shadow: 0 22px 80px rgba(0,0,0,0.50);
		}
		#createModal .modal-head { height: 42px; padding: 0 12px 0 15px; background: transparent; border-bottom-color: rgba(255,255,255,0.06); }
		#createModal .modal-title { font-size: 13px; }
		#createModal .modal-body { padding: 12px; gap: 10px; }
		#createModal .location-box { height: auto; min-height: 34px; padding: 9px 11px; border-radius: 14px; font-size: 11px; color: #aaa; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
		#createModal .type-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 7px; }
		#createModal .type-card { height: 54px; min-height: 54px; padding: 7px 4px; border-radius: 15px; user-select: none; -webkit-user-select: none; }
		#createModal .type-icon { font-size: 17px; line-height: 18px; }
		#createModal .type-name { font-size: 10px; margin-top: 3px; }
		#createModal input { height: 38px; border-radius: 15px; }
		#createModal .modal-actions { padding-top: 2px; }
		#createModal .modal-actions button { height: 34px; border-radius: 14px; }
		.tab, .tab * { user-select: none; -webkit-user-select: none; }
		.tab { cursor: pointer; }
		.tab.draggable-tab { cursor: grab; }
		.tab.draggable-tab:active { cursor: grabbing; }
		.tab.drag-over-left { box-shadow: inset 2px 0 0 #4fb4ff; }
		.tab.drag-over-right { box-shadow: inset -2px 0 0 #4fb4ff; }
		.tab-name { pointer-events: none; }

		.editor-actions { display: none; }
		#createModal.open .modal { width: 315px; }
		#createModal .create-list { display: grid; grid-template-columns: 1fr; gap: 6px; }
		#createModal .type-card { height: 44px; min-height: 44px; display: grid; grid-template-columns: 34px 1fr auto; align-items: center; text-align: left; padding: 0 12px; border-radius: 14px; user-select: none; -webkit-user-select: none; }
		#createModal .type-card::after { content: "Create"; color: var(--muted); font-size: 11px; opacity: 0; transform: translateX(-4px); transition: 0.14s ease; }
		#createModal .type-card:hover::after, #createModal .type-card.active::after { opacity: 1; transform: translateX(0); }
		#createModal .type-card.active { background: rgba(0, 122, 204, 0.16); border-color: var(--blue); }
		#createModal .type-icon { font-size: 17px; line-height: 1; margin: 0; }
		#createModal .type-name { font-size: 12px; margin: 0; font-weight: 700; }
		.tabs, .tab, .tab * { user-select: none; -webkit-user-select: none; }
		.tab { -webkit-user-drag: element; }

		/* Ultra compact create popover */
		#createModal.open .modal { width: 276px !important; border-radius: 18px !important; }
		#createModal .modal-head { height: 36px !important; padding: 0 10px 0 12px !important; }
		#createModal .modal-body { padding: 10px !important; gap: 8px !important; }
		#createModal .location-box { min-height: 30px !important; padding: 7px 9px !important; border-radius: 12px !important; font-size: 10px !important; }
		#createModal .create-list { gap: 5px !important; }
		#createModal .type-card { height: 32px !important; min-height: 32px !important; grid-template-columns: 24px 1fr !important; padding: 0 10px !important; border-radius: 11px !important; }
		#createModal .type-card::after { content: "" !important; display: none !important; }
		#createModal .type-icon { font-size: 13px !important; opacity: 0.9 !important; }
		#createModal .type-name { font-size: 11px !important; }
		#createModal input { height: 34px !important; border-radius: 12px !important; font-size: 12px !important; }
		#createModal .modal-actions { margin-top: 0 !important; gap: 7px !important; }
		#createModal .modal-actions button { height: 31px !important; border-radius: 12px !important; padding: 0 12px !important; }
		.tabs.dragging-tabs .tab { transition: transform 0.12s ease, background 0.12s ease; }

	</style>
</head>
<body>
	<div class="app" id="app">
		<div class="titlebar">
			<div class="brand"><span class="brand-icon"></span><span>Forge</span></div>
			<div class="command-center">Forge</div>
			<div class="title-actions">
				<button id="settingsButton" class="icon-button" title="Settings">⚙</button>
			</div>
		</div>

		<aside class="sidebar">
			<div class="sidebar-title">
				<span>Explorer</span>
				<div class="sidebar-actions">
					<button id="refreshButton" class="icon-button" title="Refresh tree">↻</button>
				</div>
			</div>

			<div class="session-panel">
				<div class="session-row">
					<input id="sessionInput" placeholder="Session ID" />
					<button id="loadButton" class="primary-button">Load</button>
				</div>
				<div id="status" class="status">Waiting for a Forge session...</div>
			</div>

			<div class="project-header">
				<span>Project</span>
				<span id="fileCount" class="file-count">0 items</span>
			</div>
			<div class="search-wrap"><input id="searchInput" placeholder="Search by name or path" /></div>
			<div id="tree" class="tree"></div>
		</aside>

		<div id="resizer" class="resizer"></div>

		<main class="main">
			<div id="tabs" class="tabs"></div>

			<div class="editor-header">
				<div class="editor-title">
					<strong id="fileTitle">No file open</strong>
					<span id="filePath">Load a session and open a script.</span>
				</div>
				<div class="editor-actions"></div>
			</div>

			<div class="editor-shell">
				<div id="monacoEditor"></div>
				<textarea id="fallbackEditor" spellcheck="false"></textarea>
				<div id="placeholder" class="placeholder">
					<div class="placeholder-card">
						<h1>Forge</h1>
						<p>Load your last workspace or paste a session to start coding with synced scripts, folders, moves and deletes.</p>
					</div>
				</div>
			</div>
		</main>

		<footer class="footer">
			<span id="footerLeft">Ready</span>
			<span id="footerRight">Ctrl+S: save · Ctrl+W / middle click: close · F2: rename · Delete: remove selected</span>
		</footer>
	</div>

	<div id="createModal" class="modal-backdrop">
		<div class="modal">
			<div class="modal-head">
				<div class="modal-title">Create</div>
				<button id="closeCreateButton" class="icon-button">×</button>
			</div>
			<div class="modal-body">
				<div id="createLocation" class="location-box">Parent: none</div>
				<div id="typeGrid" class="create-list"></div>
				<input id="createNameInput" placeholder="Instance name" />
				<div class="modal-actions">
					<button id="cancelCreateButton" class="secondary-button">Cancel</button>
					<button id="confirmCreateButton" class="primary-button">Create</button>
				</div>
			</div>
		</div>
	</div>

	<div id="confirmModal" class="modal-backdrop">
		<div class="modal">
			<div class="modal-head">
				<div id="confirmTitle" class="modal-title">Confirm</div>
				<button id="closeConfirmButton" class="icon-button">×</button>
			</div>
			<div class="modal-body">
				<div id="confirmMessage" class="location-box"></div>
				<div class="modal-actions">
					<button id="cancelConfirmButton" class="secondary-button">Cancel</button>
					<button id="acceptConfirmButton" class="danger-button">Confirm</button>
				</div>
			</div>
		</div>
	</div>

	<div id="settingsModal" class="modal-backdrop">
		<div class="modal">
			<div class="modal-head">
				<div class="modal-title">Editor Settings</div>
				<button id="closeSettingsButton" class="icon-button">×</button>
			</div>
			<div class="modal-body">
				<div class="setting-grid">
					<label for="fontFamilyInput">Font family</label>
					<input id="fontFamilyInput" placeholder="Cascadia Code, Consolas, monospace" />
					<label for="fontSizeInput">Font size</label>
					<input id="fontSizeInput" type="number" min="10" max="28" />
					<label for="autosaveInput">Autosave ms</label>
					<input id="autosaveInput" type="number" min="350" max="10000" />
					<label for="wordWrapInput">Word wrap</label>
					<select id="wordWrapInput"><option value="off">Off</option><option value="on">On</option></select>
					<label for="editorThemeInput">Editor theme</label>
					<select id="editorThemeInput"><option value="forge-vscode-dark">VS Code Dark</option><option value="forge-midnight">Midnight Blue</option><option value="forge-contrast">High Contrast</option><option value="forge-warm-dark">Warm Dark</option></select>
					<label for="minimapInput">Minimap</label>
					<input id="minimapInput" type="checkbox" />
				</div>
				<div class="modal-actions">
					<button id="resetSettingsButton" class="secondary-button">Reset</button>
					<button id="saveSettingsButton" class="primary-button">Apply</button>
				</div>
			</div>
		</div>
	</div>

	<div id="toastStack" class="toast-stack"></div>

	<script src="https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs/loader.min.js"></script>
	<script>
	(function() {
		"use strict";

		const ROOT_ORDER = ${JSON.stringify(ROOT_ORDER)};
		const SCRIPT_CLASSES = ["Script", "LocalScript", "ModuleScript"];
		const CREATE_TYPES = [
			{ className: "Folder", icon: "▸", label: "Folder", defaultName: "Folder" },
			{ className: "Script", icon: "S", label: "Script", defaultName: "Script" },
			{ className: "LocalScript", icon: "L", label: "Local", defaultName: "LocalScript" },
			{ className: "ModuleScript", icon: "M", label: "Module", defaultName: "ModuleScript" },
		];

		const FILES_POLL_INTERVAL = 1800;
		const STORAGE = {
			session: "Forge.SessionId",
			sidebar: "Forge.SidebarWidth",
			expanded: "Forge.ExpandedNodes",
			settings: "Forge.EditorSettings",
		};

		const sessionInput = document.getElementById("sessionInput");
		const loadButton = document.getElementById("loadButton");
		const refreshButton = document.getElementById("refreshButton");
		const searchInput = document.getElementById("searchInput");
		const statusEl = document.getElementById("status");
		const fileCount = document.getElementById("fileCount");
		const treeEl = document.getElementById("tree");
		const tabsEl = document.getElementById("tabs");
		const fileTitle = document.getElementById("fileTitle");
		const filePath = document.getElementById("filePath");
		const footerLeft = document.getElementById("footerLeft");
		const footerRight = document.getElementById("footerRight");
		const monacoHost = document.getElementById("monacoEditor");
		const fallbackEditor = document.getElementById("fallbackEditor");
		const placeholder = document.getElementById("placeholder");
		const resizer = document.getElementById("resizer");
		const createModal = document.getElementById("createModal");
		const createLocation = document.getElementById("createLocation");
		const typeGrid = document.getElementById("typeGrid");
		const createNameInput = document.getElementById("createNameInput");
		const closeCreateButton = document.getElementById("closeCreateButton");
		const cancelCreateButton = document.getElementById("cancelCreateButton");
		const confirmCreateButton = document.getElementById("confirmCreateButton");
		const confirmModal = document.getElementById("confirmModal");
		const confirmTitle = document.getElementById("confirmTitle");
		const confirmMessage = document.getElementById("confirmMessage");
		const closeConfirmButton = document.getElementById("closeConfirmButton");
		const cancelConfirmButton = document.getElementById("cancelConfirmButton");
		const acceptConfirmButton = document.getElementById("acceptConfirmButton");
		const settingsButton = document.getElementById("settingsButton");
		const settingsModal = document.getElementById("settingsModal");
		const closeSettingsButton = document.getElementById("closeSettingsButton");
		const fontFamilyInput = document.getElementById("fontFamilyInput");
		const fontSizeInput = document.getElementById("fontSizeInput");
		const autosaveInput = document.getElementById("autosaveInput");
		const wordWrapInput = document.getElementById("wordWrapInput");
		const editorThemeInput = document.getElementById("editorThemeInput");
		const minimapInput = document.getElementById("minimapInput");
		const resetSettingsButton = document.getElementById("resetSettingsButton");
		const saveSettingsButton = document.getElementById("saveSettingsButton");
		const toastStack = document.getElementById("toastStack");

		let currentSessionId = "";
		let loadedFiles = [];
		let loadedFilesById = new Map();
		let treeRoot = null;
		let nodeByKey = new Map();
		let selectedKey = "";
		let selectedPayload = null;
		let currentFileId = "";
		let openTabs = new Map();
		let expandedKeys = new Set(loadJson(STORAGE.expanded, []));
		let pollTimer = null;
		let autosaveTimer = null;
		let isLoadingFiles = false;
		let editor = null;
		let editorReady = false;
		let applyingEditorValue = false;
		let draggingItemId = "";
		let draggingTabId = "";
		let renamingItemId = "";
		let pendingCreateParent = null;
		let selectedCreateClass = "Script";
		let confirmResolver = null;
		let settings = loadJson(STORAGE.settings, {
			fontFamily: "Cascadia Code, Consolas, monospace",
			fontSize: 13,
			autosaveMs: 900,
			wordWrap: "off",
			editorTheme: "forge-vscode-dark",
			minimap: true,
		});

		function loadJson(key, fallback) {
			try {
				const raw = localStorage.getItem(key);
				return raw ? JSON.parse(raw) : fallback;
			} catch (error) {
				return fallback;
			}
		}

		function saveJson(key, value) {
			try { localStorage.setItem(key, JSON.stringify(value)); } catch (error) {}
		}

		function escapeHtml(value) {
			return String(value || "")
				.replace(/&/g, "&amp;")
				.replace(/</g, "&lt;")
				.replace(/>/g, "&gt;")
				.replace(/"/g, "&quot;")
				.replace(/'/g, "&#039;");
		}

		function sanitizeClientName(value) {
			return String(value || "")
				.trim()
				.replace(/[\\/\0]/g, "-")
				.slice(0, 80);
		}

		function clamp(number, min, max) {
			return Math.max(min, Math.min(max, number));
		}

		function isScriptClass(className) {
			return SCRIPT_CLASSES.includes(className);
		}

		function isScriptItem(item) {
			return item && isScriptClass(item.className);
		}

		function getFullPath(item) {
			return item.root + (item.relativePath ? "/" + item.relativePath : "");
		}

		function getParentPath(relativePath) {
			const parts = String(relativePath || "").split("/").filter(Boolean);
			parts.pop();
			return parts.join("/");
		}

		function getNameFromPath(relativePath) {
			const parts = String(relativePath || "").split("/").filter(Boolean);
			return parts[parts.length - 1] || "";
		}

		function setStatus(message, type) {
			statusEl.textContent = message;
			statusEl.className = "status";
			if (type) statusEl.classList.add(type);
			footerLeft.textContent = message;
		}

		function showToast(message, type) {
			const item = document.createElement("div");
			item.className = "toast" + (type ? " " + type : "");
			item.textContent = message;
			toastStack.appendChild(item);

			setTimeout(function() {
				item.style.opacity = "0";
				item.style.transform = "translateY(8px)";
			}, 2600);

			setTimeout(function() {
				if (item.parentNode) item.parentNode.removeChild(item);
			}, 3000);
		}

		function requestConfirm(options) {
			confirmTitle.textContent = options.title || "Confirm";
			confirmMessage.textContent = options.message || "Are you sure?";
			acceptConfirmButton.textContent = options.acceptText || "Confirm";
			confirmModal.classList.add("open");

			return new Promise(function(resolve) {
				confirmResolver = resolve;
			});
		}

		function closeConfirm(value) {
			confirmModal.classList.remove("open");
			if (confirmResolver) {
				const resolver = confirmResolver;
				confirmResolver = null;
				resolver(value);
			}
		}

		function updateLoadedFilesIndex() {
			loadedFilesById = new Map();
			for (const item of loadedFiles) loadedFilesById.set(item.fileId, item);
		}

		function getLoadedFile(fileId) {
			return loadedFilesById.get(fileId) || null;
		}

		function setSelectedNode(node) {
			if (!node) {
				selectedKey = "";
				selectedPayload = null;
			} else {
				selectedKey = node.key;
				selectedPayload = getParentPayload(node);
			}
			renderTree();
			updateActionButtons();
		}

		function updateActionButtons() {
			const currentTab = openTabs.get(currentFileId) || null;
			placeholder.style.display = currentTab ? "none" : "grid";

			if (currentTab) {
				fileTitle.textContent = currentTab.name + " [" + currentTab.className + "]";
				filePath.textContent = currentTab.root + "/" + currentTab.relativePath;
				document.title = "Forge - " + currentTab.name + ".lua";
			} else {
				fileTitle.textContent = "No file open";
				filePath.textContent = "Load a session and open a script.";
				document.title = "Forge";
			}
		}

		function getDeleteTarget() {
			if (selectedPayload && selectedPayload.itemId) {
				return getLoadedFile(selectedPayload.itemId);
			}

			if (currentFileId) {
				return getLoadedFile(currentFileId);
			}

			return null;
		}

		function nodeKey(root, relativePath, item) {
			if (!relativePath) return "root:" + root;
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

			nodeByKey.set(key, node);
			return node;
		}

		function getItemParentId(item) {
			return item && item.parentItemId ? item.parentItemId : "";
		}

		function getItemByPath(root, relativePath) {
			const normalized = String(relativePath || "");
			return loadedFiles.find(function(item) {
				return item.root === root && item.relativePath === normalized;
			}) || null;
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
			nodeByKey = new Map();
			const root = createNode("__root__", "", "", null);
			const itemNodes = new Map();

			for (const rootName of ROOT_ORDER) {
				root.children.set(rootName, createNode(rootName, rootName, "", null));
			}

			for (const item of loadedFiles) {
				const node = createNode(item.name, item.root, item.relativePath, item);
				itemNodes.set(item.fileId, node);
			}

			for (const item of loadedFiles) {
				if (!root.children.has(item.root)) {
					root.children.set(item.root, createNode(item.root, item.root, "", null));
				}

				const node = itemNodes.get(item.fileId);
				let parentNode = null;
				const parentId = getItemParentId(item);

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

			for (const rootNode of root.children.values()) {
				if (!expandedKeys.has(rootNode.key)) expandedKeys.add(rootNode.key);
			}

			treeRoot = root;
		}

		function getNodeClass(node) {
			if (!node.relativePath) return "Root";
			return node.item ? node.item.className : "Instance";
		}

		function getNodeIcon(node) {
			const className = getNodeClass(node);

			if (!node.relativePath) return { icon: "◉", cls: "root" };
			if (className === "Folder") return { icon: "▰", cls: "folder" };
			if (className === "ModuleScript") return { icon: "M", cls: "module" };
			if (className === "LocalScript") return { icon: "L", cls: "script" };
			if (className === "Script") return { icon: "S", cls: "script" };
			return { icon: "◇", cls: "instance" };
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
			return nodes.sort(function(a, b) {
				const aClass = getNodeClass(a);
				const bClass = getNodeClass(b);
				const aScript = isScriptClass(aClass);
				const bScript = isScriptClass(bClass);

				if (!a.relativePath && !b.relativePath) return ROOT_ORDER.indexOf(a.root) - ROOT_ORDER.indexOf(b.root);
				if (aClass === "Folder" && bClass !== "Folder") return -1;
				if (aClass !== "Folder" && bClass === "Folder") return 1;
				if (!aScript && bScript) return -1;
				if (aScript && !bScript) return 1;
				return a.name.localeCompare(b.name);
			});
		}

		function nodeMatchesSearch(node, query) {
			if (!query) return true;

			const target = (node.name + " " + node.root + "/" + node.relativePath + " " + getNodeClass(node)).toLowerCase();
			if (target.includes(query)) return true;

			for (const child of node.children.values()) {
				if (nodeMatchesSearch(child, query)) return true;
			}

			return false;
		}

		function isDescendantPath(item, targetParent) {
			if (!item || !targetParent) return false;
			if (targetParent.itemId && targetParent.itemId === item.fileId) return true;

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

		function renderTree() {
			buildTree();

			const query = searchInput.value.trim().toLowerCase();
			treeEl.innerHTML = "";
			fileCount.textContent = loadedFiles.length + (loadedFiles.length === 1 ? " item" : " items");

			if (!currentSessionId) {
				treeEl.innerHTML = '<div class="tree-empty">Load a session to show your project tree.</div>';
				return;
			}

			if (loadedFiles.length === 0) {
				treeEl.innerHTML = '<div class="tree-empty">No scripts or folders found yet. Use the + button on a root to create your first script or folder.</div>';
			}

			const fragment = document.createDocumentFragment();
			for (const node of sortNodes(Array.from(treeRoot.children.values()))) {
				if (node.children.size === 0 && query) continue;
				renderNode(fragment, node, 0, query);
			}

			treeEl.appendChild(fragment);
			updateActionButtons();
		}

		function renderNode(parent, node, depth, query) {
			if (!nodeMatchesSearch(node, query)) return;

			const children = sortNodes(Array.from(node.children.values())).filter(child => nodeMatchesSearch(child, query));
			const hasChildren = children.length > 0;
			const isExpanded = query ? true : expandedKeys.has(node.key);
			const row = document.createElement("div");
			row.className = "tree-row";
			row.style.paddingLeft = (depth * 14 + 4) + "px";
			row.dataset.key = node.key;

			if (selectedKey === node.key) row.classList.add("selected");
			if (node.item && currentFileId === node.item.fileId) row.classList.add("opened");

			const chevron = document.createElement("button");
			chevron.className = "chevron" + (hasChildren ? "" : " empty");
			chevron.textContent = hasChildren ? (isExpanded ? "▾" : "▸") : "·";
			chevron.addEventListener("click", function(event) {
				event.stopPropagation();
				if (!hasChildren) return;

				if (expandedKeys.has(node.key)) expandedKeys.delete(node.key);
				else expandedKeys.add(node.key);

				saveJson(STORAGE.expanded, Array.from(expandedKeys));
				renderTree();
			});

			const iconData = getNodeIcon(node);
			const icon = document.createElement("span");
			icon.className = "node-icon " + iconData.cls;
			icon.textContent = iconData.icon;

			let name = null;

			if (node.item && renamingItemId === node.item.fileId) {
				name = document.createElement("input");
				name.className = "node-rename-input";
				name.value = node.name;
				name.spellcheck = false;
				let renameFinished = false;

				function finishRename(shouldCommit) {
					if (renameFinished) return;
					renameFinished = true;

					if (shouldCommit) {
						renameItem(node.item.fileId, name.value);
					} else {
						renamingItemId = "";
						renderTree();
					}
				}

				name.addEventListener("click", function(event) { event.stopPropagation(); });
				name.addEventListener("dblclick", function(event) { event.stopPropagation(); });
				name.addEventListener("mousedown", function(event) { event.stopPropagation(); });
				name.addEventListener("keydown", function(event) {
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
				name.addEventListener("blur", function() { finishRename(true); });

				setTimeout(function() {
					name.focus();
					name.select();
				}, 20);
			} else {
				name = document.createElement("span");
				name.className = "node-name";
				name.textContent = node.name;
			}

			const actions = document.createElement("span");
			actions.className = "node-actions";

			const addButton = document.createElement("button");
			addButton.className = "node-action";
			addButton.title = "Create inside " + (node.root + (node.relativePath ? "/" + node.relativePath : ""));
			addButton.textContent = "+";
			addButton.addEventListener("click", function(event) {
				event.stopPropagation();
				setSelectedNode(node);
				openCreatePanel(getParentPayload(node), "Script");
			});

			const deleteAction = document.createElement("button");
			deleteAction.className = "node-action delete-node-action";
			deleteAction.title = "Delete selected item";
			deleteAction.textContent = "×";
			deleteAction.addEventListener("click", function(event) {
				event.stopPropagation();
				setSelectedNode(node);
				deleteSelectedItem();
			});

			actions.appendChild(addButton);
			if (node.item) actions.appendChild(deleteAction);
			row.appendChild(chevron);
			row.appendChild(icon);
			row.appendChild(name);
			row.appendChild(actions);

			row.addEventListener("click", function() {
				if (node.item && renamingItemId === node.item.fileId) return;
				setSelectedNode(node);
				if (node.item && isScriptItem(node.item)) openFile(node.item);
			});

			row.addEventListener("dblclick", function(event) {
				event.stopPropagation();
				if (node.item && renamingItemId === node.item.fileId) return;
				if (hasChildren) {
					if (expandedKeys.has(node.key)) expandedKeys.delete(node.key);
					else expandedKeys.add(node.key);
					saveJson(STORAGE.expanded, Array.from(expandedKeys));
					renderTree();
				}
			});

			if (node.item && (isScriptClass(node.item.className) || node.item.className === "Folder")) {
				row.draggable = true;
				row.addEventListener("dragstart", function(event) {
					event.stopPropagation();
					draggingItemId = node.item.fileId;
					event.dataTransfer.setData("text/plain", node.item.fileId);
					event.dataTransfer.effectAllowed = "move";
				});

				row.addEventListener("dragend", function() {
					draggingItemId = "";
				});
			}

			row.addEventListener("dragover", function(event) {
				const draggedId = draggingItemId || event.dataTransfer.getData("text/plain");
				const dragged = getLoadedFile(draggedId);
				const target = getParentPayload(node);

				if (!dragged || isDescendantPath(dragged, target)) return;

				event.preventDefault();
				row.classList.add("drag-over");
			});

			row.addEventListener("dragleave", function() {
				row.classList.remove("drag-over");
			});

			row.addEventListener("drop", function(event) {
				event.preventDefault();
				event.stopPropagation();
				row.classList.remove("drag-over");

				const draggedId = draggingItemId || event.dataTransfer.getData("text/plain");
				draggingItemId = "";
				moveItem(draggedId, getParentPayload(node));
			});

			parent.appendChild(row);

			if (hasChildren && isExpanded) {
				for (const child of children) renderNode(parent, child, depth + 1, query);
			}
		}

		function reorderOpenTab(fromId, toId) {
			if (!fromId || !toId || fromId === toId || !openTabs.has(fromId) || !openTabs.has(toId)) return;
			const entries = Array.from(openTabs.entries());
			const fromIndex = entries.findIndex(function(entry) { return entry[0] === fromId; });
			const toIndex = entries.findIndex(function(entry) { return entry[0] === toId; });
			if (fromIndex < 0 || toIndex < 0) return;
			const moved = entries.splice(fromIndex, 1)[0];
			entries.splice(toIndex, 0, moved);
			openTabs.clear();
			for (const entry of entries) openTabs.set(entry[0], entry[1]);
			renderTabs();
		}

		function reorderTab(sourceId, targetId, placeAfter) {
			if (!openTabs.has(sourceId) || !openTabs.has(targetId) || sourceId === targetId) return;

			const entries = Array.from(openTabs.entries());
			const sourceEntry = entries.find(function(entry) { return entry[0] === sourceId; });
			let filtered = entries.filter(function(entry) { return entry[0] !== sourceId; });
			let targetIndex = filtered.findIndex(function(entry) { return entry[0] === targetId; });
			if (targetIndex < 0 || !sourceEntry) return;
			if (placeAfter) targetIndex += 1;
			filtered.splice(targetIndex, 0, sourceEntry);
			openTabs.clear();
			for (const entry of filtered) openTabs.set(entry[0], entry[1]);
			renderTabs();
		}

		function renderTabs() {
			tabsEl.innerHTML = "";

			for (const tab of openTabs.values()) {
				const item = document.createElement("div");
				item.className = "tab draggable-tab" + (tab.fileId === currentFileId ? " active" : "") + (tab.dirty ? " dirty" : "");
				item.title = tab.root + "/" + tab.relativePath;
				item.draggable = true;

				const icon = document.createElement("span");
				icon.className = "node-icon " + (tab.className === "ModuleScript" ? "module" : "script");
				icon.textContent = tab.className === "ModuleScript" ? "M" : (tab.className === "LocalScript" ? "L" : "S");

				const name = document.createElement("span");
				name.className = "tab-name";
				name.textContent = tab.name;

				const dot = document.createElement("span");
				dot.className = "dirty-dot";

				const close = document.createElement("button");
				close.className = "tab-close";
				close.textContent = "×";
				close.draggable = false;
				close.addEventListener("mousedown", function(event) { event.stopPropagation(); });
				close.addEventListener("click", function(event) {
					event.stopPropagation();
					closeTab(tab.fileId);
				});

				item.addEventListener("click", function() { switchTab(tab.fileId); });
				item.addEventListener("auxclick", function(event) {
					if (event.button === 1) {
						event.preventDefault();
						closeTab(tab.fileId);
					}
				});
				item.addEventListener("mousedown", function(event) {
					if (event.button === 1) event.preventDefault();
				});
				item.addEventListener("dragstart", function(event) {
					draggingTabId = tab.fileId;
					tabsEl.classList.add("dragging-tabs");
					event.dataTransfer.setData("text/forge-tab", tab.fileId);
					event.dataTransfer.setData("text/plain", tab.fileId);
					event.dataTransfer.effectAllowed = "move";
					item.classList.add("dragging");
				});
				item.addEventListener("dragend", function() {
					draggingTabId = "";
					tabsEl.classList.remove("dragging-tabs");
					item.classList.remove("dragging", "drag-over-left", "drag-over-right");
				});
				item.addEventListener("dragover", function(event) {
					const sourceId = draggingTabId || event.dataTransfer.getData("text/forge-tab") || event.dataTransfer.getData("text/plain");
					if (!sourceId || sourceId === tab.fileId || !openTabs.has(sourceId)) return;
					event.preventDefault();
					event.dataTransfer.dropEffect = "move";
					const rect = item.getBoundingClientRect();
					const placeAfter = event.clientX > rect.left + rect.width / 2;
					item.classList.toggle("drag-over-left", !placeAfter);
					item.classList.toggle("drag-over-right", placeAfter);
				});
				item.addEventListener("dragenter", function(event) {
					const sourceId = draggingTabId || event.dataTransfer.getData("text/forge-tab") || event.dataTransfer.getData("text/plain");
					if (!sourceId || sourceId === tab.fileId || !openTabs.has(sourceId)) return;
					event.preventDefault();
				});
				item.addEventListener("dragleave", function() {
					item.classList.remove("drag-over-left", "drag-over-right");
				});
				item.addEventListener("drop", function(event) {
					event.preventDefault();
					item.classList.remove("drag-over-left", "drag-over-right");
					const sourceId = draggingTabId || event.dataTransfer.getData("text/forge-tab") || event.dataTransfer.getData("text/plain");
					draggingTabId = "";
					tabsEl.classList.remove("dragging-tabs");
					if (!sourceId || sourceId === tab.fileId || !openTabs.has(sourceId)) return;
					const rect = item.getBoundingClientRect();
					const placeAfter = event.clientX > rect.left + rect.width / 2;
					reorderTab(sourceId, tab.fileId, placeAfter);
				});
				item.appendChild(icon);
				item.appendChild(name);
				item.appendChild(dot);
				item.appendChild(close);
				tabsEl.appendChild(item);
			}
		}

		function getEditorValue() {
			if (editorReady && editor) return editor.getValue();
			return fallbackEditor.value;
		}

		function setEditorValue(value) {
			applyingEditorValue = true;

			if (editorReady && editor) editor.setValue(value || "");
			fallbackEditor.value = value || "";

			setTimeout(function() { applyingEditorValue = false; }, 0);
		}

		function switchTab(fileId) {
			const tab = openTabs.get(fileId);
			if (!tab) return;

			currentFileId = fileId;
			selectedKey = "item:" + fileId;
			selectedPayload = { root: tab.root, relativePath: tab.relativePath, itemId: tab.fileId, label: tab.root + "/" + tab.relativePath };
			setEditorValue(tab.source);
			renderTabs();
			renderTree();
			updateActionButtons();
		}

		async function openFile(file) {
			if (!currentSessionId || !file || !isScriptItem(file)) return;

			if (openTabs.has(file.fileId)) {
				switchTab(file.fileId);
				return;
			}

			setStatus("Opening " + file.name + "...", "warning");

			try {
				const response = await fetch("/sessions/" + encodeURIComponent(currentSessionId) + "/files/" + encodeURIComponent(file.fileId) + "/source");
				const data = await response.json();

				if (!response.ok || !data.ok) throw new Error(data.error || "Failed to open script.");

				openTabs.set(file.fileId, {
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
				});

				switchTab(file.fileId);
				setStatus("Opened " + file.name, "success");
			} catch (error) {
				setStatus(error.message, "error");
				showToast(error.message, "error");
			}
		}

		async function closeTab(fileId, force) {
			const tab = openTabs.get(fileId);
			if (!tab) return;

			if (tab.dirty && !force) {
				const confirmed = await requestConfirm({
					title: "Close unsaved script",
					message: tab.name + " has unsaved changes. Close it anyway?",
					acceptText: "Close",
				});

				if (!confirmed) return;
			}

			openTabs.delete(fileId);

			if (currentFileId === fileId) {
				const next = openTabs.keys().next();
				currentFileId = next.done ? "" : next.value;
				if (currentFileId) {
					switchTab(currentFileId);
				} else {
					setEditorValue("");
				}
			}

			renderTabs();
			updateActionButtons();
		}

		function markCurrentDirty() {
			if (applyingEditorValue || !currentFileId) return;

			const tab = openTabs.get(currentFileId);
			if (!tab) return;

			tab.source = getEditorValue();
			tab.dirty = true;
			renderTabs();
			updateActionButtons();
			scheduleAutoSave();
		}

		function scheduleAutoSave() {
			clearTimeout(autosaveTimer);
			autosaveTimer = setTimeout(function() { saveCurrentFile(true); }, settings.autosaveMs);
		}

		async function saveCurrentFile(silent) {
			if (!currentSessionId || !currentFileId) return;

			const tab = openTabs.get(currentFileId);
			if (!tab || !tab.dirty) return;

			tab.source = getEditorValue();

			if (!silent) setStatus("Saving " + tab.name + "...", "warning");

			try {
				const response = await fetch("/sessions/" + encodeURIComponent(currentSessionId) + "/files/" + encodeURIComponent(tab.fileId) + "/save", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ source: tab.source, baseSourceHash: tab.baseSourceHash || tab.sourceHash || null }),
				});

				const data = await response.json();
				if (!response.ok || !data.ok) throw new Error(data.error || "Failed to save script.");

				tab.dirty = false;
				tab.sourceHash = data.sourceHash;
				tab.baseSourceHash = data.sourceHash;
				renderTabs();
				updateActionButtons();
				await fetchSessionFiles(false);
				setStatus("Saved revision " + data.revision + ". Studio will apply it automatically.", "success");
				if (!silent) showToast("Saved " + tab.name + ".", "success");
			} catch (error) {
				setStatus(error.message, "error");
				showToast(error.message, "error");
			}
		}

		async function fetchSessionFiles(showStatus) {
			if (!currentSessionId || isLoadingFiles) return false;

			isLoadingFiles = true;

			try {
				const response = await fetch("/sessions/" + encodeURIComponent(currentSessionId) + "/files");
				const data = await response.json();

				if (!response.ok || !data.ok) throw new Error(data.error || "Failed to load session.");

				const previousIds = new Set(loadedFiles.map(item => item.fileId));
				loadedFiles = Array.isArray(data.files) ? data.files : [];
				updateLoadedFilesIndex();

				for (const tab of Array.from(openTabs.values())) {
					const latest = getLoadedFile(tab.fileId);

					if (!latest) {
						openTabs.delete(tab.fileId);
						if (currentFileId === tab.fileId) currentFileId = "";
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

				if (currentFileId && !openTabs.has(currentFileId)) {
					const next = openTabs.keys().next();
					currentFileId = next.done ? "" : next.value;
					if (currentFileId) switchTab(currentFileId);
					else setEditorValue("");
				}

				renderTree();
				renderTabs();
				updateActionButtons();

				if (showStatus) setStatus("Loaded " + data.filesCount + " item(s).", "success");
				return true;
			} catch (error) {
				if (showStatus) {
					setStatus(error.message, "error");
					showToast(error.message, "error");
				}
				return false;
			} finally {
				isLoadingFiles = false;
			}
		}

		async function reloadTabSource(fileId, silent) {
			const tab = openTabs.get(fileId);
			if (!tab || tab.dirty) return;

			try {
				const response = await fetch("/sessions/" + encodeURIComponent(currentSessionId) + "/files/" + encodeURIComponent(fileId) + "/source");
				const data = await response.json();
				if (!response.ok || !data.ok) throw new Error(data.error || "Failed to reload source.");

				tab.source = data.source || "";
				tab.sourceHash = data.sourceHash || null;
				tab.baseSourceHash = data.sourceHash || null;
				if (currentFileId === fileId) setEditorValue(tab.source);
				if (!silent) showToast("Reloaded " + tab.name + ".", "success");
			} catch (error) {
				showToast(error.message, "error");
			}
		}

		function startPolling() {
			if (pollTimer) clearInterval(pollTimer);
			pollTimer = setInterval(function() { fetchSessionFiles(false); }, FILES_POLL_INTERVAL);
		}

		async function loadSession() {
			const id = sessionInput.value.trim();
			if (!id) {
				showToast("Session ID is required.", "warning");
				return;
			}

			currentSessionId = id;
			localStorage.setItem(STORAGE.session, id);
			setStatus("Loading session...", "warning");
			openTabs.clear();
			currentFileId = "";
			selectedKey = "";
			selectedPayload = null;
			setEditorValue("");

			const ok = await fetchSessionFiles(true);
			if (ok) {
				startPolling();
				showToast("Session loaded.", "success");
			}
		}

		function openCreatePanel(parent, defaultClass) {
			if (!currentSessionId) {
				showToast("Load a session first.", "warning");
				return;
			}

			pendingCreateParent = parent || getBestCreationParent();
			selectedCreateClass = defaultClass || "Script";
			createLocation.textContent = "Parent: " + (pendingCreateParent.label || (pendingCreateParent.root + (pendingCreateParent.relativePath ? "/" + pendingCreateParent.relativePath : "")));
			renderCreateTypes();
			createNameInput.value = getDefaultNameForClass(selectedCreateClass);
			const anchor = document.querySelector('.tree-row.selected') || refreshButton;
			const rect = anchor ? anchor.getBoundingClientRect() : { left: 340, bottom: 88 };
			const left = Math.min(Math.max(rect.left + 12, 12), window.innerWidth - 380);
			const top = Math.min(Math.max(rect.bottom + 8, 48), window.innerHeight - 310);
			createModal.style.setProperty('--create-x', left + 'px');
			createModal.style.setProperty('--create-y', top + 'px');
			createModal.classList.add("open");
			setTimeout(function() { createNameInput.focus(); }, 20);
		}

		function closeCreatePanel() {
			createModal.classList.remove("open");
			pendingCreateParent = null;
		}

		function renderCreateTypes() {
			typeGrid.innerHTML = "";
			for (const type of CREATE_TYPES) {
				const button = document.createElement("button");
				button.type = "button";
				button.className = "type-card" + (type.className === selectedCreateClass ? " active" : "");
				button.innerHTML = '<div class="type-icon">' + escapeHtml(type.icon) + '</div><div class="type-name">' + escapeHtml(type.label) + '</div>';
				button.addEventListener("click", function() {
					selectedCreateClass = type.className;
					createNameInput.value = getDefaultNameForClass(selectedCreateClass);
					renderCreateTypes();
					createNameInput.focus();
				});
				typeGrid.appendChild(button);
			}
		}

		function getDefaultNameForClass(className) {
			if (className === "Folder") return "Folder";
			if (className === "ModuleScript") return "NewModule";
			if (className === "LocalScript") return "LocalScript";
			return "Script";
		}

		function getDefaultSourceForClass(className, name) {
			if (className === "ModuleScript") return "local " + sanitizeLuaIdentifier(name || "Module") + " = {}\n\nreturn " + sanitizeLuaIdentifier(name || "Module") + "\n";
			if (className === "LocalScript") return "local Players = game:GetService(\"Players\")\n\nlocal Player = Players.LocalPlayer\n\n";
			if (className === "Script") return "-- " + (name || "Script") + "\n\n";
			return "";
		}

		function sanitizeLuaIdentifier(value) {
			const clean = String(value || "Module").replace(/[^A-Za-z0-9_]/g, "");
			if (!clean) return "Module";
			return /^[0-9]/.test(clean) ? "Module" + clean : clean;
		}

		function getBestCreationParent() {
			if (selectedPayload) return selectedPayload;

			const current = openTabs.get(currentFileId);
			if (current) return { root: current.root, relativePath: current.relativePath, itemId: current.fileId, label: current.root + "/" + current.relativePath };

			return { root: "ServerScriptService", relativePath: "", itemId: "", label: "ServerScriptService" };
		}

		async function createItem() {
			const parent = pendingCreateParent || getBestCreationParent();
			const className = selectedCreateClass;
			const name = createNameInput.value.trim();

			if (!name) {
				showToast("Name is required.", "warning");
				createNameInput.focus();
				return;
			}

			try {
				const response = await fetch("/sessions/" + encodeURIComponent(currentSessionId) + "/create", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						className: className,
						name: name,
						root: parent.root,
						parentRelativePath: parent.relativePath || "",
						parentItemId: parent.itemId || "",
						source: getDefaultSourceForClass(className, name),
					}),
				});

				const data = await response.json();
				if (!response.ok || !data.ok) throw new Error(data.error || "Failed to create instance.");

				if (parent && parent.root) {
					const parentKey = parent.itemId ? "item:" + parent.itemId : "root:" + parent.root;
					expandedKeys.add(parentKey);
					saveJson(STORAGE.expanded, Array.from(expandedKeys));
				}

				await fetchSessionFiles(false);
				closeCreatePanel();
				showToast("Created " + className + " " + name + ".", "success");

				if (data.item && isScriptItem(data.item)) {
					await openFile(data.item);
				} else if (data.item) {
					selectedKey = "item:" + data.item.fileId;
					selectedPayload = { root: data.item.root, relativePath: data.item.relativePath, itemId: data.item.fileId, label: data.item.root + "/" + data.item.relativePath };
					renderTree();
				}
			} catch (error) {
				showToast(error.message, "error");
				setStatus(error.message, "error");
			}
		}

		function getRenameTarget() {
			if (selectedPayload && selectedPayload.itemId) {
				return getLoadedFile(selectedPayload.itemId);
			}

			if (currentFileId) {
				return getLoadedFile(currentFileId);
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

			renamingItemId = item.fileId;
			selectedKey = "item:" + item.fileId;
			selectedPayload = {
				root: item.root,
				relativePath: item.relativePath,
				itemId: item.fileId,
				label: item.root + "/" + item.relativePath,
			};

			renderTree();
		}

		async function renameItem(fileId, rawName) {
			const item = getLoadedFile(fileId);
			const newName = sanitizeClientName(rawName);

			renamingItemId = "";

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
				const response = await fetch("/sessions/" + encodeURIComponent(currentSessionId) + "/files/" + encodeURIComponent(fileId) + "/move", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						root: item.root,
						parentRelativePath: item.parentRelativePath || getParentPath(item.relativePath),
						parentItemId: item.parentItemId || "",
						name: newName,
					}),
				});

				const data = await response.json();
				if (!response.ok || !data.ok) throw new Error(data.error || "Failed to rename item.");

				await fetchSessionFiles(false);
				const renamed = data.item || getLoadedFile(fileId);

				if (renamed && renamed.fileId) {
					selectedKey = "item:" + renamed.fileId;
					selectedPayload = { root: renamed.root, relativePath: renamed.relativePath, itemId: renamed.fileId, label: renamed.root + "/" + renamed.relativePath };
				}

				showToast("Renamed to " + newName + ".", "success");
			} catch (error) {
				showToast(error.message, "error");
				setStatus(error.message, "error");
				renderTree();
			}
		}

		async function moveItem(fileId, targetParent) {
			if (!fileId || !targetParent || !currentSessionId) return;

			const item = getLoadedFile(fileId);
			if (!item) {
				showToast("Item no longer exists.", "warning");
				return;
			}

			if (isDescendantPath(item, targetParent)) {
				showToast("You cannot move an item inside itself.", "warning");
				return;
			}

			if (item.root === targetParent.root && getParentPath(item.relativePath) === (targetParent.relativePath || "")) return;

			try {
				const response = await fetch("/sessions/" + encodeURIComponent(currentSessionId) + "/files/" + encodeURIComponent(fileId) + "/move", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						root: targetParent.root,
						parentRelativePath: targetParent.relativePath || "",
						parentItemId: targetParent.itemId || "",
						name: item.name,
					}),
				});

				const data = await response.json();
				if (!response.ok || !data.ok) throw new Error(data.error || "Failed to move item.");

				await fetchSessionFiles(false);
				showToast("Moved " + item.name + ".", "success");
			} catch (error) {
				showToast(error.message, "error");
				setStatus(error.message, "error");
			}
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
				const response = await fetch("/sessions/" + encodeURIComponent(currentSessionId) + "/files/" + encodeURIComponent(item.fileId) + "/delete", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({}),
				});

				const data = await response.json();
				if (!response.ok || !data.ok) throw new Error(data.error || "Failed to delete item.");

				const removed = Array.isArray(data.removed) ? data.removed : [{ fileId: item.fileId }];
				for (const removedItem of removed) {
					if (openTabs.has(removedItem.fileId)) await closeTab(removedItem.fileId, true);
				}

				selectedKey = "";
				selectedPayload = null;
				await fetchSessionFiles(false);
				showToast("Deleted " + item.name + ".", "success");
			} catch (error) {
				showToast(error.message, "error");
				setStatus(error.message, "error");
			}
		}

		function openSettings() {
			fontFamilyInput.value = settings.fontFamily;
			fontSizeInput.value = settings.fontSize;
			autosaveInput.value = settings.autosaveMs;
			wordWrapInput.value = settings.wordWrap;
			editorThemeInput.value = settings.editorTheme || "forge-vscode-dark";
			minimapInput.checked = !!settings.minimap;
			settingsModal.classList.add("open");
		}

		function closeSettings() {
			settingsModal.classList.remove("open");
		}

		function applySettings() {
			settings = {
				fontFamily: fontFamilyInput.value.trim() || "Cascadia Code, Consolas, monospace",
				fontSize: clamp(Number(fontSizeInput.value) || 13, 10, 28),
				autosaveMs: clamp(Number(autosaveInput.value) || 900, 350, 10000),
				wordWrap: wordWrapInput.value === "on" ? "on" : "off",
				editorTheme: editorThemeInput.value || "forge-vscode-dark",
				minimap: !!minimapInput.checked,
			};

			saveJson(STORAGE.settings, settings);
			applyEditorSettings();
			closeSettings();
			showToast("Settings applied.", "success");
		}

		function resetSettings() {
			settings = { fontFamily: "Cascadia Code, Consolas, monospace", fontSize: 13, autosaveMs: 900, wordWrap: "off", editorTheme: "forge-vscode-dark", minimap: true };
			saveJson(STORAGE.settings, settings);
			openSettings();
			applyEditorSettings();
		}

		function getFallbackThemeColors() {
			const themeName = settings.editorTheme || "forge-vscode-dark";

			if (themeName === "forge-midnight") return { background: "#0b1220", color: "#dbeafe" };
			if (themeName === "forge-contrast") return { background: "#000000", color: "#ffffff" };
			if (themeName === "forge-warm-dark") return { background: "#17120d", color: "#eadfc9" };

			return { background: "#1e1e1e", color: "#d4d4d4" };
		}

		function applyEditorSettings() {
			const fallbackColors = getFallbackThemeColors();
			fallbackEditor.style.fontFamily = settings.fontFamily;
			fallbackEditor.style.background = fallbackColors.background;
			fallbackEditor.style.color = fallbackColors.color;
			fallbackEditor.style.fontSize = settings.fontSize + "px";

			if (editorReady && editor) {
				editor.updateOptions({
					fontFamily: settings.fontFamily,
					fontSize: settings.fontSize,
					wordWrap: settings.wordWrap,
					minimap: { enabled: settings.minimap },
				});

				monaco.editor.setTheme(settings.editorTheme || "forge-vscode-dark");
			}
		}

		function setupEditor() {
			fallbackEditor.style.display = "block";
			fallbackEditor.addEventListener("input", markCurrentDirty);
			fallbackEditor.addEventListener("keydown", handleEditorKeys);
			applyEditorSettings();

			if (!window.require) return;

			try {
				window.require.config({ paths: { vs: "https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs" } });
				window.require(["vs/editor/editor.main"], function() {
					monaco.languages.setLanguageConfiguration("lua", {
						brackets: [["(", ")"], ["{", "}"], ["[", "]"]],
						autoClosingPairs: [
							{ open: "(", close: ")" },
							{ open: "{", close: "}" },
							{ open: "[", close: "]" },
							{ open: "\"", close: "\"" },
							{ open: "'", close: "'" },
						],
						surroundingPairs: [
							{ open: "(", close: ")" },
							{ open: "{", close: "}" },
							{ open: "[", close: "]" },
							{ open: "\"", close: "\"" },
							{ open: "'", close: "'" },
						],
					});

					monaco.editor.defineTheme("forge-vscode-dark", {
						base: "vs-dark",
						inherit: true,
						rules: [
							{ token: "keyword", foreground: "569CD6", fontStyle: "bold" },
							{ token: "string", foreground: "CE9178" },
							{ token: "number", foreground: "B5CEA8" },
							{ token: "comment", foreground: "6A9955", fontStyle: "italic" },
							{ token: "function", foreground: "DCDCAA" },
							{ token: "identifier", foreground: "D4D4D4" },
						],
						colors: {
							"editor.background": "#1e1e1e",
							"editor.foreground": "#d4d4d4",
							"editorLineNumber.foreground": "#858585",
							"editorLineNumber.activeForeground": "#c6c6c6",
							"editorCursor.foreground": "#aeafad",
							"editor.selectionBackground": "#264f78",
							"editor.inactiveSelectionBackground": "#3a3d41",
							"editorSuggestWidget.background": "#252526",
							"editorSuggestWidget.border": "#454545",
							"editorSuggestWidget.selectedBackground": "#04395e",
							"editorSuggestWidget.foreground": "#d4d4d4",
							"editorSuggestWidget.focusHighlightForeground": "#ffffff",
							"editorSuggestWidget.highlightForeground": "#4fc1ff",
							"editorWidget.background": "#252526",
							"editorWidget.border": "#454545",
						},
					});

					monaco.editor.defineTheme("forge-midnight", {
						base: "vs-dark",
						inherit: true,
						rules: [
							{ token: "keyword", foreground: "93c5fd", fontStyle: "bold" },
							{ token: "string", foreground: "fca5a5" },
							{ token: "number", foreground: "86efac" },
							{ token: "comment", foreground: "64748b", fontStyle: "italic" },
							{ token: "function", foreground: "fde68a" },
						],
						colors: {
							"editor.background": "#0b1220",
							"editor.foreground": "#dbeafe",
							"editorLineNumber.foreground": "#51607a",
							"editorCursor.foreground": "#93c5fd",
							"editor.selectionBackground": "#1d4ed888",
							"editorSuggestWidget.background": "#111827",
							"editorSuggestWidget.border": "#243044",
							"editorSuggestWidget.selectedBackground": "#1e3a8a",
							"editorSuggestWidget.foreground": "#dbeafe",
							"editorSuggestWidget.highlightForeground": "#93c5fd",
						},
					});

					monaco.editor.defineTheme("forge-contrast", {
						base: "hc-black",
						inherit: true,
						rules: [
							{ token: "keyword", foreground: "00aeff", fontStyle: "bold" },
							{ token: "string", foreground: "ffb86c" },
							{ token: "number", foreground: "50fa7b" },
							{ token: "comment", foreground: "7f7f7f", fontStyle: "italic" },
						],
						colors: {
							"editor.background": "#000000",
							"editor.foreground": "#ffffff",
							"editor.selectionBackground": "#004b76",
						},
					});

					monaco.editor.defineTheme("forge-warm-dark", {
						base: "vs-dark",
						inherit: true,
						rules: [
							{ token: "keyword", foreground: "d9a657", fontStyle: "bold" },
							{ token: "string", foreground: "c9a66b" },
							{ token: "number", foreground: "f0c674" },
							{ token: "comment", foreground: "7f735f", fontStyle: "italic" },
							{ token: "function", foreground: "f4d28c" },
						],
						colors: {
							"editor.background": "#17120d",
							"editor.foreground": "#eadfc9",
							"editorLineNumber.foreground": "#6f6048",
							"editorCursor.foreground": "#f2c56b",
							"editor.selectionBackground": "#5f431f88",
							"editorSuggestWidget.background": "#211910",
							"editorSuggestWidget.border": "#5a4224",
							"editorSuggestWidget.selectedBackground": "#4c3517",
							"editorSuggestWidget.foreground": "#eadfc9",
							"editorSuggestWidget.highlightForeground": "#ffd37a",
						},
					});

					const snippetRule = monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet;
					const serviceNames = [
						"Players", "ReplicatedStorage", "ServerScriptService", "ServerStorage", "StarterGui", "StarterPack",
						"StarterPlayer", "Workspace", "CollectionService", "TweenService", "RunService", "UserInputService",
						"ContextActionService", "Debris", "Lighting", "SoundService", "TextChatService", "HttpService"
					];

					const methodSuggestions = [
						{
							label: "GetService",
							kind: monaco.languages.CompletionItemKind.Method,
							detail: "Method · Tab",
							documentation: { value: "Completes only GetService(...). Use this after game: or game.." },
							insertText: "GetService(\"\${1:Players}\")",
						},
						{
							label: "GetChildren",
							kind: monaco.languages.CompletionItemKind.Method,
							detail: "Method · Tab",
							insertText: "GetChildren()",
						},
						{
							label: "GetDescendants",
							kind: monaco.languages.CompletionItemKind.Method,
							detail: "Method · Tab",
							insertText: "GetDescendants()",
						},
						{
							label: "FindFirstChild",
							kind: monaco.languages.CompletionItemKind.Method,
							detail: "Method · Tab",
							insertText: "FindFirstChild(\"\${1:Name}\")",
							insertTextRules: snippetRule,
						},
						{
							label: "WaitForChild",
							kind: monaco.languages.CompletionItemKind.Method,
							detail: "Method · Tab",
							insertText: "WaitForChild(\"\${1:Name}\")",
							insertTextRules: snippetRule,
						},
					];

					const snippets = [
						{
							label: "local service = game:GetService",
							filterText: "local service getservice game:GetService Service",
							detail: "Snippet · Tab",
							documentation: { value: "Creates a complete local service variable. Best used at the start of a line." },
							insertText: "local \${1:Players} = game:GetService(\"\${1:Players}\")",
						},
						{
							label: "Instance.new",
							filterText: "Instance.new instance new create object",
							detail: "Snippet · Tab",
							documentation: { value: "Creates an instance, names it and parents it." },
							insertText: "local \${1:object} = Instance.new(\"\${2:Folder}\")\n\${1:object}.Name = \"\${3:Name}\"\n\${1:object}.Parent = \${4:parent}",
						},
						{
							label: "local WaitForChild",
							filterText: "WaitForChild wait child local",
							detail: "Snippet · Tab",
							documentation: { value: "Creates a local variable from WaitForChild." },
							insertText: "local \${1:child} = \${2:parent}:WaitForChild(\"\${3:Name}\")",
						},
						{
							label: "Players.PlayerAdded",
							filterText: "PlayerAdded players player joined",
							detail: "Snippet · Tab",
							documentation: { value: "Server-side player join listener." },
							insertText: "local Players = game:GetService(\"Players\")\n\nPlayers.PlayerAdded:Connect(function(player)\n\t\${1}\nend)",
						},
						{
							label: "CollectionService:GetTagged",
							filterText: "CollectionService GetTagged tags",
							detail: "Snippet · Tab",
							documentation: { value: "Loops through tagged instances." },
							insertText: "local CollectionService = game:GetService(\"CollectionService\")\n\nfor _, instance in ipairs(CollectionService:GetTagged(\"\${1:Tag}\")) do\n\t\${2}\nend",
						},
						{
							label: "RemoteEvent.OnServerEvent",
							filterText: "RemoteEvent OnServerEvent remote server",
							detail: "Snippet · Tab",
							documentation: { value: "Server-side RemoteEvent listener." },
							insertText: "local ReplicatedStorage = game:GetService(\"ReplicatedStorage\")\nlocal Remote = ReplicatedStorage:WaitForChild(\"\${1:RemoteName}\")\n\nRemote.OnServerEvent:Connect(function(player, ...)\n\t\${2}\nend)",
						},
						{
							label: "RemoteEvent.FireServer",
							filterText: "RemoteEvent FireServer remote client",
							detail: "Snippet · Tab",
							documentation: { value: "Client-side RemoteEvent call." },
							insertText: "local ReplicatedStorage = game:GetService(\"ReplicatedStorage\")\nlocal Remote = ReplicatedStorage:WaitForChild(\"\${1:RemoteName}\")\n\nRemote:FireServer(\${2})",
						},
						{
							label: "local function",
							filterText: "function end local function",
							detail: "Snippet · Tab",
							documentation: { value: "Creates a local Lua function with end already inserted." },
							insertText: "local function \${1:name}(\${2})\n\t\${3}\nend",
						},
						{
							label: "task.spawn",
							filterText: "task.spawn thread async",
							detail: "Snippet · Tab",
							documentation: { value: "Runs code in a separate task." },
							insertText: "task.spawn(function()\n\t\${1}\nend)",
						},
						{
							label: "pcall",
							filterText: "pcall protected call",
							detail: "Snippet · Tab",
							documentation: { value: "Protected call pattern with error handling." },
							insertText: "local success, result = pcall(function()\n\t\${1}\nend)\n\nif not success then\n\twarn(result)\n\treturn\nend",
						},
					];

					function makeSuggestionRange(word, position) {
						return {
							startLineNumber: position.lineNumber,
							endLineNumber: position.lineNumber,
							startColumn: word.startColumn,
							endColumn: word.endColumn,
						};
					}

					function isAfterGameMember(linePrefix) {
						return /game[:\.]\w*$/.test(linePrefix);
					}

					function isAtCleanSnippetPlace(linePrefix) {
						const text = String(linePrefix || "");
						if (/game[:\.]\w*$/.test(text)) return false;
						if (/[\w\]\)\"'][:\.]\w*$/.test(text)) return false;
						if (/=\s*[^\s]*$/.test(text)) return false;
						return /^\s*$/.test(text) || /^\s*(local|function|task|pcall|Instance)\w*$/i.test(text);
					}

					monaco.languages.registerCompletionItemProvider("lua", {
						triggerCharacters: [".", ":"],
						provideCompletionItems: function(model, position) {
							const word = model.getWordUntilPosition(position);
							const range = makeSuggestionRange(word, position);
							const linePrefix = model.getLineContent(position.lineNumber).slice(0, position.column - 1);

							if (isAfterGameMember(linePrefix)) {
								return {
									incomplete: false,
									suggestions: methodSuggestions.map(function(item, index) {
										return {
											label: item.label,
											detail: item.detail,
											kind: item.kind,
											insertText: item.insertText,
											insertTextRules: item.insertTextRules || snippetRule,
											detail: item.detail,
											documentation: item.documentation,
											sortText: "000" + String(index).padStart(2, "0"),
											range: range,
										};
									}),
								};
							}

							const suggestions = [];

							for (const serviceName of serviceNames) {
								suggestions.push({
									label: serviceName,
									kind: monaco.languages.CompletionItemKind.Class,
									insertText: serviceName,
									detail: "Service",
									sortText: "020" + serviceName,
									range: range,
								});
							}

							if (isAtCleanSnippetPlace(linePrefix)) {
								for (let index = 0; index < snippets.length; index++) {
									const item = snippets[index];
									suggestions.push({
										label: item.label,
										kind: monaco.languages.CompletionItemKind.Snippet,
										insertText: item.insertText,
										insertTextRules: snippetRule,
										filterText: item.filterText,
										sortText: "000" + String(index).padStart(2, "0"),
										detail: item.detail,
										documentation: item.documentation,
										range: range,
									});
								}
							}

							return { incomplete: false, suggestions: suggestions };
						},
					});

					editor = monaco.editor.create(monacoHost, {
						value: fallbackEditor.value,
						language: "lua",
						theme: settings.editorTheme || "forge-vscode-dark",
						automaticLayout: true,
						fontFamily: settings.fontFamily,
						fontSize: settings.fontSize,
						wordWrap: settings.wordWrap,
						minimap: { enabled: settings.minimap },
						tabSize: 4,
						insertSpaces: false,
						formatOnPaste: true,
						formatOnType: true,
						autoClosingBrackets: "always",
						autoClosingQuotes: "always",
						tabCompletion: "on",
						snippetSuggestions: "top",
						suggestOnTriggerCharacters: true,
						quickSuggestions: { other: true, comments: false, strings: true },
						acceptSuggestionOnEnter: "on",
						suggestSelection: "first",
						wordBasedSuggestions: "matchingDocuments",
						suggest: {
							showIcons: false,
							preview: true,
							showSnippets: true,
							showStatusBar: true,
							insertMode: "replace",
							selectionMode: "always",
							localityBonus: true,
						},
					});

					editor.onDidChangeModelContent(markCurrentDirty);
					editor.onDidChangeCursorPosition(function(event) {
						footerRight.textContent = "Ln " + event.position.lineNumber + ", Col " + event.position.column + " · Ctrl+S save · Ctrl+W close · Lua";
					});

					editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, function() { saveCurrentFile(false); });
					editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyW, function() { if (currentFileId) closeTab(currentFileId); });
					editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyI, function() { openCreatePanel(getBestCreationParent(), "Script"); });

					editorReady = true;
					fallbackEditor.style.display = "none";
					applyEditorSettings();
				});
			} catch (error) {
				fallbackEditor.style.display = "block";
			}
		}

		function handleEditorKeys(event) {
			const key = event.key.toLowerCase();

			if ((event.ctrlKey || event.metaKey) && key === "s") {
				event.preventDefault();
				event.stopPropagation();
				saveCurrentFile(false);
			}

			if ((event.ctrlKey || event.metaKey) && key === "w") {
				event.preventDefault();
				event.stopPropagation();
				if (currentFileId) closeTab(currentFileId);
			}

			if ((event.ctrlKey || event.metaKey) && key === "i") {
				event.preventDefault();
				event.stopPropagation();
				openCreatePanel(getBestCreationParent(), "Script");
			}
		}

		function setupResizer() {
			const saved = Number(localStorage.getItem(STORAGE.sidebar));
			if (saved) document.documentElement.style.setProperty("--side-width", clamp(saved, 240, 620) + "px");

			let dragging = false;

			resizer.addEventListener("mousedown", function(event) {
				dragging = true;
				document.body.classList.add("resizing");
				event.preventDefault();
			});

			document.addEventListener("mousemove", function(event) {
				if (!dragging) return;
				const width = clamp(event.clientX, 240, 620);
				document.documentElement.style.setProperty("--side-width", width + "px");
				localStorage.setItem(STORAGE.sidebar, String(width));
			});

			document.addEventListener("mouseup", function() {
				if (!dragging) return;
				dragging = false;
				document.body.classList.remove("resizing");
			});
		}

		function isInputLike(target) {
			if (!target) return false;
			const tag = String(target.tagName || "").toLowerCase();
			return tag === "input" || tag === "textarea" || target.isContentEditable;
		}

		function bindEvents() {
			loadButton.addEventListener("click", loadSession);
			refreshButton.addEventListener("click", function() { fetchSessionFiles(true); });
			searchInput.addEventListener("input", renderTree);
			sessionInput.addEventListener("keydown", function(event) { if (event.key === "Enter") loadSession(); });

			closeCreateButton.addEventListener("click", closeCreatePanel);
			cancelCreateButton.addEventListener("click", closeCreatePanel);
			confirmCreateButton.addEventListener("click", createItem);
			createNameInput.addEventListener("keydown", function(event) {
				if (event.key === "Enter") createItem();
				if (event.key === "Escape") closeCreatePanel();
			});

			closeConfirmButton.addEventListener("click", function() { closeConfirm(false); });
			cancelConfirmButton.addEventListener("click", function() { closeConfirm(false); });
			acceptConfirmButton.addEventListener("click", function() { closeConfirm(true); });

			settingsButton.addEventListener("click", openSettings);
			closeSettingsButton.addEventListener("click", closeSettings);
			saveSettingsButton.addEventListener("click", applySettings);
			resetSettingsButton.addEventListener("click", resetSettings);

			window.addEventListener("keydown", function(event) {
				const key = event.key.toLowerCase();

				if ((event.ctrlKey || event.metaKey) && key === "w") {
					event.preventDefault();
					event.stopImmediatePropagation();
					if (currentFileId) closeTab(currentFileId);
				}
			}, true);

			document.addEventListener("keydown", function(event) {
				const key = event.key.toLowerCase();

				if ((event.ctrlKey || event.metaKey) && key === "s") {
					event.preventDefault();
					saveCurrentFile(false);
				}

				if ((event.ctrlKey || event.metaKey) && key === "w") {
					event.preventDefault();
					if (currentFileId) closeTab(currentFileId);
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
					closeCreatePanel();
					closeSettings();
					closeConfirm(false);
				}
			});
		}

		function boot() {
			const savedSession = localStorage.getItem(STORAGE.session);
			if (savedSession) sessionInput.value = savedSession;

			setupResizer();
			setupEditor();
			bindEvents();
			renderTree();
			updateActionButtons();

			if (savedSession) {
				setTimeout(function() {
					loadSession();
				}, 150);
			}
		}

		boot();
	})();
	</script>
</body>
</html>`;
}

const server = http.createServer(async (req, res) => {
	try {
		if (req.method === "OPTIONS") {
			res.writeHead(204, {
				"Access-Control-Allow-Origin": "*",
				"Access-Control-Allow-Methods": "GET, POST, OPTIONS",
				"Access-Control-Allow-Headers": "Content-Type, X-StudioBridge-Session, X-StudioBridge-Secret",
			});
			res.end();
			return;
		}

		const url = new URL(req.url, "http://localhost");

		if (req.method === "GET" && url.pathname === "/") {
			sendHtml(res, 200, getHomeHtml());
			return;
		}

		if (req.method === "GET" && url.pathname === "/health") {
			sendJson(res, 200, { ok: true, service: "Forge API", version: "1.1.0-forge", time: Date.now() });
			return;
		}

		if (req.method === "POST" && url.pathname === "/sessions/upload") {
			const headers = getSessionHeaders(req);
			const body = await readBody(req);

			if (!headers.sessionId) {
				sendJson(res, 400, { ok: false, error: "Missing X-StudioBridge-Session header" });
				return;
			}

			if (!headers.secret) {
				sendJson(res, 400, { ok: false, error: "Missing X-StudioBridge-Secret header" });
				return;
			}

			if (!body || !Array.isArray(body.files)) {
				sendJson(res, 400, { ok: false, error: "Invalid upload body. Expected files array." });
				return;
			}

			const existingSession = sessions.get(headers.sessionId);

			if (existingSession && existingSession.secret && existingSession.secret !== headers.secret) {
				sendJson(res, 403, { ok: false, error: "Invalid session secret." });
				return;
			}

			const uploadedFiles = normalizeUploadedFiles(body.files);
			const sessionData = {
				sessionId: headers.sessionId,
				secret: headers.secret,
				uploadedAt: Date.now(),
				filesCount: uploadedFiles.length,
				files: uploadedFiles,
				changes: existingSession && Array.isArray(existingSession.changes) ? existingSession.changes : [],
				nextRevision: existingSession && Number.isFinite(existingSession.nextRevision) ? existingSession.nextRevision : 1,
			};

			sessions.set(headers.sessionId, sessionData);
			console.log("[Forge API] Session uploaded:", headers.sessionId, "Items:", uploadedFiles.length);
			sendJson(res, 200, { ok: true, sessionId: headers.sessionId, filesCount: uploadedFiles.length, uploadedAt: sessionData.uploadedAt });
			return;
		}

		const filesMatch = url.pathname.match(/^\/sessions\/([^/]+)\/files$/);
		if (req.method === "GET" && filesMatch) {
			const sessionId = decodeURIComponent(filesMatch[1]);
			const sessionData = sessions.get(sessionId);

			if (!sessionData) {
				sendJson(res, 404, { ok: false, error: "Session not found", sessionId });
				return;
			}

			sendJson(res, 200, { ok: true, sessionId, filesCount: sessionData.filesCount, uploadedAt: sessionData.uploadedAt, rootOrder: ROOT_ORDER, files: getPublicFiles(sessionData.files) });
			return;
		}

		const createMatch = url.pathname.match(/^\/sessions\/([^/]+)\/create$/);
		if (req.method === "POST" && createMatch) {
			const sessionId = decodeURIComponent(createMatch[1]);
			const sessionData = sessions.get(sessionId);

			if (!sessionData) {
				sendJson(res, 404, { ok: false, error: "Session not found", sessionId });
				return;
			}

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

			const relativePath = joinRelativePath(parentRelativePath, name);
			const source = isScriptClass(className) && body && typeof body.source === "string" ? body.source : "";
			const itemId = generateItemId(root, relativePath, className);
			const item = {
				fileId: itemId,
					parentItemId,
				itemId,
				name,
				className,
				kind: isScriptClass(className) ? "script" : "folder",
				root,
				relativePath,
				parentRelativePath,
				source,
				sourceLength: source.length,
				sourceHash: hashString(isScriptClass(className) ? source : className + "|" + itemId + "|" + root + "|" + relativePath),
				updatedAt: Date.now(),
			};

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

			console.log("[Forge API] Item created:", root + "/" + relativePath, "Revision:", change.revision);
			sendJson(res, 200, { ok: true, sessionId, item: getPublicFiles([item])[0], revision: change.revision });
			return;
		}

		const sourceMatch = url.pathname.match(/^\/sessions\/([^/]+)\/files\/([^/]+)\/source$/);
		if (req.method === "GET" && sourceMatch) {
			const sessionId = decodeURIComponent(sourceMatch[1]);
			const fileId = decodeURIComponent(sourceMatch[2]);
			const sessionData = sessions.get(sessionId);

			if (!sessionData) {
				sendJson(res, 404, { ok: false, error: "Session not found", sessionId });
				return;
			}

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
			return;
		}

		const saveMatch = url.pathname.match(/^\/sessions\/([^/]+)\/files\/([^/]+)\/save$/);
		if (req.method === "POST" && saveMatch) {
			const sessionId = decodeURIComponent(saveMatch[1]);
			const fileId = decodeURIComponent(saveMatch[2]);
			const sessionData = sessions.get(sessionId);

			if (!sessionData) {
				sendJson(res, 404, { ok: false, error: "Session not found", sessionId });
				return;
			}

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

			const incomingBaseHash = typeof body.baseSourceHash === "string" ? body.baseSourceHash : null;
			const currentSource = typeof file.source === "string" ? file.source : "";
			const currentSourceHash = file.sourceHash || hashString(currentSource);

			if (incomingBaseHash && incomingBaseHash !== currentSourceHash) {
				sendJson(res, 409, { ok: false, error: "Conflict detected. File changed after it was loaded.", fileId, currentSourceHash, clientBaseHash: incomingBaseHash });
				return;
			}

			file.source = body.source;
			file.sourceLength = body.source.length;
			file.sourceHash = hashString(body.source);
			file.updatedAt = Date.now();

			const change = pushChange(sessionData, {
				type: "updateSource",
				fileId: file.fileId,
				itemId: file.itemId || file.fileId,
				root: file.root,
				relativePath: file.relativePath,
				source: file.source,
				sourceHash: file.sourceHash,
			});

			console.log("[Forge API] Source saved:", file.root + "/" + file.relativePath, "Revision:", change.revision);
			sendJson(res, 200, { ok: true, sessionId, fileId, revision: change.revision, sourceLength: file.sourceLength, sourceHash: file.sourceHash });
			return;
		}

		const moveMatch = url.pathname.match(/^\/sessions\/([^/]+)\/files\/([^/]+)\/move$/);
		if (req.method === "POST" && moveMatch) {
			const sessionId = decodeURIComponent(moveMatch[1]);
			const fileId = decodeURIComponent(moveMatch[2]);
			const sessionData = sessions.get(sessionId);

			if (!sessionData) {
				sendJson(res, 404, { ok: false, error: "Session not found", sessionId });
				return;
			}

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

				const targetParentItem = parentItemId ? findItem(sessionData, parentItemId) : null;
				let cursor = targetParentItem;

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

			console.log("[Forge API] Item moved:", oldRoot + "/" + oldPath, "=>", targetRoot + "/" + newRelativePath, "Revision:", change.revision);
			sendJson(res, 200, { ok: true, sessionId, item: getPublicFiles([item])[0], moved: getPublicFiles(moved), revision: change.revision });
			return;
		}

		const deleteMatch = url.pathname.match(/^\/sessions\/([^/]+)\/files\/([^/]+)\/delete$/);
		if (req.method === "POST" && deleteMatch) {
			const sessionId = decodeURIComponent(deleteMatch[1]);
			const fileId = decodeURIComponent(deleteMatch[2]);
			const sessionData = sessions.get(sessionId);

			if (!sessionData) {
				sendJson(res, 404, { ok: false, error: "Session not found", sessionId });
				return;
			}

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

			console.log("[Forge API] Item deleted:", item.root + "/" + item.relativePath, "Revision:", change.revision);
			sendJson(res, 200, { ok: true, sessionId, removed: getPublicFiles(removed), revision: change.revision });
			return;
		}

		const changesMatch = url.pathname.match(/^\/sessions\/([^/]+)\/changes$/);
		if (req.method === "GET" && changesMatch) {
			const sessionId = decodeURIComponent(changesMatch[1]);
			const sessionData = sessions.get(sessionId);

			if (!sessionData) {
				sendJson(res, 404, { ok: false, error: "Session not found", sessionId });
				return;
			}

			const after = Number(url.searchParams.get("after") || "0");

			if (!Number.isFinite(after) || after < 0) {
				sendJson(res, 400, { ok: false, error: "Invalid after revision." });
				return;
			}

			const changes = Array.isArray(sessionData.changes) ? sessionData.changes.filter(change => change.revision > after) : [];
			const lastRevision = Array.isArray(sessionData.changes) && sessionData.changes.length > 0 ? sessionData.changes[sessionData.changes.length - 1].revision : 0;
			sendJson(res, 200, { ok: true, sessionId, after, lastRevision, changesCount: changes.length, changes });
			return;
		}

		sendJson(res, 404, { ok: false, error: "Route not found", method: req.method, url: req.url });
	} catch (error) {
		sendJson(res, 500, { ok: false, error: error.message || "Internal server error" });
	}
});

server.listen(PORT, "0.0.0.0", () => {
	console.log("[Forge API] Running on port " + PORT);
});
