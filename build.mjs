// Build script: bundles src/ with esbuild into dist/ (static site + PWA) and dist/single.html (one-file build).
// Usage: npm run build   |   npm run dev (watch + local server on http://localhost:5173)
import * as esbuild from 'esbuild';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';

const watch = process.argv.includes('--watch');
const out = 'dist';
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

const opts = {
  entryPoints: { app: 'src/main.jsx' },
  bundle: true,
  minify: !watch,
  sourcemap: watch,
  format: 'iife',
  target: ['es2020', 'chrome90', 'safari15'],
  outdir: out,
  loader: { '.js': 'jsx' },
  define: { 'process.env.NODE_ENV': watch ? '"development"' : '"production"' },
  jsx: 'automatic',
  logLevel: 'info',
};

function copyStatic() {
  fs.cpSync('public', out, { recursive: true });
  const css = ['styles.css', 'site.css'].map((f) => fs.readFileSync('src/' + f, 'utf8')).join('\n');
  fs.writeFileSync(path.join(out, 'app.css'), css);
  const html = fs.readFileSync('index.html', 'utf8');
  fs.writeFileSync(path.join(out, 'index.html'), html);
  if (fs.existsSync(path.join(out, 'app.js'))) {
    const js = fs.readFileSync(path.join(out, 'app.js'), 'utf8').replace(/<\/script/gi, '<\\/script');
    const single = html
      .replace('<link rel="stylesheet" href="app.css">', `<style>${css}</style>`)
      .replace('<script src="app.js" defer></script>', () => `<script>${js}</script>`)
      .replace(/<link rel="manifest"[^>]*>/, '');
    fs.writeFileSync(path.join(out, 'single.html'), single);
  }
}

if (watch) {
  const ctx = await esbuild.context(opts);
  await ctx.watch();
  copyStatic();
  fs.watch('src', { recursive: true }, () => copyStatic());
  const server = http.createServer((req, res) => {
    let p = path.join(out, req.url.split('?')[0]);
    if (p.endsWith(path.sep) || !fs.existsSync(p)) p = path.join(out, 'index.html');
    const types = { '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
    res.setHeader('Content-Type', types[path.extname(p)] || 'application/octet-stream');
    fs.createReadStream(p).pipe(res);
  });
  server.listen(5173, () => console.log('FINORA dev server: http://localhost:5173'));
} else {
  await esbuild.build(opts);
  copyStatic();
  console.log('Built to dist/. Host the dist folder anywhere static.');
}
