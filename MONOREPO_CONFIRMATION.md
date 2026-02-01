# Xenolexia-TypeScript Monorepo

## Structure

**xenolexia-typescript** is a **monorepo** containing three projects:

| Project            | Package name           | Description |
|--------------------|------------------------|-------------|
| **ts-shared-core** | xenolexia-typescript   | Shared core logic (types, algorithms, services) used by both Electron and React Native apps. Platform-agnostic with injectable I/O. |
| **electron-app**   | xenolexia-electron     | Electron desktop app (macOS, Windows, Linux). Uses ts-shared-core via `electron-app/lib` adapters. |
| **react-native-app** | xenolexia             | React Native app (iOS, Android, Web). Uses ts-shared-core for shared functionality. |

## Wiring

- **ts-shared-core**: Builds to `dist/`. Exports `main: dist/index.js`, `types: dist/index.d.ts`. No app-specific code.
- **electron-app**: Internal workspaces `app` and `lib`. `lib` (`@xenolexia/shared`) depends on `xenolexia-typescript` (ts-shared-core) and provides Electron adapters (file system, key-value store). The Electron app package depends on `@xenolexia/shared`.
- **react-native-app**: Depends on `xenolexia-typescript` (file:../ts-shared-core) for shared core. Platform code (React Native, Web) lives in the app.

## Build targets

- **Electron**: macOS (dir, dmg), Windows (nsis, portable), Linux (AppImage, deb, rpm, pacman, tar.gz).
- **React Native**: iOS, Android, Web (webpack).

## Root scripts

From repo root (after `npm install`):

- `npm run build:core` — build ts-shared-core
- `npm run build:electron:linux` — build core then Electron Linux
- `npm run build:electron:mac` — build core then Electron macOS
- `npm run build:electron:win` — build core then Electron Windows
- `npm run build:web` — build core then React Native web bundle

## Remote

- **Origin:** `git@github.com:hsnamr/xenolexia-typescript.git`
- Default branch: `main`
