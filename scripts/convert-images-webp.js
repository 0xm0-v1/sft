#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

/**
 * Convert images in a directory (recursively) to WebP, preserving subfolders.
 *
 * Usage:
 *   npm run convert:webp -- --dir=static/assets/Spells/SET16
 *   npm run convert:webp -- --dir=static/assets/Icons --out=static/assets/WebP/Icons
 *   npm run convert:webp -- --dir=... --overwrite --quality=90
 */

const args = process.argv.slice(2);
const overwrite = args.includes('--overwrite');
const qualityArg = args.find((arg) => arg.startsWith('--quality='));
const quality = qualityArg ? Number.parseInt(qualityArg.split('=')[1], 10) : 90;
const dirArg = args.find((arg) => arg.startsWith('--dir='));
const outArg = args.find((arg) => arg.startsWith('--out='));

if (!dirArg) {
    console.error('Please provide a source directory with --dir=path/to/images');
    process.exit(1);
}

const targetDir = path.resolve(process.cwd(), dirArg.split('=')[1]);
const outRoot = outArg ? path.resolve(process.cwd(), outArg.split('=')[1]) : targetDir;

if (!Number.isFinite(quality) || quality <= 0 || quality > 100) {
    console.error('Invalid --quality value. Please provide an integer between 1 and 100.');
    process.exit(1);
}

const validExt = new Set(['.png', '.jpg', '.jpeg']);

function walkFiles(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    const files = [];
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            files.push(...walkFiles(fullPath));
        } else if (validExt.has(path.extname(entry.name).toLowerCase())) {
            files.push(fullPath);
        }
    }
    return files;
}

function ensureDir(p) {
    fs.mkdirSync(p, { recursive: true });
}

async function convertOne(srcPath, rootIn) {
    const ext = path.extname(srcPath);
    const rel = path.relative(rootIn, srcPath);
    const relNoExt = rel.slice(0, -ext.length);
    const destPath = path.join(outRoot, relNoExt + '.webp');

    if (!overwrite && fs.existsSync(destPath)) {
        console.log(`Skipping (exists): ${destPath}`);
        return;
    }

    ensureDir(path.dirname(destPath));

    await sharp(srcPath)
        .webp({ quality })
        .toFile(destPath);

    console.log(`Converted: ${path.relative(process.cwd(), destPath)}`);
}

async function main() {
    if (!fs.existsSync(targetDir)) {
        console.error(`Directory not found: ${targetDir}`);
        process.exit(1);
    }

    const files = walkFiles(targetDir);
    if (!files.length) {
        console.log('No images found to convert.');
        return;
    }

    console.log(`Converting ${files.length} images from ${targetDir} to ${outRoot} (quality=${quality})...`);

    for (const file of files) {
        try {
            await convertOne(file, targetDir);
        } catch (err) {
            console.error(`Failed: ${file}`);
            console.error(err);
        }
    }

    console.log('Done.');
}

main();
