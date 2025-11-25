import postcss from 'postcss';
import tailwindcss from '@tailwindcss/postcss';
import autoprefixer from 'autoprefixer';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

async function buildCSS() {
  const inputPath = join(process.cwd(), 'client/globals.css');
  const outputPath = join(process.cwd(), 'dist/globals.css');

  // Ensure dist directory exists
  mkdirSync(join(process.cwd(), 'dist'), { recursive: true });

  // Read CSS file
  const css = readFileSync(inputPath, 'utf-8');

  // Process with PostCSS
  const result = await postcss([
    tailwindcss(),
    autoprefixer,
  ]).process(css, {
    from: inputPath,
    to: outputPath,
  });

  // Write output
  writeFileSync(outputPath, result.css, 'utf-8');

  console.log('✅ CSS built successfully');
}

buildCSS().catch((error) => {
  console.error('❌ CSS build failed:', error);
  process.exit(1);
});
