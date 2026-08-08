/**
 * Scans the public/assets directory for audio files and GIFs,
 * generates a manifest JSON that the app reads at runtime.
 *
 * Run this after adding/removing assets:
 *   node scripts/scan-assets.js
 */
import { readdirSync, statSync, existsSync, writeFileSync } from "fs";
import { join } from "path";

const PUBLIC_DIR = "/home/z/my-project/public";
const ASSETS_DIR = join(PUBLIC_DIR, "assets");

function scanDir(dir, extensions) {
  if (!existsSync(dir)) return [];
  const results = [];
  function walk(d) {
    for (const entry of readdirSync(d)) {
      const fullPath = join(d, entry);
      const stat = statSync(fullPath);
      if (stat.isDirectory()) {
        walk(fullPath);
      } else {
        const ext = entry.split(".").pop()?.toLowerCase();
        if (extensions.includes(ext)) {
          const relPath = "/" + fullPath.replace(PUBLIC_DIR, "").replace(/\\/g, "/");
          results.push({
            path: relPath,
            name: entry,
            size: stat.size,
          });
        }
      }
    }
  }
  walk(dir);
  return results;
}

const manifest = {
  generatedAt: new Date().toISOString(),
  exercises: {
    gifs: scanDir(join(ASSETS_DIR, "exercises", "gifs"), ["gif", "webp", "png"]),
    thumbnails: scanDir(join(ASSETS_DIR, "exercises", "thumbnails"), ["png", "jpg", "webp"]),
  },
  audio: {
    coaches: scanDir(join(ASSETS_DIR, "audio", "coaches"), ["mp3", "wav", "ogg"]),
    music: {
      exercise: scanDir(join(ASSETS_DIR, "audio", "music", "exercise"), ["mp3", "wav", "ogg"]),
      meditation: scanDir(join(ASSETS_DIR, "audio", "music", "meditation"), ["mp3", "wav", "ogg"]),
      focus: scanDir(join(ASSETS_DIR, "audio", "music", "focus"), ["mp3", "wav", "ogg"]),
    },
    sfx: scanDir(join(ASSETS_DIR, "audio", "sfx"), ["mp3", "wav", "ogg"]),
    counselor: scanDir(join(ASSETS_DIR, "audio", "counselor"), ["mp3", "wav", "ogg"]),
  },
  totals: {
    gifs: 0,
    audio: 0,
  },
};

manifest.totals.gifs = manifest.exercises.gifs.length;
manifest.totals.audio =
  manifest.audio.coaches.length +
  manifest.audio.music.exercise.length +
  manifest.audio.music.meditation.length +
  manifest.audio.music.focus.length +
  manifest.audio.sfx.length +
  manifest.audio.counselor.length;

const manifestPath = join(PUBLIC_DIR, "assets", "manifest.json");
writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

console.log("[ok] Asset manifest generated:");
console.log(`  GIFs: ${manifest.totals.gifs}`);
console.log(`  Audio files: ${manifest.totals.audio}`);
console.log(`  Saved to: /assets/manifest.json`);
