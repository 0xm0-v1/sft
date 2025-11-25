#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const { build } = require('esbuild');

const envName = (process.env.NODE_ENV || process.env.APP_ENV || process.env.GO_ENV || '').toLowerCase();
const isProd = envName === 'production' || envName === 'prod' || process.argv.includes('--prod');
const outdir = 'static/dist';
const manifestPath = path.join(outdir, 'manifest.json');

const loaders = {
  '.woff2': 'file',
  '.png': 'file',
  '.svg': 'file',
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

async function run() {
  try {
    ensureDistDir();
    cleanOldBundles();

    const [jsResult, cssResult] = await Promise.all([
      build({
        entryPoints: { app: 'static/js/app.js' },
        outdir,
        bundle: true,
        format: 'esm',
        sourcemap: !isProd,
        minify: isProd,
        target: ['es2018'],
        legalComments: 'none',
        entryNames: 'app-[hash]',
        chunkNames: 'chunk-[hash]',
        assetNames: 'assets/[name]-[hash]',
        loader: loaders,
        logLevel: 'info',
        metafile: true,
      }),
      build({
        entryPoints: { app: 'static/css/main.css' },
        outdir,
        bundle: true,
        sourcemap: !isProd,
        minify: isProd,
        legalComments: 'none',
        entryNames: 'app-[hash]',
        chunkNames: 'chunk-[hash]',
        assetNames: 'assets/[name]-[hash]',
        loader: loaders,
        logLevel: 'info',
        metafile: true,
      }),
    ]);

    const manifest = {};
    const jsOut = extractEntryOutput(jsResult.metafile, 'static/js/app.js');
    const cssOut = extractEntryOutput(cssResult.metafile, 'static/css/main.css');

    if (jsOut) {
      const rel = posixPath(jsOut).replace(/^static/, '');
      manifest['app.js'] = rel.startsWith('/') ? rel : `/${rel}`;
    }
    if (cssOut) {
      const rel = posixPath(cssOut).replace(/^static/, '');
      manifest['app.css'] = rel.startsWith('/') ? rel : `/${rel}`;
    }

    if (Object.keys(manifest).length) {
      writeManifest(manifest);
      console.log('Manifest written:', manifest);
    } else {
      console.warn('No manifest entries generated.');
    }

    console.log(`Assets built (${isProd ? 'prod' : 'dev'} mode).`);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
