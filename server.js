const http = require('http');
const fs = require('fs');
const path = require('path');

const hostname = '127.0.0.1';
const port = 3000;

const mimeTypes = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif'
};

http.createServer((req, res) => {
    console.log(`Request for ${req.url} received.`);
    let filePath = '.' + req.url;
    if (filePath === './') {
        filePath = './index.html';
    }

    const extname = String(path.extname(filePath)).toLowerCase();
    const contentType = mimeTypes[extname] || 'application/octet-stream';

    fs.readFile(filePath, (error, content) => {
        if (error) {
            if (error.code === 'ENOENT') {
                res.writeHead(404, { 'Content-Type': 'text/html' });
                res.end('404: File Not Found', 'utf-8');
            } else {
                res.writeHead(500);
                res.end(`Sorry, there was an error: ${error.code} ..\n`);
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
}).listen(port, hostname, () => {
    console.log(`Server running at http://${hostname}:${port}/`);
});
