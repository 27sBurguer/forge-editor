const http = require("http");
const { handleRequest } = require("./src/server/router");

const PORT = process.env.PORT || 3000;

const server = http.createServer(handleRequest);

server.listen(PORT, "0.0.0.0", () => {
	console.log("[Forge API] Running on port " + PORT);
	console.log("[Forge UI] http://localhost:" + PORT);
});
