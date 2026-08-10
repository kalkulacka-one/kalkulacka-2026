import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Static server for the partner embed preview — deliberately dependency-free
 * so `pnpm embeds` works in any checkout with nothing installed. Serves only
 * files that live next to this script.
 */
const root = fileURLToPath(new URL('.', import.meta.url));
// Fixed rather than env-driven: `.claude/launch.json` and the docs both name
// this port, and nothing else needs to move it.
const port = 8788;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
};

const server = createServer(async (request, response) => {
  const url = new URL(request.url ?? '/', 'http://localhost');
  const requested = url.pathname === '/' ? '/index.html' : url.pathname;

  // Resolve inside the tool's own directory or not at all.
  const path = normalize(join(root, requested));
  if (!path.startsWith(root)) {
    response.writeHead(403).end();
    return;
  }

  try {
    const body = await readFile(path);
    response.writeHead(200, {
      'Content-Type': TYPES[extname(path)] ?? 'application/octet-stream',
      'Cache-Control': 'no-store',
    });
    response.end(body);
  } catch {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Not found');
  }
});

server.listen(port, () => {
  console.log(`Embed preview running at http://localhost:${port}`);
  console.log('The live embeds come from the web dev server — run it alongside (pnpm dev).');
});
