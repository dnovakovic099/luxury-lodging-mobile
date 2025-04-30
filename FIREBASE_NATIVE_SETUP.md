# Firebase Native Setup for Luxury Lodging Mobile

This document explains how Firebase has been configured at the native level for both iOS and Android.

## iOS Setup

Firebase has been initialized in the native iOS code through the following implementations:

1. **AppDelegate.mm**
   - Firebase is configured at app launch with `[FIRApp configure]`
   - This ensures Firebase services are available throughout the app lifecycle

2. **Swift Integration (For Future SwiftUI Support)**
   - A Swift bridging file (`FirebaseSwiftUIDelegate.swift`) has been created
   - This allows for future SwiftUI components to be integrated with Firebase
   - The bridging header (`LuxuryLodging-Bridging-Header.h`) connects Swift and Objective-C code

### If You Want to Switch to a Pure SwiftUI App

If you decide to convert to a pure SwiftUI app in the future, you can use this implementation:

```swift
import SwiftUI
import FirebaseCore

class AppDelegate: NSObject, UIApplicationDelegate {
  func application(_ application: UIApplication,
                   didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey : Any]? = nil) -> Bool {
    FirebaseApp.configure()
    return true
  }
}

@main
struct LuxuryLodgingApp: App {
  // register app delegate for Firebase setup
  @UIApplicationDelegateAdaptor(AppDelegate.self) var delegate

  var body: some Scene {
    WindowGroup {
      NavigationView {
        ContentView()
      }
    }
  }
}
```

## Android Setup

Firebase has been initialized in the native Android code:

1. **MainApplication.kt**
   - Firebase is configured at app launch with `FirebaseApp.initializeApp(this)`
   - This is done in the `onCreate()` method to ensure Firebase is available immediately

## Integration with React Native JavaScript Code

The native Firebase initialization ensures that all Firebase services (`messaging`, `firestore`, etc.) are properly initialized before your React Native JavaScript code tries to use them.

Your existing Firebase JavaScript code should work without modification since the native initialization happens before the JavaScript context is loaded.

## Important Notes for Developers

1. **Configuration Files**
   - Make sure you've added the necessary configuration files:
     - iOS: `GoogleService-Info.plist` in the iOS app directory
     - Android: `google-services.json` in the android/app directory

2. **Native Module Dependencies**
   - If you add more Firebase features, you may need to update native dependencies:
     - iOS: Update the Podfile and run `pod install`
     - Android: Update build.gradle files

3. **Testing**
   - After configuration, test each Firebase service to ensure it's properly initialized
   - Check logs for any Firebase initialization errors

## Troubleshooting

If you encounter issues with Firebase initialization:

1. **iOS Issues**
   - Check that `GoogleService-Info.plist` is properly added to the Xcode project
   - Ensure the bundle ID matches what's registered in Firebase Console

2. **Android Issues**
   - Verify that `google-services.json` is in the correct location
   - Confirm the application ID in build.gradle matches what's in Firebase Console

3. **Initialization Timing Issues**
   - If services aren't available when needed, check initialization sequence
   - Consider using the Firebase JavaScript SDK's `onReady()` promise 