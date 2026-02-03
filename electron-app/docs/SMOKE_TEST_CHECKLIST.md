# Electron App – Smoke Test Checklist

Use this checklist when testing the Xenolexia Electron app on **Windows**, **macOS**, or **Linux** after a build or before release.

---

## Prerequisites

- Built app: run `npm run electron:build` from `electron-app` (or `npm run electron:build:win` / `electron:build:mac` / `electron:build:linux`), or run in dev with `npm run electron:dev`.
- Optionally: one EPUB or TXT file for import.

---

## 1. Launch and onboarding

- [ ] App launches without crash.
- [ ] On first run, onboarding is shown (Welcome, language pair, proficiency, word density, Get started).
- [ ] Completing onboarding (or Skip) closes onboarding and shows the main tabs (Library, Vocabulary, Review, Settings, Statistics, About).
- [ ] On next launch, onboarding is not shown (main tabs appear directly).

---

## 2. Library

- [ ] **Library** tab shows (empty state or list of books).
- [ ] **Import** opens a file dialog; selecting an EPUB or TXT adds the book to the library.
- [ ] Book appears in the grid/list with title (and cover if available).
- [ ] Clicking a book opens book detail (metadata, progress, Read/Delete or similar).
- [ ] **Read** opens the reader for that book.
- [ ] **Discover** (if present) or discovery flow is reachable and does not crash.

---

## 3. Reader

- [ ] Reader opens with chapter content.
- [ ] Some words appear in the target language (word replacement).
- [ ] **Hover** (or click) on a foreign word shows a translation popup (original word, optional context).
- [ ] Popup has **Save to vocabulary**; clicking it adds the word (no crash).
- [ ] **Chapter navigation** (prev/next or chapter list) changes content.
- [ ] **Reader settings** (theme, font size, line spacing) are available and change appearance.
- [ ] Closing the reader (Back or equivalent) returns to Library or previous screen; progress is saved (reopening the book restores position/chapter).

---

## 4. Vocabulary and review

- [ ] **Vocabulary** tab shows the list of saved words (including the one just saved).
- [ ] Search/filter works (if implemented).
- [ ] **Review** tab shows “Due today” count and flashcard(s) when there are due items.
- [ ] Flipping a card shows the back (source word, context); grading buttons (Again/Hard/Good/Easy/Already Knew) work and advance to the next card.
- [ ] After reviewing, “Reviewed” count updates; when no more due, “No cards due” or similar is shown.

---

## 5. Export

- [ ] From Vocabulary or Settings, **Export** (CSV, Anki, or JSON) is available.
- [ ] Choosing a format and location saves a file; opening it shows the expected format (headers and data).

---

## 6. Settings and statistics

- [ ] **Settings** tab: language pair, proficiency, word density, reader defaults (theme, font, line spacing), daily goal (if present) can be changed and persist after restart.
- [ ] **Statistics** tab: shows reading stats (e.g. books read, reading time, words learned, streak, words revealed/saved today) and “reading over time” chart (if implemented).

---

## 7. System tray (if enabled)

- [ ] **Tray icon** appears in the system tray (Windows/Linux taskbar or macOS menu bar).
- [ ] **Show/Hide** shows or hides the main window.
- [ ] **Quit** closes the app.

---

## 8. Window and build

- [ ] Window can be resized and maximized; state (size, position, maximized) is restored on next launch (if implemented).
- [ ] **About** tab or screen shows app name and version.
- [ ] Installer (NSIS/DMG/AppImage or other) installs and launches the app (test on a clean machine or VM if possible).

---

## Notes

- If any step fails, note the OS, build type (dev vs built), and error message for debugging.
- For Phase A.4, run this checklist on **Windows**, **macOS**, and **Linux** at least once.
