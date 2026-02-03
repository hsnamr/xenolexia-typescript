# Beta Testing – TestFlight (iOS) and Play Internal Testing (Android)

This document describes how to set up and use **TestFlight** (iOS) and **Google Play Internal Testing** (Android) for the Xenolexia React Native app.

---

## Prerequisites

- **Apple Developer account** (for TestFlight)
- **Google Play Developer account** (for Play Console)
- **Fastlane** installed (`gem install fastlane` or via Bundler)
- **Xcode** (macOS) for iOS builds
- **Android SDK** and signing keystore for Android builds

See `docs/APP_STORE.md` and `docs/PLAY_STORE.md` for app metadata, privacy policy, and store listing requirements.

---

## iOS – TestFlight

### 1. App Store Connect

- Create the app in [App Store Connect](https://appstoreconnect.apple.com/) (if not already created).
- Fill in name, bundle ID (`com.xenolexia.app` or your chosen ID), SKU, primary language.
- Under **TestFlight**, add **Internal Testing** group and add testers by email (Apple ID).

### 2. Code signing (Fastlane Match)

- Ensure `ios/fastlane/Matchfile` is configured (storage for certificates/profiles, e.g. git repo or S3).
- Run `cd react-native-app/ios && fastlane match development` (and `fastlane match appstore`) to sync signing assets.

### 3. Build and upload

From the **react-native-app** directory:

```bash
cd ios
fastlane upload_testflight
```

Or build then upload:

```bash
fastlane build_release
# Then upload the IPA from the output path
fastlane upload_to_testflight
```

### 4. Testers

- Internal testers receive an email from Apple; they install **TestFlight** from the App Store, then open the invite and install the app.
- Builds appear under TestFlight → Internal Testing after processing (often 10–30 minutes).

### 5. Troubleshooting

- **Invalid provisioning profile:** Run `fastlane match appstore --force_for_new_devices` and rebuild.
- **Missing compliance:** In App Store Connect, answer encryption and other compliance questions for the build.
- See `docs/TROUBLESHOOTING.md` and [Apple TestFlight docs](https://developer.apple.com/testflight/).

---

## Android – Play Internal Testing

### 1. Google Play Console

- Create the app in [Google Play Console](https://play.google.com/console/) (if not already created).
- Complete store listing (short/long description, graphics, privacy policy).
- Under **Testing** → **Internal testing**, create a track and add testers (email list or Google Group).

### 2. Signing

- Ensure `android/app/build.gradle` has a `signingConfig` for release (or use environment variables for keystore path/password).
- For upload you need an **AAB** (Android App Bundle), not only APK.

### 3. Build and upload

From the **react-native-app** directory:

```bash
cd android
fastlane deploy_internal
```

Or build AAB then upload manually:

```bash
cd android
./gradlew bundleRelease
# AAB is in app/build/outputs/bundle/release/
# Upload in Play Console: Release → Testing → Internal testing → Create new release → Upload AAB
```

### 4. Testers

- Add testers by email in Play Console (Internal testing → Testers).
- Testers receive a link to opt in; they can then install the app from the Play Store (internal testing link).

### 5. Troubleshooting

- **Version code:** Each upload must have a higher `versionCode` than the previous. Fastlane `build_bundle` can increment it.
- **Signing:** Ensure release build uses your upload key; see `docs/PLAY_STORE.md` for keystore setup.

---

## Summary

| Platform | Command (from react-native-app) | Where testers get the app |
|----------|---------------------------------|----------------------------|
| **iOS**  | `cd ios && fastlane upload_testflight` | TestFlight app (invite email) |
| **Android** | `cd android && fastlane deploy_internal` | Play Store (internal testing link) |

For **manual upload** (e.g. first time or without Fastlane): build the IPA/AAB as above, then upload in App Store Connect (TestFlight) or Play Console (Internal testing).
