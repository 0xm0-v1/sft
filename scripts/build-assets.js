#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const { build, context } = require('esbuild');

const envName = (process.env.NODE_ENV || process.env.APP_ENV || process.env.GO_ENV || '').toLowerCase();
const isProd = envName === 'production' || envName === 'prod' || process.argv.includes('--prod');
const isWatch = process.argv.includes('--watch');
const outdir = 'static/dist';
const manifestPath = path.join(outdir, 'manifest.json');

const loaders = {
  '.woff2': 'file',
  '.png': 'file',
  '.svg': 'file',
  '.webp': 'file',
};

function posixPath(p) {
  return p.replace(/\\/g, '/');
}

function ensureDistDir() {
  fs.mkdirSync(outdir, { recursive: true });
}

function cleanOldBundles() {
  if (!fs.existsSync(outdir)) return;
  for (const file of fs.readdirSync(outdir)) {
    if (/^app-.*\.(js|css|js\.map|css\.map)$/i.test(file) || file === 'manifest.json') {
      fs.rmSync(path.join(outdir, file));
    }
  }
  const assetsDir = path.join(outdir, 'assets');
  if (fs.existsSync(assetsDir)) {
    for (const file of fs.readdirSync(assetsDir)) {
      if (/^[A-Za-z0-9_-]+-[A-Za-z0-9]+/.test(file)) {
        fs.rmSync(path.join(assetsDir, file));
      }
    }
  }
}

function extractEntryOutput(meta, entryPoint) {
  if (!meta || !meta.outputs) return null;
  for (const [outPath, info] of Object.entries(meta.outputs)) {
    if (info.entryPoint === entryPoint && !outPath.endsWith('.map')) {
      return posixPath(outPath);
    }
  }
  return null;
}

function writeManifest(paths) {
  const json = JSON.stringify(paths, null, isProd ? 0 : 2);
  fs.writeFileSync(manifestPath, json, 'utf8');
}

const buildOptions = {
  entryPoints: { app: 'static/js/app.js' },
  outdir,
  bundle: true,
  format: 'esm',
  sourcemap: !isProd,
  minify: isProd,
  target: ['es2018'],
  legalComments: 'none',
  entryNames: isProd ? 'app-[hash]' : 'app',
  chunkNames: isProd ? 'chunk-[hash]' : 'chunk-[name]',
  assetNames: 'assets/[name]-[hash]',
  loader: loaders,
  logLevel: 'info',
  metafile: true,
};

async function buildOnce() {
  try {
    ensureDistDir();
    if (isProd) {
      cleanOldBundles();
    }

    const result = await build(buildOptions);

    const manifest = {};
    const jsOut = extractEntryOutput(result.metafile, 'static/js/app.js');

    if (jsOut) {
      const rel = posixPath(jsOut).replace(/^static/, '');
      manifest['app.js'] = rel.startsWith('/') ? rel : `/${rel}`;
    }

    // CSS is built separately by Tailwind CLI
    manifest['app.css'] = '/dist/app.css';

    if (Object.keys(manifest).length) {
      writeManifest(manifest);
      console.log('Manifest written:', manifest);
    } else {
      console.warn('No manifest entries generated.');
    }

    console.log(`JS built (${isProd ? 'prod' : 'dev'} mode).`);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

async function watchMode() {
  try {
    ensureDistDir();

    const ctx = await context({
      ...buildOptions,
      plugins: [
        {
          name: 'rebuild-notify',
          setup(build) {
            build.onEnd((result) => {
              if (result.errors.length > 0) {
                console.error('Build failed');
              } else {
                const manifest = {
                  'app.js': '/dist/app.js',
                  'app.css': '/dist/app.css',
                };
                writeManifest(manifest);
                console.log(`[${new Date().toLocaleTimeString()}] JS rebuilt`);
              }
            });
          },
        },
      ],
    });

    await ctx.watch();
    console.log('Watching for JS changes...');

    // Initial manifest
    const manifest = {
      'app.js': '/dist/app.js',
      'app.css': '/dist/app.css',
    };
    writeManifest(manifest);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

if (isWatch) {
  watchMode();
} else {
  buildOnce();
}
