/* Servidor local: sirve la app y expone la API de tareas. Solo escucha en 127.0.0.1 (esta PC). */
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { exec } = require('node:child_process');
const { listTasks, replaceTasks } = require('./db');

const PORT = Number(process.env.PORT) || 3000;
const ROOT = path.join(__dirname, '..');
const PUBLIC = new Set(['index.html', 'css', 'js']); // lo único que se sirve; server/ y data/ quedan afuera
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

const send = (res, status, body, type = 'application/json; charset=utf-8') => {
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  res.end(body);
};

function readBody(req, limit = 2 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) { reject(new Error('Cuerpo demasiado grande')); req.destroy(); }
      else chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

async function handleApi(req, res) {
  try {
    if (req.method === 'GET') return send(res, 200, JSON.stringify(listTasks()));
    if (req.method === 'PUT') {
      replaceTasks(JSON.parse(await readBody(req)));
      return send(res, 200, '{"ok":true}');
    }
    send(res, 405, '{"error":"Método no permitido"}');
  } catch (err) {
    console.error('Error en /api/tasks:', err.message);
    send(res, 400, JSON.stringify({ error: err.message }));
  }
}

function handleStatic(req, res, pathname) {
  const rel = pathname === '/' ? 'index.html' : decodeURIComponent(pathname).replace(/^\/+/, '');
  const file = path.normalize(path.join(ROOT, rel));
  const first = path.relative(ROOT, file).split(path.sep)[0];
  if (!file.startsWith(ROOT + path.sep) || !PUBLIC.has(first)) return send(res, 404, 'No encontrado', 'text/plain; charset=utf-8');
  fs.readFile(file, (err, data) => {
    if (err) return send(res, 404, 'No encontrado', 'text/plain; charset=utf-8');
    send(res, 200, data, MIME[path.extname(file)] || 'application/octet-stream');
  });
}

const server = http.createServer((req, res) => {
  const { pathname } = new URL(req.url, 'http://localhost');
  if (pathname === '/api/tasks') return handleApi(req, res);
  if (req.method !== 'GET') return send(res, 405, 'Método no permitido', 'text/plain; charset=utf-8');
  handleStatic(req, res, pathname);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') console.error(`\nEl puerto ${PORT} ya está en uso. Si la app ya está abierta, usá http://localhost:${PORT}\n`);
  else console.error(err);
  process.exit(1);
});

server.listen(PORT, '127.0.0.1', () => {
  const url = `http://localhost:${PORT}`;
  console.log(`\nTareas funcionando en ${url}`);
  console.log('Dejá esta ventana abierta mientras uses la app. Cerrala para detener el servidor.\n');
  if (process.argv.includes('--open')) {
    const cmd = process.platform === 'win32' ? `start "" "${url}"` : process.platform === 'darwin' ? `open "${url}"` : `xdg-open "${url}"`;
    exec(cmd);
  }
});
