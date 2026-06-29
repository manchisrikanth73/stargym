# StarGym — Gym Check-In & Attendance App

React Native (Expo) mobile app with Firebase auth, QR check-in, and attendance calendar.

## Features

| Screen | What it does |
|--------|-------------|
| Login / Sign Up | Firebase email & password auth |
| Dashboard | Greeting, monthly sessions, check-in CTA, quick actions |
| Check-In | Animated QR code tied to user UID + date; confirm button writes attendance to Firestore |
| Attendance Calendar | Monthly calendar with present days highlighted in gold |
| Drawer Menu | Navigate to all screens, log out |

## App Flow

```
Login
  │
  └─► Dashboard
        ├── [Check In] ──► QR Code Screen ──► Confirm ──► ✅ Calendar updated
        ├── [Attendance] ──► Calendar Screen
        └── [☰] ──► Drawer (Dashboard / Check In / Attendance / Logout)
```

## Setup

### 1. Create a Firebase project

1. Go to [console.firebase.google.com](https://console.firebase.google.com) → New Project
2. Enable **Authentication → Sign-in method → Email/Password**
3. Create a **Firestore Database** (start in test mode)
4. In Project Settings → Your apps → Add a Web app → copy the config

### 2. Paste Firebase config

Open `src/services/firebase.ts` and replace the placeholder values:

```ts
const firebaseConfig = {
  apiKey: 'YOUR_API_KEY',
  authDomain: 'YOUR_PROJECT_ID.firebaseapp.com',
  projectId: 'YOUR_PROJECT_ID',
  ...
};
```

### 3. Install & run

```bash
npm install
npx expo start
```

Scan the QR code with the **Expo Go** app on your phone, or press `a` for Android emulator.

## Firestore Schema

```
users/{uid}/attendance/{YYYY-MM-DD}
  ├── date          Timestamp
  ├── checkedInAt   ServerTimestamp
  └── uid           String
```

## Tech Stack

- **Expo** (SDK 56) + React Native
- **Firebase Auth** — email/password login
- **Firestore** — attendance records per user
- **React Navigation** — drawer + native stack
- **react-native-qrcode-svg** — QR code generation
- **react-native-calendars** — attendance calendar
