# Life_OS v2.0 — Phase 0 Foundation

A unified, encrypted, on-device life-management PWA. This is the Phase 0 scaffold — the foundation
on which the next 9 phases of the migration roadmap will be built.

## What's in Phase 0

- **Next.js 16 + TypeScript + Tailwind CSS 4 + shadcn/ui** — the unified chassis
- **Dexie (IndexedDB)** with all 17 tables from the planning document's schema (section 6)
- **Master password crypto layer** (PBKDF2 200k iterations + AES-GCM) — see `src/lib/crypto/master-key.ts`
- **Auth store** (Zustand) holding the unlocked DEK in memory only — see `src/lib/stores/auth-store.ts`
- **Setup screen** — first-time master password + 24-word recovery code
- **Lock screen** — returning user unlock (auto-locks after 5 min inactivity)
- **App shell** — sidebar (9 modules), topbar (streak counter, focus toggle, lock button, live clock)
- **Dashboard** — 6 widget placeholders, Counselor's note card, phase roadmap
- **Module placeholders** — clicking any non-dashboard module shows a "ships in Phase N" banner

## File structure

```
src/
├── app/
│   ├── layout.tsx           # Root layout, PWA metadata, theme color
│   ├── page.tsx             # Orchestrates: loading → setup → lock → shell
│   └── globals.css          # Tailwind + shadcn theme tokens
├── components/
│   ├── auth/
│   │   ├── setup-screen.tsx # First-time master password + recovery code
│   │   └── lock-screen.tsx  # Returning user unlock
│   ├── shell/
│   │   ├── app-shell.tsx    # Layout: sidebar + topbar + main outlet
│   │   ├── sidebar.tsx      # 9-module navigation
│   │   └── topbar.tsx       # Streak, focus toggle, lock button, clock
│   ├── dashboard/
│   │   └── dashboard.tsx    # 6 widgets + counselor note + roadmap
│   └── ui/                  # shadcn/ui components (pre-installed)
├── lib/
│   ├── crypto/
│   │   └── master-key.ts    # PBKDF2 + AES-GCM + recovery code
│   ├── db/
│   │   └── life-os-db.ts    # Dexie schema + TypeScript types
│   ├── stores/
│   │   ├── auth-store.ts    # Zustand: lock/unlock state, DEK in memory
│   │   └── ui-store.ts      # Zustand: active module, sidebar, focus mode
│   ├── modules.ts           # Module registry (9 modules with phases)
│   └── utils.ts             # cn() helper
```

## Run it

```bash
bun run dev      # already running on port 3000
bun run lint     # check code quality
```

Open the preview panel to see the app. On first launch:
1. You'll see the **setup screen** — enter a master password (8+ chars)
2. You'll see a **24-word recovery code** — copy it somewhere safe (it's your only recovery path)
3. The **app shell** loads with the dashboard visible

Refresh the page or click the lock icon in the topbar → **lock screen** appears → re-enter password to unlock.

## What's next (Phase 1)

Phase 1 turns the dashboard placeholders into real widgets:
- Streak counter wired to `streak_days` table
- Today's tasks from `tasks` table (Phase 4 ships the full module first)
- Water ring from `water_logs` table (Phase 7 ships the full module first)
- Mood graph from `moods` table (Phase 2 ships Journal first)

Then Phase 2 (Journal/Inkwell) is the first real module migration — porting `dd.html` into
React components connected to the `journals` + `moods` tables.

## Reference

See `/home/z/my-project/download/Life_OS_v2_Architecture_and_Migration_Plan.pdf` for the
full architecture, data schema, AI Counselor design, and 8-10 week migration roadmap.

## Honest security note

Phase 0 uses real PBKDF2 + AES-GCM via the browser's `crypto.subtle` API. The crypto is sound.
What's NOT yet implemented:
- Encrypting actual sensitive table rows with the DEK (Phase 8 will wire this for vault_items)
- Recovery code entry UI (Phase 8)
- Encrypted `.lifeos` export/import (Phase 10)

The auth flow (setup → lock → unlock) IS real and working. Use a password you'll remember,
or save the recovery code.
