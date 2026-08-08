/**
 * Generate Life_OS app icons as SVGs.
 * Modern PWA manifests support SVG icons with "sizes": "any".
 */
import { writeFileSync } from "fs";
import { join } from "path";

const PUBLIC_DIR = "/home/z/my-project/public";

function createIconSvg(size, bgColor, letter) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${size * 0.22}" fill="rgb(${bgColor[0]}, ${bgColor[1]}, ${bgColor[2]})"/>
  <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="${size * 0.55}" font-weight="bold" fill="#242320" text-anchor="middle" dominant-baseline="central">${letter}</text>
</svg>`;
}

const bg = [146, 117, 31]; // warm gold #92751f

writeFileSync(join(PUBLIC_DIR, "icons", "icon-512.svg"), createIconSvg(512, bg, "L"));
writeFileSync(join(PUBLIC_DIR, "icons", "icon-192.svg"), createIconSvg(192, bg, "L"));
writeFileSync(join(PUBLIC_DIR, "icons", "apple-touch-icon.svg"), createIconSvg(180, bg, "L"));
writeFileSync(join(PUBLIC_DIR, "icons", "favicon.svg"), createIconSvg(64, bg, "L"));

console.log("[ok] SVG icons generated");
