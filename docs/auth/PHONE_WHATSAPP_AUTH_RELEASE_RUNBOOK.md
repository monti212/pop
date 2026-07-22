# Phone and WhatsApp Authentication Release Runbook

Date: 2026-07-22  
Branch: `fix/native-phone-whatsapp-auth`  
Owner: Uhuru AI engineering

## Current status

The application implementation is complete and locally validated. Production activation remains intentionally disabled until a real one-time-code sign-in proves account continuity, secure session creation, refresh restoration, and sign-out for both SMS and WhatsApp.

Email sign-in remains unchanged. The legacy phone verification routes must not be removed or re-enabled in the UI before the production gate passes.

## User outcome

Users can:

- sign in to an existing account by SMS or WhatsApp without a password;
- create a new account by SMS or WhatsApp with their name attached correctly;
- resend a verification code or change their number without restarting the flow; and
- link a verified phone number to the account they are already using.

SMS and WhatsApp share one authentication state machine. The channel controls code delivery only; it does not choose identity or session behavior.

## Invariants

1. Sign-in uses `shouldCreateUser: false`; it never creates an account.
2. Sign-up uses `shouldCreateUser: true`; it may create an account.
3. A verified code must return a real access token, refresh token, and canonical user ID.
4. Phone linking uses the phone-change verification type and must return the current user's ID.
5. Existing roles, memberships, history, and data remain attached to the same canonical user ID.
6. Phone numbers, codes, tokens, credentials, internal endpoints, and raw infrastructure errors are never logged.
7. The public UI remains hidden while `VITE_NATIVE_PHONE_AUTH_ENABLED` is not exactly `true`.

## Implementation map

- `src/services/phoneAuthService.ts` — typed channel/intent contract, normalization, stable errors, native session validation.
- `src/hooks/usePhoneAuthFlow.ts` — reducer-backed state machine, duplicate-submit protection, resend, and change-number transitions.
- `src/components/PhoneOtpAuthModal.tsx` — shared accessible SMS/WhatsApp experience.
- `src/components/PhoneAuthModal.tsx` — SMS compatibility wrapper.
- `src/components/WhatsAppAuthModal.tsx` — WhatsApp compatibility wrapper.
- `src/components/LoginModal.tsx` — gated SMS/WhatsApp sign-in entry points.
- `src/components/SignUpModal.tsx` — gated SMS/WhatsApp sign-up entry points.
- `src/components/Settings/PhoneLinkingSettings.tsx` — authenticated phone-change flow.

## Verified evidence

- `npm run test:unit` — 18 tests passed.
- `npm run lint:auth` — passed with zero warnings.
- `npx tsc -b` — passed.
- `npm run build` — production bundle passed.
- Local browser check with the flag enabled:
  - SMS and WhatsApp entry points rendered;
  - sign-in requested a phone number only;
  - sign-up requested first and last name;
  - invalid phone input was rejected before a network request; and
  - no new configured-client errors appeared.
- Live Uhuru Cloud settings report phone authentication enabled.
- The live new-account trigger reads the `name` metadata key; the client contract and unit test were corrected to match it.

The repository-wide lint command now executes but still reports a large pre-existing backlog outside this authentication scope. `lint:auth` is the strict release check for the changed surface; the global debt is not evidence that this feature failed its focused check.

## Mandatory production smoke test

Use an existing phone account for sign-in so the test cannot create a new identity.

### SMS

1. Record the existing canonical user ID through an authorized admin view without copying it into chat, logs, or documentation.
2. Start sign-in with `intent: sign_in`, `channel: sms`, and `shouldCreateUser: false`.
3. Enter the received one-time code.
4. Assert the returned session contains non-empty access and refresh tokens.
5. Assert the returned user ID equals the recorded ID.
6. Refresh the browser and assert the session restores to the same user.
7. Sign out and confirm protected content is no longer accessible.

### WhatsApp

Repeat the SMS sequence with `channel: whatsapp`. The verification type remains `sms` because the delivery channel does not change the phone-login verification contract.

### Link current account

1. Sign in using the existing email route.
2. Start phone linking from Settings.
3. Verify the code.
4. Assert the returned user ID equals the already authenticated user ID.
5. Assert the total user count did not increase.
6. Sign out, sign back in with the linked phone, refresh, and confirm the same history and role are present.

## Activation

Only after every smoke-test assertion passes:

1. Set `VITE_NATIVE_PHONE_AUTH_ENABLED=true` in the production build environment.
2. Deploy the reviewed commit.
3. Repeat SMS sign-in, WhatsApp sign-in, refresh restoration, and sign-out on the production hostname.
4. Inspect authentication logs for duplicate identities, unexpected account creation, or raw service errors.
5. Record the deployment identifier and validation timestamp in this runbook and the Notion page.

## Legacy quarantine

After native production validation:

1. Replace the four legacy verification route bodies with neutral `410 Gone` responses.
2. Preserve their current authentication boundary during the quarantine deploy.
3. Revoke obsolete public writes to the legacy verification store using a reviewed migration.
4. Verify each retired route returns only the neutral response and logs no request body.
5. Delete the retired routes and store only after the rollback window closes.

## Rollback

Set `VITE_NATIVE_PHONE_AUTH_ENABLED=false` and redeploy. This hides phone entry points immediately while preserving email sign-in. Do not route users back to the legacy client implementation.

## Communication status

- The Samuel and Nelson Gmail draft now includes the SMS/WhatsApp access update and explicitly states that activation follows the final secure-session check. It has not been sent.
- The Notion page `GreyEd Phone and WhatsApp Authentication — Release Runbook` is stored under the Pencils of Promise project.

## Remaining external input

Production completion requires the intended test phone number and the one-time codes delivered to that device. Those codes must be entered only into the authorized authentication flow and must never be placed in commits, documentation, email, or logs.
