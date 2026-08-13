// Dependency-free local server for the Next.js static export in ./out.
// This is more reliable than `next start`, which does not support output: export.
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { exec } from 'node:child_process';
import { dirname, extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const appDir = dirname(fileURLToPath(import.meta.url));
const root = resolve(appDir, 'out');
const preferredPort = Number(process.env.PORT || 3000);

const mime = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.woff2': 'font/woff2',
};

function safeResolve(relativePath) {
  const file = resolve(root, normalize(relativePath));
  return file.startsWith(root) ? file : null;
}

function existingFile(file) {
  return file && existsSync(file) && statSync(file).isFile() ? file : null;
}

function getFile(urlPath) {
  const path = decodeURIComponent((urlPath || '/').split('?')[0]);
  const relative = path === '/' ? 'index.html' : path.replace(/^\/+/, '');
  const base = safeResolve(relative);
  if (!base) return null;

  // Exact file first.
  const exact = existingFile(base);
  if (exact) return exact;

  // Next static export commonly produces /focus as out/focus.html.
  if (!extname(base)) {
    const html = existingFile(`${base}.html`);
    if (html) return html;
  }

  // Directory index fallback for assets/pages exported with trailing slash.
  if (existsSync(base) && statSync(base).isDirectory()) {
    const index = existingFile(join(base, 'index.html'));
    if (index) return index;
  }

  return null;
}

function makeServer() {
  return createServer((req, res) => {
    const file = getFile(req.url || '/');
    if (!file) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not found');
      return;
    }

    res.writeHead(200, {
      'Content-Type': mime[extname(file)] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
    });
    createReadStream(file).pipe(res);
  });
}

function listen(port, attemptsLeft = 10) {
  const server = makeServer();

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE' && attemptsLeft > 0) {
      listen(port + 1, attemptsLeft - 1);
      return;
    }
    console.error(error);
    process.exit(1);
  });

  server.listen(port, '127.0.0.1', () => {
    const url = `http://localhost:${port}`;
    console.log(`Pindo 已启动：${url}`);
    console.log(`静态目录：${root}`);
    console.log('关闭此窗口即可停止服务。');
    if (process.argv.includes('--open')) {
      exec(`start "" "${url}"`, { shell: 'cmd.exe' });
    }
  });
}

if (!existsSync(join(root, 'index.html'))) {
  console.error(`未找到 ${join(root, 'index.html')}`);
  console.error('请先运行 npm run build，或使用启动脚本自动构建。');
  process.exit(1);
}

listen(preferredPort);
