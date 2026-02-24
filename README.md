# Claude Garden

I run a bunch of Claude Code sessions at once across different terminals. Switching between tabs to check what's working and what needs my attention got old fast, so I built this: a small floating widget that turns each session into a plant.

Green and swaying means it's working, blue and leaning means it wants your input. Gray is idle, pink bloom is done, red wilt means something broke.

![Electron](https://img.shields.io/badge/Electron-39-blue) ![React](https://img.shields.io/badge/React-18-61dafb) ![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178c6)

## How it looks

Each project gets its own plant type (succulent, fern, flower, tree, or cactus) based on a hash of its path, so you'll recognize them at a glance. The widget sits in the corner of your screen, always on top, frameless. Click a plant and you get a detail card with the current tool, file, and task info.

There's also a greenhouse view, a full dashboard with larger plant cards and an activity journal, if you want the bigger picture.

The widget watches `~/.claude/` for file changes and polls every few seconds as a fallback. It detects running Claude Code processes directly (via `wmic` on Windows), so closed sessions don't stick around as ghosts.

If a session has todos or tasks, you'll see a small progress ring on the plant.

## Install

```bash
npm install
```

If you're behind a firewall and can't download the Electron binary, run `npm install --ignore-scripts` and copy the Electron `dist/` folder and `path.txt` from another project that has it.

## Run

```bash
npm run dev
```

Shows up at the bottom-right of your screen.

## Build

```bash
npm run build:win    # Windows
npm run build:mac    # macOS
npm run build:linux  # Linux
```

## How status detection works

The app reads `~/.claude/history.jsonl` for session metadata, monitors transcript files in `~/.claude/projects/`, and checks `~/.claude/todos/` and `~/.claude/tasks/` for task progress. It also queries the system process list to know which sessions are actually alive.

Status logic:

| Signal | Status |
|--------|--------|
| Transcript written < 30s ago | Working |
| Last entry is assistant text or AskUserQuestion | Waiting |
| Task lock present, no assistant text | Working |
| Transcript > 10 min old | Idle |
| All tasks completed | Done |
| Transcript has error entries | Error |

Each session maps to a plant type through a deterministic hash of its project path.

## Stack

Electron + electron-vite for the desktop shell. React 18 + TypeScript for the UI. Plants are inline SVG components with CSS animations. File watching through chokidar. Process detection through wmic on Windows.

## Project structure

```
src/
  main/
    index.ts         # Window management, IPC, file watching
    sessionReader.ts # Session parsing, status detection, process detection
  preload/           # Electron preload bridge
  renderer/src/
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
