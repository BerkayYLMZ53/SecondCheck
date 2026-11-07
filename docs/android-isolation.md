# Android isolation

Metro resolves `App.android.tsx` and `utils/startup.android.ts` for Android.
The existing `App.tsx`, startup utility, iOS effects and haptics are unchanged.

The first Android effect calls the guarded `SplashScreen.hideAsync()` immediately.
The application renders on the next event-loop turn without waiting for native
promises, asset preloads or the animated in-app splash. Android never calls
`preventAutoHideAsync`; a 2.5-second retry also covers early module-load failures.
Application module evaluation runs under the existing recovery boundary. The
diagnostics screen mounts only after its first visit, inside a separate boundary.

Android variants of `AnalysisPresentationContext`, `SpringBottomSheet` and
`SkeletonCard` use ordinary surfaces without importing `expo-blur`. Their default
files continue to supply the original iOS/web implementation. Keep functional
changes to these components in sync with the Android variants when appropriate.

`app.json` deduplicates Android permissions and blocks unused background audio
service, media audio/video, photo-location and overlay permissions at manifest
merge time. Camera, microphone, vibration and photo permissions remain for the
existing inspection and report-saving features, including older Android devices.
The shared plugin list and all iOS configuration are unchanged. Background audio
playback and recording were already disabled and remain disabled.

## Validation

```powershell
npm run typecheck
npm run lint
node --test tests/*.test.cjs
npx expo config --type introspect
npx expo export --platform android --platform ios --clear --output-dir dist-native
```

The separate EAS profile inherits the existing preview settings and produces an
APK. To request a fresh remote Android build:

```powershell
eas build --platform android --profile android-stable --clear-cache
```

No generated `android/` or `ios/` project is checked in. EAS generates the native
Android project from the configuration. Package versions, Hermes and the iOS
build profile are unchanged.

JavaScript boundaries recover from render/module errors; they cannot catch a JVM,
C++ or operating-system crash. Hermes exports and manifest introspection do not
replace an APK build and physical-device cold-start, background/resume, camera,
audio and gallery checks. Test those paths in a standalone APK before release.
