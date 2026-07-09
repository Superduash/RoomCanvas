import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const inputPath = path.resolve(__dirname, '../Logo Reference.png');
const outputDir = path.resolve(__dirname, 'public/icons');

// Create output directory if it doesn't exist
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const sizes = [16, 32, 48, 64, 72, 96, 128, 144, 152, 180, 192, 256, 384, 512];

async function generate() {
  console.log('Generating icons from Logo Reference.png...');
  
  // Standard sizes
  for (const size of sizes) {
    await sharp(inputPath)
      .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .toFile(path.join(outputDir, `icon-${size}x${size}.png`));
    console.log(`Generated icon-${size}x${size}.png`);
  }

  // Maskable icon (usually needs some padding)
  await sharp(inputPath)
    .resize(512, 512, { fit: 'contain', background: '#B76E4D' }) // using the brand accent color as background for maskable
    .toFile(path.join(outputDir, `icon-maskable-512x512.png`));
  console.log('Generated maskable icon');

  // Monochrome (just a simple threshold trace or greyscale)
  await sharp(inputPath)
    .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .threshold(128) // Make it monochrome solid
    .toFile(path.join(outputDir, `icon-monochrome-512x512.png`));
  console.log('Generated monochrome icon');

  // Apple Touch Icon
  await sharp(inputPath)
    .resize(180, 180, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .toFile(path.join(outputDir, `apple-touch-icon.png`));
  console.log('Generated apple touch icon');

  // Favicon ICO (just using 32x32 png renamed to ico for modern simplicity, or combine them if needed, but sharp can't output .ico directly)
  // Actually, standard practice now is to use PNG favicons, but we can copy the 32x32 one to favicon.ico
  fs.copyFileSync(
    path.join(outputDir, `icon-32x32.png`),
    path.resolve(__dirname, 'public/favicon.ico')
  );
  
  // Create a manifest.json
  const manifest = {
    name: "RoomCanvas",
    short_name: "RoomCanvas",
    description: "AI-powered interior design assistant.",
    start_url: "/",
    display: "standalone",
    background_color: "#FAF7F2",
    theme_color: "#FAF8F5",
    icons: sizes.map(s => ({
      src: `/icons/icon-${s}x${s}.png`,
      sizes: `${s}x${s}`,
      type: "image/png"
    })).concat([
      {
        src: "/icons/icon-maskable-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable"
      },
      {
        src: "/icons/icon-monochrome-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "monochrome"
      }
    ])
  };

  fs.writeFileSync(
    path.resolve(__dirname, 'public/manifest.json'),
    JSON.stringify(manifest, null, 2)
  );
  console.log('Generated manifest.json');
}

generate().catch(console.error);
