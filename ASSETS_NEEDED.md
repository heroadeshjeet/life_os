# Life_OS v2 — Assets You Need to Provide

This document lists **every file you need to drop in** before Life_OS v2 launches, with exact paths, naming conventions, and format requirements. Drop files into the folders below; the app will auto-discover them by filename.

> **Short version:** Put exercise GIFs in `public/assets/exercises/gifs/`, coach voice MP3s in `public/assets/audio/coaches/<coach-name>/`, music in `public/assets/audio/music/<category>/`. Detailed specs below.

---

## 1. Exercise Animations (GIFs)

**Path:** `public/assets/exercises/gifs/`

**Format:** GIF, 480×480 to 720×720 px, 5–15 seconds, looping, under 2 MB each. WebP also accepted (smaller, same quality).

**Naming convention:** `{exercise-id}.gif` (kebab-case, lowercase). The app looks up animations by exercise ID, so the filename must match exactly.

### Required animations (36 exercises across 9 categories)

| Category | Exercise ID | Display Name |
|----------|-------------|--------------|
| Strength — Upper | `push-up` | Push-up |
| | `pull-up` | Pull-up |
| | `bench-dip` | Bench dip |
| | `pike-push-up` | Pike push-up |
| | `incline-row` | Incline row |
| Strength — Lower | `squat` | Squat |
| | `lunge` | Lunge |
| | `calf-raise` | Calf raise |
| | `glute-bridge` | Glute bridge |
| | `wall-sit` | Wall sit |
| Strength — Core | `plank` | Plank |
| | `crunch` | Crunch |
| | `russian-twist` | Russian twist |
| | `leg-raise` | Leg raise |
| | `six-pack-day` | Six-pack day |
| Strength — Full Body | `burpee` | Burpee |
| | `kettlebell-swing` | Kettlebell swing |
| | `thruster` | Thruster |
| | `man-maker` | Man-maker |
| Cardio | `running` | Running |
| | `cycling` | Cycling |
| | `rowing` | Rowing |
| | `jump-rope` | Jump rope |
| | `stairs` | Stairs |
| HIIT | `tabata` | Tabata |
| | `interval-30-30` | 30/30 intervals |
| | `emom` | EMOM |
| | `amrap` | AMRAP |
| | `circuit` | Circuit |
| Mobility | `hip-opener` | Hip opener |
| | `cat-cow` | Cat-cow |
| | `worlds-greatest-stretch` | World's greatest stretch |
| | `pigeon` | Pigeon |
| Yoga | `sun-salutation` | Sun salutation |
| | `vinyasa-flow` | Vinyasa flow |
| | `yin-sequence` | Yin sequence |
| | `restorative` | Restorative |
| Skill | `handstand-hold` | Handstand hold |
| | `planche-progression` | Planche progression |
| | `muscle-up-drill` | Muscle-up drill |
| | `l-sit` | L-sit |

> You mentioned you already have some of these GIFs. Drop them in with the exact filenames above. For any exercise you don't have an animation for, the app falls back to a Lucide icon + text instructions, so missing files won't break anything — they just won't show animation.

**Optional thumbnails:** `public/assets/exercises/thumbnails/{exercise-id}.png` — 200×200 px static preview shown in plan lists. If absent, the app uses the first frame of the GIF.

---

## 2. Exercise Coach Voices

**Path:** `public/assets/audio/coaches/<coach-id>/`

You asked whether you need multiple coach voices — **yes, please provide at least 2, ideally 4**. The user picks their preferred coach in Settings. Suggested coaches:

| Coach ID | Voice Character | Suggested Gender |
|----------|------------------|------------------|
| `coach-1-male-energy` | High-energy, motivating, drill-sergeant vibe | Male |
| `coach-2-female-warm` | Warm, encouraging, supportive | Female |
| `coach-3-male-calm` | Calm, steady, mindfulness-influenced | Male |
| `coach-4-female-strong` | Strong, direct, no-nonsense | Female |

> Add more coaches by creating more folders (`coach-5-<descriptor>/`). The app auto-discovers any folder starting with `coach-`.

### Audio cues each coach needs (MP3, 1–3 seconds each)

| Filename | When it plays | Script example |
|----------|---------------|----------------|
| `workout-start.mp3` | Session begins | "Let's get started. First exercise: push-ups. Three sets of twelve reps." |
| `exercise-intro.mp3` | Before each new exercise | "Next exercise: squats. Three sets of fifteen reps." |
| `set-start.mp3` | At the start of each set | "Set one. Begin!" |
| `rep-1.mp3` … `rep-20.mp3` | During rep-counting (optional, every 5th rep is fine) | "5" / "10" / "15" |
| `halfway.mp3` | Halfway through a set | "Halfway there. Keep going!" |
| `last-three.mp3` | Last 3 reps of a set | "Three, two, one..." |
| `set-complete.mp3` | After each set | "Set complete. Rest for sixty seconds." |
| `rest-end.mp3` | End of rest period | "Three, two, one, go!" |
| `exercise-complete.mp3` | After all sets of an exercise | "Exercise complete. Next up: lunges." |
| `workout-complete.mp3` | End of session | "Great workout! You crushed it today." |
| `encouragement-1.mp3` | Random during tough sets | "You got this!" |
| `encouragement-2.mp3` | Random | "Push through!" |
| `encouragement-3.mp3` | Random | "Almost there!" |
| `water-reminder.mp3` | Between exercises | "Grab a sip of water." |

**Format:** MP3, 128 kbps, mono, normalized to -3 dB peak. Keep each file under 100 KB.

> **Alternative:** If recording 14 cues × 4 coaches = 56 audio files is too much, we can use TTS (text-to-speech) to generate them dynamically. Quality is lower (no emotion) but it works. Tell me if you prefer this and I'll wire it up instead. Best experience = pre-recorded for coaches, TTS for Counselor (since Counselor responses are open-ended).

---

## 3. Counselor Voices

**Path:** `public/assets/audio/counselor/` (optional — see note below)

You asked for at least 2 Counselor voices (male + female), more appreciated. **Good news: the Counselor uses TTS (text-to-speech) to read its responses aloud**, so you don't need to pre-record audio files for it. The TTS engine has multiple voice IDs built in.

What you DO need to provide (optional, for higher quality):

| Filename | Purpose |
|----------|---------|
| `counselor-voice-1-greeting.mp3` | Optional welcome message on first open of Counselor |
| `counselor-voice-2-greeting.mp3` | Same, alternate voice |
| `counselor-voice-3-greeting.mp3` | Same, third voice |
| `counselor-voice-4-greeting.mp3` | Same, fourth voice |

**Suggested Counselor voice personalities** (configured in Settings, played via TTS):

| Voice ID | Personality | Best for |
|----------|-------------|----------|
| `counselor-warm` | Warm, empathetic, supportive — female | Daily check-ins, emotional support |
| `counselor-steady` | Calm, grounding, steady — male | Stress, anxiety, meditation reflections |
| `counselor-direct` | Direct, action-oriented — male | Goal-setting, accountability |
| `counselor-energetic` | Energetic, motivational — female | Pre-workout, low-mood days |

> You can add more by editing `src/lib/counselor/voices.ts` (created in Phase 5). Each voice is just a TTS voice ID + a system prompt that shapes the Counselor's tone.

---

## 4. Background Music

**Path:** `public/assets/audio/music/<category>/`

### 4a. Exercise music — `public/assets/audio/music/exercise/`

Uplifting, energizing tracks for workouts. **3–5 tracks recommended.**

**Format:** MP3, 192 kbps, stereo, 3–6 minutes each, seamlessly loopable.

**Naming:** `uplifting-1.mp3`, `uplifting-2.mp3`, `steady-push-1.mp3`, `steady-push-2.mp3`, `high-energy-1.mp3`

**BPM guidance:**
- `steady-push-*.mp3` — 110–120 BPM (mobility, yoga flow, warm-up)
- `uplifting-*.mp3` — 120–130 BPM (strength training, moderate cardio)
- `high-energy-*.mp3` — 130–145 BPM (HIIT, intense cardio)

**Royalty-free sources:** Pixabay Music, Free Music Archive, YouTube Audio Library, or compose your own. Avoid copyrighted tracks.

### 4b. Meditation music — `public/assets/audio/music/meditation/`

Calm, ambient, drone, or nature sounds. **3–5 tracks recommended.**

**Format:** MP3, 192 kbps, stereo, 5–15 minutes each, seamlessly loopable.

**Naming:** `calm-1.mp3`, `calm-2.mp3`, `nature-rain.mp3`, `nature-ocean.mp3`, `singing-bowls.mp3`

**Style guidance:** No vocals, no strong melody, slow or no rhythm. Drone pads, singing bowls, rain, ocean waves, forest ambience all work.

### 4c. Focus music — `public/assets/audio/music/focus/`

Brain-wave entrainment tracks for deep focus sessions. **3–5 tracks recommended.**

**Format:** MP3, 192 kbps, stereo, 10–30 minutes each, seamlessly loopable.

**Naming:** `brain-waves-alpha.mp3`, `brain-waves-beta.mp3`, `brain-waves-theta.mp3`, `binaural-focus.mp3`, `binaural-deep-work.mp3`

**Style guidance:**
- Alpha waves (8–12 Hz) — relaxed focus, creative work
- Beta waves (13–30 Hz) — active thinking, problem-solving
- Theta waves (4–7 Hz) — deep meditation, insight
- Binaural beats require stereo headphones to work properly

> If binaural beats are new to you: they're a well-studied audio technique where slightly different frequencies play in each ear, creating a perceived beat that entrains brain activity. Royalty-free binaural tracks are widely available on Pixabay and similar.

---

## 5. Sound Effects (optional but nice)

**Path:** `public/assets/audio/sfx/`

Short UI sound effects. The app already ships with Web Audio API-generated beeps for basic interactions, but you can override with these:

| Filename | When it plays |
|----------|---------------|
| `tap.mp3` | Button tap |
| `success.mp3` | Task completed, set completed |
| `error.mp3` | Error, wrong password |
| `unlock.mp3` | App unlocked |
| `lock.mp3` | App locked |
| `water-drop.mp3` | Water logged |
| `streak-milestone.mp3` | Streak day hit |

**Format:** MP3, 128 kbps, mono, under 50 KB each, under 1 second.

---

## Quick checklist

Before launching v2.0, you should have at minimum:

- [ ] 10+ exercise GIFs in `public/assets/exercises/gifs/` (the ones you already have — drop them in with the exact filenames from section 1)
- [ ] 1 coach voice folder in `public/assets/audio/coaches/` with the 14 cue MP3s from section 2 (add more coaches later)
- [ ] 2+ exercise music tracks in `public/assets/audio/music/exercise/`
- [ ] 2+ meditation music tracks in `public/assets/audio/music/meditation/`
- [ ] 2+ focus music tracks in `public/assets/audio/music/focus/`

Counselor voices, SFX, and the full set of 40 exercise GIFs can be added over time — the app gracefully handles missing files by falling back to defaults (icons, TTS, generated beeps).

---

## How the app uses each asset (mechanism summary)

This is the detailed exercise app mechanism you asked for:

### Exercise session flow

1. **Plan selection** — user picks a plan (e.g., "Upper Body Strength") or starts a custom session. The app loads the exercise list from `exercise_plans` table.
2. **Pre-workout screen** — shows exercises, estimated duration, muscle groups, "Start Workout" button. Coach voice says `workout-start.mp3`. Background music starts (user-selected playlist from `music/exercise/`).
3. **Per-exercise loop:**
   - Exercise intro: coach voice plays `exercise-intro.mp3`. GIF animation loads from `exercises/gifs/{id}.gif` and plays on loop. Form tips shown as text below.
   - Per-set loop:
     - Coach plays `set-start.mp3`
     - For rep-based exercises: user taps a "Rep" button per rep (or the app auto-counts via device motion in a future version). Coach plays `rep-X.mp3` every 5th rep. At halfway point, plays `halfway.mp3`. At last 3 reps, plays `last-three.mp3`.
     - For time-based exercises (plank, wall sit): countdown timer with audio cues at 10s remaining, then 3-2-1, then `set-complete.mp3`.
     - After set: coach plays `set-complete.mp3`. Rest timer starts (configurable, default 60s). Rest screen shows next set's target + a "Skip Rest" button.
     - At end of rest: coach plays `rest-end.mp3`.
   - After all sets: coach plays `exercise-complete.mp3`. Transition rest (default 90s) with `water-reminder.mp3`.
4. **Post-workout summary** — total duration, total volume (kg lifted), exercises completed, average RPE. Coach plays `workout-complete.mp3`. Music fades out. Session saved to `exercise_sessions` table and feeds into the streak + Day-in-Life rollup.
5. **Background music behavior** — plays continuously, ducks to 20% volume when coach speaks (audio ducking via Web Audio API gain node), user can toggle on/off, skip tracks, or change playlist mid-workout.

### Tracking

- **Per set:** reps, weight (kg), duration (seconds for holds), RPE (1–10, optional), completed flag.
- **Per session:** total volume (sum of reps × weight), perceived effort, notes.
- **History:** 30-day rolling window shown in exercise module; full history queryable; feeds into streak calendar via `day_in_life_rollups`.

### Breaks

- **Rest between sets:** default 60s, user-configurable per plan (15–180s). "Skip Rest" button always visible. "Add 30s" button for tough sets.
- **Rest between exercises:** default 90s, configurable (30–300s). Shows next exercise preview + water reminder.
- **Auto-pause:** if user switches tabs for >10s during a set, session auto-pauses with a "Resume" button.

### Counselor voice mechanism (Phase 5)

1. User opens Counselor module, picks a voice in Settings (or uses default).
2. User types a message (or uses voice input — future).
3. Local rule engine checks intent. If it can handle locally (greetings, mood check, simple queries), responds instantly with text + TTS reads it aloud in selected voice.
4. If intent needs deep reflection, request goes to server route. Server builds context (last 7 days of moods, last 3 journals, exercise adherence, spending trends), calls LLM, returns response. UI shows "thinking" steps ("Reading your journal... Reviewing spending..."). Response streams in, then TTS reads it aloud.
5. User can tap a "Stop speaking" button to interrupt TTS. Voice preference persists across sessions.

---

## Questions?

If any of the above is unclear or you want to adjust the spec (e.g., different exercise list, different coach scripts, different music style), just say so before you start recording/collecting files. Once files are in the right folders, the app picks them up automatically — no code changes needed.
