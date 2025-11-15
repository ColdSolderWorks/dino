const http = require('http');
const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, 'public');

const server = http.createServer((req, res) => {
  const urlPath = req.url === '/' ? '/index.html' : req.url.split('?')[0];
  const filePath = path.join(publicDir, urlPath);
  if (!filePath.startsWith(publicDir)) {
    res.statusCode = 404;
    return res.end('Not found');
  }
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.statusCode = 404;
      return res.end('Not found');
    }
    const ext = path.extname(filePath);
    const contentType = {
      '.html': 'text/html; charset=utf-8',
      '.css': 'text/css',
      '.js': 'application/javascript'
    }[ext] || 'text/plain';
    res.setHeader('Content-Type', contentType);
    res.end(data);
  });
});

const port = process.env.FRONTEND_PORT || 3000;
server.listen(port, () => {
  console.log(`Ustabul61 frontend listening on http://localhost:${port}`);
});
