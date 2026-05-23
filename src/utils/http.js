const fs = require("fs");
const path = require("path");
const { MAX_BODY_SIZE, PUBLIC_DIR } = require("../constants");

const MIME_TYPES = {
	".html": "text/html; charset=utf-8",
	".css": "text/css; charset=utf-8",
	".js": "application/javascript; charset=utf-8",
	".json": "application/json; charset=utf-8",
	".png": "image/png",
	".jpg": "image/jpeg",
	".jpeg": "image/jpeg",
	".svg": "image/svg+xml; charset=utf-8",
	".ico": "image/x-icon",
};

function writeCorsHeaders(res, statusCode = 200, extraHeaders = {}) {
	res.writeHead(statusCode, {
		"Access-Control-Allow-Origin": "*",
		"Access-Control-Allow-Methods": "GET, POST, OPTIONS",
		"Access-Control-Allow-Headers": "Content-Type, X-Forge-Session, X-Forge-Secret, X-StudioBridge-Session, X-StudioBridge-Secret",
		...extraHeaders,
	});
}

function sendOptions(res) {
	writeCorsHeaders(res, 204);
	res.end();
}

function sendJson(res, statusCode, data) {
	const body = JSON.stringify(data);

	writeCorsHeaders(res, statusCode, {
		"Content-Type": "application/json; charset=utf-8",
		"Cache-Control": "no-store",
	});

	res.end(body);
}

function sendStaticFile(res, requestPath) {
	const publicDir = path.resolve(PUBLIC_DIR);
	const cleanRequestPath = requestPath === "/" ? "/index.html" : requestPath;
	let decodedPath = "/index.html";

	try {
		decodedPath = decodeURIComponent(cleanRequestPath);
	} catch (error) {
		res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
		res.end("Invalid URL");
		return;
	}

	const filePath = path.resolve(publicDir, decodedPath.replace(/^\/+/, ""));

	if (filePath !== publicDir && !filePath.startsWith(publicDir + path.sep)) {
		res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
		res.end("Forbidden");
		return;
	}

	fs.readFile(filePath, (error, data) => {
		if (error) {
			res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
			res.end("Not found");
			return;
		}

		const type = MIME_TYPES[path.extname(filePath).toLowerCase()] || "application/octet-stream";
		res.writeHead(200, {
			"Content-Type": type,
			"Cache-Control": "no-store",
		});
		res.end(data);
	});
}

function readBody(req) {
	return new Promise((resolve, reject) => {
		let body = "";
		let tooLarge = false;

		req.on("data", chunk => {
			body += chunk;

			if (body.length > MAX_BODY_SIZE) {
				tooLarge = true;
				req.destroy();
				reject(new Error("Request body too large"));
			}
		});

		req.on("end", () => {
			if (tooLarge) {
				return;
			}

			if (!body) {
				resolve(null);
				return;
			}

			try {
				resolve(JSON.parse(body));
			} catch (error) {
				reject(new Error("Invalid JSON body"));
			}
		});

		req.on("error", reject);
	});
}

function getSessionHeaders(req) {
	return {
		sessionId: String(req.headers["x-forge-session"] || req.headers["x-studiobridge-session"] || "").trim(),
		secret: String(req.headers["x-forge-secret"] || req.headers["x-studiobridge-secret"] || "").trim(),
	};
}

module.exports = {
	sendOptions,
	sendJson,
	sendStaticFile,
	readBody,
	getSessionHeaders,
};
