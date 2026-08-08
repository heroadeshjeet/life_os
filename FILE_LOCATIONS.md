# Life_OS v2 — Where to Put Your Files

## Exercise GIFs

### Main GIFs → `public/assets/exercises/gifs/`
Drop ALL GIFs from your `/Exercise/Gifs/` folder here. The filenames must match EXACTLY as listed in `public/assets/exercises/gifs/README.md`.

Examples: `Abdominal Crunches.gif`, `Jumping Jacks.gif`, `High Steeping.gif`, `Russian Twist.gif`, etc.

### Legs GIFs → `public/assets/exercises/legs/`
Drop ALL GIFs from your `/Exercise/Legs/` folder here. Filenames must match exactly as in `public/assets/exercises/legs/README.md`.

Examples: `Squat.gif`, `Side Lunge.gif`, `Wall Sit.gif`, `Donkey Kick Left.gif`, etc.

### Mewing GIFs → `public/assets/exercises/mewing/`
Drop ALL GIFs from your `/Exercise/Mewing/` folder here. Filenames must match exactly as in `public/assets/exercises/mewing/README.md`.

Examples: `Side-to-Side Turns.gif`, `Chin Tuck.gif`, `Neck Lift.gif`, `Lion.gif`, etc.

## Music Files

### Exercise Music → `public/assets/audio/music/exercise/`
Drop your exercise music MP3s here. The app looks for these filenames:
- `high-energy-1.mp3`
- `steady-push-1.mp3`
- `steady-push-2.mp3`
- `uplifting-1.mp3`
- `uplifting-2.mp3`
- `uplifting-3.mp3`

### Meditation Music → `public/assets/audio/music/meditation/`
- `calm-1.mp3`, `calm-2.mp3`, `nature-ocean.mp3`, `nature-rain.mp3`, `singing-bowls.mp3`

### Focus Music → `public/assets/audio/music/focus/`
- `binaural-deep-work.mp3`, `brain-waves-alpha.mp3`, `brain-waves-beta.mp3`, `brain-waves-theta.mp3`

### Sound Effects → `public/assets/audio/sfx/`
- `tap.mp3`, `success.mp3`, `error.mp3`, `unlock.mp3`, `lock.mp3`, `water-drop.mp3`, `streak-milestone.mp3`

## PDF Books (for Reader module)

### Books → `public/assets/books/`
Drop your PDF files here. When adding a book in the Reader module, enter just the filename (e.g., `my-book.pdf`).

## Important Notes
- **GIF filenames are case-sensitive** — match them exactly as shown in the README files
- **Spaces in filenames are fine** — the app handles them
- After adding files, run `node scripts/scan-assets.js` to update the manifest (optional — the app loads GIFs by direct path)
- The app gracefully falls back to a dumbbell icon if a GIF is missing
