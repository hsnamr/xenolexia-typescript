# Xenolexia-TypeScript Monorepo Confirmation

## 1. Confirmation: Monorepo of Three (Former) Git Repos

**xenolexia-typescript** is a **monorepo** containing three workspaces:

| Workspace   | Package name           | Description |
|------------|------------------------|-------------|
| **electron**   | xenolexia-electron   | Electron desktop app (app + lib) |
| **react-native** | xenolexia-react     | React Native mobile app |
| **ts-core**    | xenolexia-typescript | Shared TypeScript core (types, algorithms, services) |

- **Root** `package.json` declares `workspaces: ["ts-core", "react-native", "electron"]` and is named `xenolexia-monorepo`.
- **electron**, **react-native**, and **ts-core** were previously separate git repositories (each had its own `.git`). They have been merged into this single repo: nested `.git` directories were removed so the parent repo tracks all file content as one history.
- **react-native** depends on **ts-core** via `"xenolexia-typescript": "file:../ts-core"`.

## 2. Push to GitHub

- **Remote added:** `origin` → `git@github.com:hsnamr/xenolexia-typescript.git`
- **Initial commit created:** "Monorepo: electron, react-native, ts-core" (root docs, package.json, and full content of electron/, react-native/, ts-core/; root `node_modules/` excluded via `.gitignore`).

**Push** from your machine:

```bash
cd xenolexia-typescript
git push -u origin master
```

If push fails (e.g. `send-pack: unexpected disconnect`), check:

- SSH key: `ssh -T git@github.com`
- Network / firewall
- Repo size; push again or use a stable connection

If the default branch on GitHub is `main`, either rename locally and push:

```bash
git branch -m master main
git push -u origin main
```

or create the repo on GitHub with default branch `master` first.
