console.log("Hello world from Node.js!");

// Load Node's built-in HTTP module
const http = require("http");

// Read version and port from environment variables.
// If none are set, use defaults.
const VERSION = process.env.VERSION || "v1";
const PORT = process.env.PORT || 3000;

// Create a web server
const server = http.createServer((req, res) => {
  // Always respond with plain text
  res.setHeader("Content-Type", "text/plain");

  // Health check endpoint
  if (req.url === "/healthz") {
    res.statusCode = 200;
    res.end("OK");
    return;
  }

  // Version endpoint
  if (req.url === "/version") {
    res.statusCode = 200;
    res.end(VERSION);
    return;
  }

  // Default response
  res.statusCode = 200;
  res.end(`Hello world node.js!  Version: ${VERSION}`);
});

// Start the server and log a message
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT} (version: ${VERSION})`);
});
