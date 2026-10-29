# Firestore Security Specification & Invariants

## Data Invariants
1. **User Identity Invariant**: An authenticated user can only modify their own `/users/{userId}` document (`request.auth.uid == userId`).
2. **Bootstrapped Admin Invariant**: User `krusodi.ns@gmail.com` with `email_verified == true` is granted Administrator access.
3. **School Data Invariant**: Documents in `/schools/{schoolId}` must conform to valid lengths and structure, requiring user authentication with email verification.
4. **Session Invariant**: Sync codes in `/classroom_sessions/{sessionId}` must have an ID conforming to `^[a-zA-Z0-9_\-]+$` and cannot exceed length limits.
5. **Denial of Wallet Protection**: All string fields have size boundaries (`size() <= 100`, `size() <= 200`, etc.).

## The Dirty Dozen Payloads (Malicious Payloads to Reject)
1. Unauthenticated write to `/schools/data69-school`.
2. Spoofed Admin update without `email_verified == true`.
3. Writing a user record to `/users/someone_else_uid` with another user's UID.
4. Injecting oversized junk payload into `schoolName` (> 200 chars).
5. Attempting to write arbitrary ghost fields (`isRoot: true`) in `/schools/data69-school`.
6. Reading `/users/{userId}` without being that user or the admin.
7. Attempting to delete `/schools/data69-school` without admin privileges.
8. Writing an invalid sessionId path with special injection characters.
9. Modifying immutable field `id` during an update on `/schools/data69-school`.
10. Writing to catch-all unknown collection `/{document=**}`.
11. Bypassing size restrictions on session codes.
12. Attempting to write invalid types to `appData`.
