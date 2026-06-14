# Check Firestore Schema

Review all Firestore reads and writes in the codebase and summarize the current schema.

## Steps

1. Read all files in `src/services/` to find every `setDoc`, `updateDoc`, `deleteDoc`, `getDoc`, `getDocs`, and `query` call.
2. Trace the collection paths and document shapes used.
3. Output a clean schema summary in this format:

```
Collection: users/{uid}
  Fields: uid, email, displayName, phone, role, membershipType, isActive, joinedAt

Collection: users/{uid}/attendance/{YYYY-MM-DD}
  Fields: date (Timestamp), checkedInAt (ServerTimestamp), uid
```

4. Flag any inconsistencies (e.g. fields written in one place but not another, missing index requirements).
