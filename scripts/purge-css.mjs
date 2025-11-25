import { PurgeCSS } from 'purgecss';
import fs from 'fs';

const cssFiles = [
  'static/css/base/variables.css',
  'static/css/base/scrollbar.css',
  'static/css/base/fonts.css',
  'static/css/layout/container.css',
  'static/css/components/search-bar.css',
  'static/css/components/units-grid.css',
  'static/css/components/hex-grid.css',
  'static/css/components/tooltip.css',
  'static/css/main.css',
];

const contentGlobs = [
  'templates/**/*.gohtml',
  'static/js/**/*.js',
];

const safelist = {
  standard: [
    'outline',
    'container',
    'container-flex',
    'container-flex-center',
    'container-flex-end-column',
    'unit-unlock-badge',
    'coin',
    'trait-icon',
  ],
  deep: [
    /^ability-/,
    /^tft-/,
    /^ability-token/,
    /^ability-icon/,
    /^border-[0-9]+-cost$/,
    /^units-/,
    /^unit-/,
    /^hex-/,
    /^tooltip/,
    /^search-/,
    /^cost-filter/,
    /^keycaps$/,
    /^kbd$/,
  ],
};

async function run() {
  const results = await new PurgeCSS().purge({
    content: contentGlobs,
    css: cssFiles,
    safelist,
  });

  results.forEach((result) => {
    if (!result.file) return;
    fs.writeFileSync(result.file, result.css, 'utf8');
  });
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
