# Claude Garden

A floating desktop widget that visualizes your active Claude Code sessions as a living garden. Each session becomes a growing plant — swaying when working, leaning when it needs your input, dimming when idle, and blooming when done.

![Electron](https://img.shields.io/badge/Electron-39-blue) ![React](https://img.shields.io/badge/React-18-61dafb) ![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178c6)

## What It Does

Instead of switching between terminal tabs to check on your Claude Code sessions, Claude Garden gives you a persistent visual overview:

- **Working** (green, swaying) — Claude is actively writing to the transcript
- **Needs You** (blue, leaning) — Claude finished and is waiting for your input
- **Idle** (gray, dimmed) — session is open but inactive
- **Done** (pink, blooming) — all tasks completed
- **Error** (red, wilting) — something went wrong

Each project gets a unique plant type (succulent, fern, flower, tree, or cactus) based on its path, so you can recognize them at a glance.

## Features

- **Compact floating widget** — always-on-top, frameless, sits in the corner of your screen
- **Live process detection** — only shows sessions that are actually running (no stale ghosts)
- **Real-time updates** — watches `~/.claude/` for changes with file watchers + polling fallback
- **Task progress** — shows todo/task completion as a small progress ring on each plant
- **Detail card** — click a plant to see current tool, file, and task info
- **Greenhouse view** — expand to a full dashboard with large plant cards and an activity journal
- **Status labels** — clear text indicators under each plant

## Install

```bash
npm install
```

> **Note:** If you can't download the Electron binary (e.g., behind a firewall), run `npm install --ignore-scripts` and manually copy the Electron `dist/` folder and `path.txt` from another project that has it.

## Run

```bash
npm run dev
```

The garden widget appears at the bottom-right of your screen.

## Build

```bash
npm run build:win    # Windows
npm run build:mac    # macOS
npm run build:linux  # Linux
```

## How It Works

1. Reads session history from `~/.claude/history.jsonl`
2. Monitors transcript files in `~/.claude/projects/` for real-time status
3. Checks `~/.claude/todos/` and `~/.claude/tasks/` for task progress
4. Detects running Claude Code processes via system process list
5. Maps each session to a plant type (deterministic hash of project path)
6. Derives status from transcript mtime, last entry type, and task state

### Status Detection

| Signal | Status |
|--------|--------|
| Transcript written < 30s ago | Working |
| Last entry is assistant text or AskUserQuestion | Waiting |
| Task lock present, no assistant text | Working |
| Transcript > 10 min old | Idle |
| All tasks completed | Done |
| Transcript has error entries | Error |

## Tech Stack

- **Electron** + **electron-vite** for the desktop shell
- **React 18** + **TypeScript** for the UI
- **Inline SVG** plant components with CSS animations
- **chokidar** for file system watching
- **wmic** (Windows) for process detection

## Project Structure

```
src/
  main/              # Electron main process
    index.ts         # Window management, IPC, file watching
    sessionReader.ts # Session parsing, status detection, process detection
  preload/           # Electron preload bridge
  renderer/src/      # React UI
    components/
      plants/        # SVG plant components (Succulent, Fern, Flower, etc.)
      GardenView     # Compact floating widget
      GreenhouseView # Full dashboard
      PlantPot       # Plant + pot + status label composite
      DetailCard     # Expanded session info
  shared/
    types.ts         # Shared TypeScript interfaces
```

## License

MIT
