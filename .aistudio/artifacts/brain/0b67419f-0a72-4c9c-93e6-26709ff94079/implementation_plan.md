# Implementation Plan: Photos, Location & Search Overhaul

## 1. Overview & Objective
Bring the application into full alignment with the specifications:
- Completely eradicate referrals, tips, wallets, and earning features across all views and backend logic.
- Expand photo capacity to 12 images with client-side compression, direct "Add photos" buttons in the profile gallery and Settings, removal capabilities (auto-advancing avatar to the next photo when deleting the primary photo), and the hint "More photos bring more visitors."
- Automate IP-based location detection on login to update state/city dynamically, calculate distance (rounded km) exclusively for subscribers, and allow manual state override with a "Detect now" button in Settings → Privacy.
- Prominently display `@username` under full names on all profile surfaces.
- Introduce a live search box on Discover filtering by name or username (with or without `@`), allowing subscribers to search across Nigeria and presenting free users with "Subscribe to search all of Nigeria" when no local matches are found.

---

## 2. User Review Questions & Alignment
- **Location detection strategy**: Fast IP-based automatic detection on login, falling back cleanly to user selection.
- **Avatar reassignment**: When deleting the main profile photo, the first remaining photo in the gallery is automatically promoted to `photo_url`.

---

## 3. Key Changes by Component

### A. Referrals & Earning Elimination
- Verify and scrub all components (`Login.tsx`, `Settings.tsx`, `Profile.tsx`, `GenderModal.tsx`, `DiscoveryFeed.tsx`, etc.) to ensure:
  - No referral code fields during signup or onboarding.
  - No wallet balance, tips, payouts, or withdrawal dialogs.
  - Subscription fee remains strictly ₦2,000 monthly.

### B. Photos (Up to 12 Photos & Photo Management)
- **Profile (`src/pages/Profile.tsx`)**:
  - Update photo limit constant from 6 to 12.
  - Add styled "Add photos" trigger button in the profile gallery header and grid.
  - Render remove button on each photo tile.
  - If the removed photo matches `photo_url`, automatically set `photo_url = nextPhoto || ''`.
  - Add the designated hint text: *"More photos bring more visitors."*
- **Settings (`src/pages/Settings.tsx`)**:
  - Add "Add photos" gallery management up to 12 photos with compression and delete triggers.
- **Onboarding (`src/components/GenderModal.tsx`)**:
  - Ensure users can add up to 12 photos during initial setup if desired (min 2 photos to activate).
- **Compression (`src/lib/imageCompression.ts` / upload helpers)**:
  - Compress client-side (max 1280px, WebP/JPEG quality 0.8) to maintain fast upload speeds and avoid payload limit issues.

### C. Automatic Location & Subscriber-Only Distance
- **Location Sync Utility (`src/lib/location.ts`)**:
  - Automatically detect IP location on login (querying free IP-API or server endpoint for Nigerian states/cities with coordinates).
  - Update Firestore profile `state`, `city`, and coarse coordinates `coarse_lat`, `coarse_lng`.
- **Settings → Privacy (`src/pages/Settings.tsx`)**:
  - Provide Nigerian state dropdown selector.
  - Provide a "Detect now" button adjacent to the state selector with loading spinner and feedback toast.
- **Distance Calculation**:
  - Calculate haversine distance between current user and target member.
  - Display rounded kilometers (e.g., `12 km away`) strictly to subscribers (`is_subscribed === true`).
  - For free users, display a lock icon indicating distance is locked.
- **Discovery Filtering (`src/components/DiscoveryFeed.tsx`)**:
  - Free users: Discovery feed strictly filtered to their current state.
  - Subscribers: Can select any state in Nigeria or browse all Nigeria.

### D. Username on Profile
- Ensure `@username` is rendered under the full name on:
  - User's own profile (`Profile.tsx`)
  - Viewed member profiles (`Profile.tsx`, `PublicProfile.tsx`, `MemberProfileModal.tsx`)

### E. Live Search on Discover
- **Search Component (`src/components/DiscoveryFeed.tsx`)**:
  - Real-time search input at the top of Discover with search icon and clear button.
  - Match against `display_name` and `username` (ignoring leading `@`, case-insensitive).
  - Free users search within their current state; if 0 results, show empty state message: *"Subscribe to search all of Nigeria"*.
  - Subscribers search across all Nigerian states simultaneously.

---

## 4. Verification & Testing Steps
1. **Compilation & Linting**: Run `compile_applet` and `lint_applet` to ensure zero type errors.
2. **Account Onboarding Test**:
   - Verify fresh account starts with clean 0 stats and no referral fields.
   - Upload up to 12 photos, verify removal promotes the next image to avatar.
3. **Location Test**:
   - Verify auto-IP location updates state/city on login.
   - Test "Detect now" and manual state selection in Settings → Privacy.
4. **Subscription & Distance / Search Test**:
   - Free account: Search works within local state; shows "Subscribe to search all of Nigeria" when no matches found; distance shows locked.
   - Subscribed account: Shows rounded km distance and searches nationwide.
