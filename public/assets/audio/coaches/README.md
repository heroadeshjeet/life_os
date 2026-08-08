# Coach Voice Audio Files

Each subfolder is one coach voice. The app auto-discovers any folder starting with `coach-`.

## Folder structure

```
coaches/
├── coach-1-male-energy/      # High-energy motivating male
├── coach-2-female-warm/      # Warm supportive female
├── coach-3-male-calm/        # Calm steady male
└── coach-4-female-strong/    # Strong direct female
```

## Files each coach needs (MP3, 128 kbps, mono, under 100 KB each)

- `workout-start.mp3` — "Let's get started. First exercise: push-ups. Three sets of twelve reps."
- `exercise-intro.mp3` — "Next exercise: [name]. [X] sets of [Y] reps."
- `set-start.mp3` — "Set one. Begin!"
- `halfway.mp3` — "Halfway there. Keep going!"
- `last-three.mp3` — "Three, two, one..."
- `set-complete.mp3` — "Set complete. Rest for sixty seconds."
- `rest-end.mp3` — "Three, two, one, go!"
- `exercise-complete.mp3` — "Exercise complete. Next up: [name]."
- `workout-complete.mp3` — "Great workout! You crushed it today."
- `encouragement-1.mp3` — "You got this!"
- `encouragement-2.mp3` — "Push through!"
- `encouragement-3.mp3` — "Almost there!"
- `water-reminder.mp3` — "Grab a sip of water."

See `/ASSETS_NEEDED.md` section 2 for full details.

To add a new coach: create a new folder `coach-5-<descriptor>/` and drop in the same 13 MP3 files.
