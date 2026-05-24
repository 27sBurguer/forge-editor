const http = require("http");
const { handleRequest } = require("./src/server/router");

const DEFAULT_PORT = Number(process.env.PORT || 3000);

function startServer(options = {}) {
	const port = Number(options.port || DEFAULT_PORT);
	const host = options.host || "0.0.0.0";
	const server = http.createServer(handleRequest);

	return new Promise((resolve, reject) => {
		let settled = false;

		server.once("error", error => {
			if (settled) return;
			settled = true;
			reject(error);
		});

		server.listen(port, host, () => {
			if (settled) return;
			settled = true;
			const address = server.address();
			resolve({ server, port: address && address.port ? address.port : port, host });
		});
	});
}

if (require.main === module) {
	startServer({ port: DEFAULT_PORT, host: "0.0.0.0" })
		.then(({ port }) => {
			console.log("[Cloud API] Running on port " + port);
			console.log("[Cloud UI] http://localhost:" + port);
		})
		.catch(error => {
			console.error("[Cloud API] Failed to start:", error.message || error);
			process.exitCode = 1;
		});
}

module.exports = { startServer };
