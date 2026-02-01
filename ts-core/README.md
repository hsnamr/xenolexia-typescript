# xenolexia-typescript

Shared core logic for Xenolexia (React Native and Electron). This package contains platform-agnostic types, algorithms, and services. All I/O (file system, database, key-value store, HTTP) is provided by the host via injectable interfaces.

## Usage

1. **Install** in your app (Electron or React Native):

   ```bash
   npm install ../xenolexia-typescript
   # or from registry when published
   ```

2. **Provide adapters** that implement the core interfaces:

   - `IFileSystem` – read/write files (e.g. Electron IPC, React Native `react-native-fs`)
   - `IDataStore` – books, vocabulary, sessions, word list (e.g. LowDB, better-sqlite3, react-native-sqlite-storage)
   - `IKeyValueStore` – simple key-value (e.g. electron-store, AsyncStorage)

3. **Create services** using the factory or by instantiating with injected dependencies:

   ```ts
   import { createXenolexiaCore } from 'xenolexia-typescript';

   const core = createXenolexiaCore({
     fileSystem: myFileSystemAdapter,
     dataStore: myDataStoreAdapter,
     keyValueStore: myKeyValueStoreAdapter,
   });

   const book = await core.bookParserService.parse(path, 'epub');
   const processed = await core.translationEngine.processContent(html);
   ```

## Contents

- **Types** – Book, Vocabulary, Language, Reader, etc.
- **Interfaces** – IFileSystem, IDataStore, IKeyValueStore
- **Translation engine** – Tokenizer, WordReplacer, DynamicWordDatabase, TranslationAPIService, FrequencyListService
- **Book parsing** – EPUB, TXT, MOBI (EPUBExtractor uses IFileSystem)
- **Storage** – Repository layer and StorageService facade (use IDataStore)
- **Export** – CSV, Anki TSV, JSON
- **Reader style** – CSS generation (themes, fonts)

No React, React Native, or Electron dependencies. The host app supplies implementations for file system, database, and key-value store.
