# StarGym — Gym Check-In & Attendance Tracker

A Flutter mobile app with Firebase authentication, QR code check-in, and attendance calendar.

## Features

- **Login / Sign Up** — Firebase email & password authentication
- **Dashboard** — Greeting, monthly session count, check-in status, quick actions
- **Check-In** — Animated QR code barcode for front-desk scanning; confirm button writes to Firestore
- **Attendance Calendar** — Monthly view with present days highlighted in gold
- **Side Drawer Menu** — Navigation to all screens + logout

## Setup

### 1. Firebase Project

1. Create a project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable **Authentication → Email/Password**
3. Create a **Firestore** database (start in test mode)

### 2. FlutterFire CLI

```bash
dart pub global activate flutterfire_cli
flutterfire configure --project=YOUR_FIREBASE_PROJECT_ID
```

This overwrites `lib/firebase_options.dart` with real credentials.

### 3. Install & Run

```bash
flutter pub get
flutter run
```

## Firestore Data Model

```
users/{uid}/attendance/{YYYY-MM-DD}
  ├── date        Timestamp
  ├── checkedInAt ServerTimestamp
  └── uid         String
```

## App Flow

```
Login Screen
    │
    └─► Dashboard (auto on auth)
            ├── [Check In] ──► QR Barcode Screen ──► ✅ Confirmed → Calendar updated
            ├── [Attendance] ──► Calendar Screen
            └── [☰ Menu] ──► Side Drawer
```
