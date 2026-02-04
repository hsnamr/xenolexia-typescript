# React Native Implementation Status

This document lists what is **incomplete** or **not implemented** in the xenolexia-typescript React Native app, based on code review and comparison with the PLAN and Electron app.

---

## 1. Navigation – Placeholder screens

Three stack routes still render **PlaceholderScreen** ("Coming Soon") instead of real screens:

| Route | Current | Should be |
|-------|---------|-----------|
| **BookDetail** | `PlaceholderScreen title="Book Details"` | `BookDetailScreen` (exists in `screens/BookDetail/`) |
| **VocabularyDetail** | `PlaceholderScreen title="Word Details"` | A screen that shows `WordDetailModal` with `wordId` from route params (VocabularyScreen navigates here with `navigation.navigate('VocabularyDetail', {wordId: item.id})`) |
| **ReaderSettings** | `PlaceholderScreen title="Reader Settings"` | A standalone Reader Settings screen, or reuse `ReaderSettingsModal` as a full-screen stack screen (Settings and Profile both navigate to `ReaderSettings`) |

**Impact:** Tapping a word in Vocabulary opens "Coming Soon"; opening Reader Settings from Settings/Profile opens "Coming Soon"; BookDetail is never used (Library opens Reader directly).

---

## 2. StorageService.ts – Unused legacy wrapper

`src/services/StorageService/StorageService.ts` is a **legacy wrapper** with **all methods stubbed** (TODO: Implement). The app does **not** use this class for core flows:

- **Books:** `libraryStore` → `bookRepository` (DatabaseService + BookRepository)
- **Vocabulary:** `vocabularyStore` → `vocabularyRepository`
- **Sessions:** SessionRepository

So StorageService is **incomplete but unused**. Either remove it or implement it and migrate callers; otherwise it is dead code.

---

## 3. Persistence – Stores not persisted

| Store | Missing | Location |
|-------|---------|----------|
| **userStore** | Load/save preferences from AsyncStorage | `loadPreferences`, `savePreferences` – TODO: Load from AsyncStorage; TODO: Save to AsyncStorage |
| **statisticsStore** | Persist/load stats and sessions from DB | `endSession`, `recordReviewSession` – TODO: Persist to database; `loadStats` – TODO: Load from database |

**Impact:** User preferences (language pair, proficiency, density, theme, etc.) and reading/statistics data are lost on app restart.

---

## 4. Book formats – Only EPUB implemented

`BookParserService.ts`:

- **EPUB:** Implemented.
- **FB2:** TODO: Implement FB2 parser.
- **MOBI:** TODO: Implement MOBI parser.
- **TXT:** TODO: Implement TXT parser.

**Impact:** Only EPUB is parsed; FB2, MOBI, and TXT imports are not supported in the parser (even if the UI allows selecting them).

---

## 5. BookDownloadService – Delete local file stubbed

`BookDownloadService.deleteLocalBook(filePath)` does not delete the file:

- TODO: Implement using RNFS (`RNFS.unlink`).

Download and listing use RNFS correctly; only **deletion** of a downloaded file is stubbed.

---

## 6. ImageService / ThumbnailGenerator

- **ThumbnailGenerator:** Described as a "stubbed version"; actual resizing and dimension reading are TODOs (e.g. react-native-image-resizer, react-native-image-size).
- **Impact:** Thumbnails may not be generated correctly on device; placeholder/fallback behavior only.

---

## 7. Reader – Brightness control

**PLAN Phase 4.2:** Brightness control is **unchecked**.

- Types and stores include `brightness` (e.g. ReaderSettings, userStore, readerStore).
- There is **no UI or native API** to change device/screen brightness in the reader.

---

## 8. FileSystemService – Web only

`src/services/FileSystemService/index.ts` exports only `FileSystemService.web`.

- **Native (iOS/Android):** No dedicated FileSystemService module; ImportService and BookDownloadService use **RNFS** and **DocumentPicker** directly. So native import/download works, but there is no shared FileSystemService abstraction for native.

---

## 9. Minor TODOs

| Location | Item |
|----------|------|
| **ImportBookButton** | TODO: Cancel ongoing import if possible |
| **performance.ts** | React Native doesn’t have `performance.memory`; placeholder used |

---

## 10. Phase 8 – Release preparation (from PLAN)

- **Not done:** App icons (all sizes); screenshots for store listings; TestFlight / Internal testing setup; production deployment workflow; App Store / Play Store submission.
- **Docs:** BETA_TESTING.md and REQUIRES_MANUAL_INPUT.md describe manual steps.

---

## 11. Testing & accessibility (from PLAN)

- **E2E tests** for critical flows: not implemented.
- **Performance testing** with large books: not implemented.
- **Accessibility:** Screen reader support, dynamic text sizing, high contrast mode: not implemented.

---

## 12. Collections (stretch – from PLAN)

- Create custom collections; drag books into collections: **not implemented**.
- Smart collections (e.g. “currently reading”, “completed”) exist via store selectors only.

---

## Summary table

| Area | Status | Notes |
|------|--------|--------|
| BookDetail screen | Implemented but not wired | Use `BookDetailScreen` in AppNavigator; add navigation from Library (e.g. long-press or “Details”) |
| VocabularyDetail screen | Placeholder | Implement screen that shows WordDetailModal for `wordId` |
| ReaderSettings screen | Placeholder | Implement standalone screen or reuse ReaderSettingsModal |
| User preferences persistence | Not implemented | userStore: AsyncStorage load/save |
| Statistics persistence | Not implemented | statisticsStore: persist/load sessions and stats |
| StorageService class | All stubs | Unused; remove or implement |
| FB2 / MOBI / TXT parsing | Not implemented | BookParserService TODOs |
| Delete downloaded book file | Stubbed | BookDownloadService: RNFS.unlink |
| Thumbnail generation | Stubbed | ThumbnailGenerator: real resizing/size APIs |
| Brightness control | Not implemented | No UI or native brightness API |
| FileSystemService native | Web only | Native uses RNFS directly; no native abstraction |
| Cancel import | Not implemented | ImportBookButton TODO |
| E2E / performance / a11y | Not implemented | Future |
| Release assets & store submission | Manual / in progress | Icons, screenshots, TestFlight, stores |

---

*Last updated: February 2026*
