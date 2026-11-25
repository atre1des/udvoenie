import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';

const args = process.argv.slice(2);
const port = Number(args.includes('--port') ? args[args.indexOf('--port') + 1] : process.env.PORT || 3000);
const host = args.includes('--host') ? args[args.indexOf('--host') + 1] : '127.0.0.1';

const files = {
  '/': ['index.html', 'text/html'],
  '/index.html': ['index.html', 'text/html'],
  '/style.css': ['style.css', 'text/css'],
  '/app.js': ['app.js', 'text/javascript'],
  '/manifest.webmanifest': ['manifest.webmanifest', 'application/manifest+json'],
  '/sw.js': ['sw.js', 'text/javascript'],
  '/icon.png': ['icon.png', 'image/png'],
  '/icon-192.png': ['icon-192.png', 'image/png'],
};

createServer(async (request, response) => {
  const path = new URL(request.url, 'http://localhost').pathname;
  const file = Object.hasOwn(files, path) && files[path];
  if (!file) {
    response.writeHead(404).end();
    return;
  }
  try {
    const body = await readFile(new URL('./public/' + file[0], import.meta.url));
    const contentType = file[1] === 'image/png' ? file[1] : file[1] + '; charset=utf-8';
    response.writeHead(200, { 'Content-Type': contentType, 'X-Content-Type-Options': 'nosniff' }).end(body);
  } catch {
    response.writeHead(500).end();
  }
}).listen(port, host, () => {
  console.log('Удвоение: http://' + host + ':' + port);
});
