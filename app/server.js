const http = require("http");

const PORT = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("W3L3 Advanced GitHub Actions CI/CD Demo\n");
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
