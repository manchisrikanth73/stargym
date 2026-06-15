# StarGym — Test Plan

> No automated test runner is configured. These are manual test cases to verify before each deployment. Priority: P1 = must pass, P2 = should pass, P3 = nice to have.

---

## 1. Authentication

| ID | Test Case | Steps | Expected | Priority |
|---|---|---|---|---|
| T-AUTH-01 | Sign up — new user | Fill name, email, password, confirm password, age, gender. Tap Create Account. | User signed in, redirected to Dashboard. Firestore doc created with age + gender. | P1 |
| T-AUTH-02 | Sign up — password mismatch | Enter different values in Password and Confirm Password. Tap Create Account. | Error: "Passwords do not match." No account created. | P1 |
| T-AUTH-03 | Sign up — existing email, same password | Sign up with an already-registered email and the correct password. | User silently signed in. No error shown. | P1 |
| T-AUTH-04 | Sign up — existing email, wrong password | Sign up with an already-registered email and wrong password. | Inline banner: "This email is already registered" with Sign In / Forgot Password buttons. | P1 |
| T-AUTH-05 | Sign in — valid credentials | Enter correct email and password. Tap Log In. | User signed in and redirected to Dashboard. | P1 |
| T-AUTH-06 | Sign in — wrong password | Enter incorrect password. Tap Log In. | Error: "Invalid email or password." | P1 |
| T-AUTH-07 | Forgot password | Enter registered email, tap Forgot Password. | Alert: reset email sent. Email received in inbox. | P2 |
| T-AUTH-08 | Sign up — missing name | Leave Full Name blank. Tap Create Account. | Error: "Please enter your full name." | P1 |

---

## 2. Member Dashboard

| ID | Test Case | Steps | Expected | Priority |
|---|---|---|---|---|
| T-DASH-01 | Active member — normal state | Sign in as active member with valid dates. | Check-in card visible and enabled. No banners. | P1 |
| T-DASH-02 | Expired membership auto-deactivation | Set `activationEndDate` to yesterday in admin. Sign in as that member. | "Membership Expired" banner shown in red. Check-in card disabled. `isActive` set to false in Firestore. | P1 |
| T-DASH-03 | Inactive pending member | Admin sets member inactive with no end date. Member signs in. | "Account Pending Approval" banner. Check-in card locked. | P1 |
| T-DASH-04 | Membership card | Member has `activationStartDate` and `activationEndDate` set. | Membership card shows type badge, start date, end date in correct format. | P1 |
| T-DASH-05 | Monthly count | Member has 5 check-ins this month. | Stat card shows 5 for current month. | P2 |

---

## 3. Check-In

| ID | Test Case | Steps | Expected | Priority |
|---|---|---|---|---|
| T-CI-01 | Scan gym QR — web | Scan gym QR with phone. App opens with `?checkin=` param. | Check-in success screen shown immediately. Attendance written to Firestore. `checkins/` doc written. | P1 |
| T-CI-02 | In-app scanner — valid QR | Tap Check In. Camera opens. Scan gym QR. | Immediate success. | P1 |
| T-CI-03 | Duplicate check-in | Check in twice on same day. | Second attempt returns false. Member sees "Already checked in!" alert. | P1 |
| T-CI-04 | Inactive member tries to check in | Inactive member taps Check In card. | Alert: "Account pending" or "Membership Expired". No check-in written. | P1 |
| T-CI-05 | Live admin feed update | Admin watches dashboard. Member checks in. | Check-in appears in admin feed within ~2 seconds. No page refresh. | P1 |

---

## 4. Admin — Member Management

| ID | Test Case | Steps | Expected | Priority |
|---|---|---|---|---|
| T-MEM-01 | Add member manually | Admin taps +. Fills name, email, phone, age, gender, membership, dates. Saves. | Member appears in list. Firestore doc created. | P1 |
| T-MEM-02 | Edit member — future end date | Admin sets end date to tomorrow. Saves. | Member `isActive = true`. Toggle disabled and shows "Auto-activated" hint. | P1 |
| T-MEM-03 | Edit member — past end date | Admin sets end date to last week. Saves. | Member `isActive = false`. Toggle disabled and shows "Auto-deactivated" hint. | P1 |
| T-MEM-04 | Delete member | Admin taps trash icon. Confirms. | Member removed from list. Firestore doc deleted. Firebase Auth account still exists. | P1 |
| T-MEM-05 | Search members | Admin types partial name or email in search box. | List filters in real time to matching members. | P2 |
| T-MEM-06 | Edit age and gender | Admin opens member edit. Changes age and gender. Saves. | Values updated in Firestore. Visible in member's Settings page (readonly). | P2 |

---

## 5. Workout Access

| ID | Test Case | Steps | Expected | Priority |
|---|---|---|---|---|
| T-WO-01 | Basic member locked | Admin sets Basic = OFF for workout access. Basic member opens Workouts. | Lock screen shown: "Premium & VIP Only". Drawer shows lock icon with correct hint text. | P1 |
| T-WO-02 | Toggle updates live | Admin toggles Basic workout access ON while Basic member is on Workouts screen. | Workout content appears immediately without page refresh. | P1 |
| T-WO-03 | Drawer hint updates live | Admin changes workout access config. Keep drawer open in member session. | Hint text under Workouts updates in real time. | P2 |
| T-WO-04 | Workout hidden for admin | Admin opens drawer. | Workouts item not present. | P1 |

---

## 6. Settings

| ID | Test Case | Steps | Expected | Priority |
|---|---|---|---|---|
| T-SET-01 | Member saves profile | Change first name. Tap Save Changes. | Success banner "All changes applied successfully." Name updated. | P1 |
| T-SET-02 | Member cancels changes | Change name. Tap Cancel. | Fields restored to last saved values. | P1 |
| T-SET-03 | Member sees age/gender readonly | Member opens Settings. | Age and gender shown, not editable (dimmed). | P2 |
| T-SET-04 | Admin sees no age/gender | Admin opens Settings. | Age and gender fields not present. | P2 |
| T-SET-05 | Admin saves prices + profile | Admin edits name and price. Tap Save. | Both profile and price saved. Success banner shown. | P1 |
| T-SET-06 | Admin workout toggle | Admin toggles VIP workout access. | Saved immediately. No Save button click needed. | P1 |

---

## 7. Edge Cases & Security

| ID | Test Case | Steps | Expected | Priority |
|---|---|---|---|---|
| T-SEC-01 | Member cannot access Admin screen | Member navigates directly to `/Admin`. | Screen not rendered. Admin item not in drawer. | P1 |
| T-SEC-02 | Member cannot read other users | Check Firestore rules. Member queries `users/otherUid`. | Permission denied. | P1 |
| T-SEC-03 | Non-admin cannot write gymConfig | Member attempts to write to `gymConfig/membership`. | Permission denied. | P1 |
| T-SEC-04 | Session persists on refresh | Member signs in. Refreshes browser. | Stays signed in. Dashboard loads. | P1 |
| T-SEC-05 | Admin-only manual member | Admin adds member without email confirmation. | Works. Member can be given credentials separately. | P2 |
