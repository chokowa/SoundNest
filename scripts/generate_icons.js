import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const svgPath = path.resolve('public/icon.svg');

const icons = [
    { name: 'icon-192.png', size: 192 },
    { name: 'icon-512.png', size: 512 },
    { name: 'apple-touch-icon.png', size: 180 }
];

async function generateIcons() {
    try {
        console.log('Reading SVG icon...');
        const svgBuffer = fs.readFileSync(svgPath);

        for (const icon of icons) {
            const outPath = path.resolve('public', icon.name);
            await sharp(svgBuffer)
                .resize(icon.size, icon.size)
                .png()
                .toFile(outPath);
            console.log(`Generated: ${icon.name} (${icon.size}x${icon.size})`);
        }
        console.log('All icons generated successfully.');
    } catch (err) {
        console.error('Error generating icons:', err);
    }
}

generateIcons();
