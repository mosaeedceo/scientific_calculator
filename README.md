# Scientific Calculator

Native Expo/React Native scientific calculator app for Android.

## Setup

```sh
pnpm install
```

## Typecheck

```sh
pnpm run typecheck
```

## Generate Android project

```sh
pnpm run prebuild:android
```

## Build arm64-only APK

```sh
pnpm run build:apk:arm64
```

APK output:

```text
android/app/build/outputs/apk/release/app-release.apk
```

The app is configured with `reactNativeArchitectures=arm64-v8a`, so release APK builds contain arm64-v8a native libraries only.
