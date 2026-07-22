# Native Phone and WhatsApp Authentication Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the broken custom SMS/WhatsApp session broker with native phone OTP authentication that preserves existing identities and returns genuine refreshable sessions.

**Architecture:** A typed `phoneAuthService` owns native Auth calls and stable error mapping. A shared reducer-backed hook owns modal state for both SMS and WhatsApp. Authenticated phone linking uses the native SMS phone-change flow. Phone entry points are hidden while the disabled-by-default rollout flag is false; the application never routes users into the known-broken legacy flow. Legacy Edge Functions remain deployed only for rollback evidence until production smoke tests pass, then are quarantined.

**Tech Stack:** React 18, TypeScript 5, `@supabase/supabase-js` 2.49.8, `@supabase/auth-js` 2.69.1, Vitest 2.1.9, Vite 5

## Global Constraints

- Existing phone identities must preserve the same `auth.users.id`, roles, organization membership, history, and data.
- Sign-in must set `shouldCreateUser: false`; only explicit signup may set it to `true`.
- SMS and WhatsApp differ only by the `channel` value used to deliver a login/signup OTP.
- Phone linking is SMS-only because the installed client exposes no WhatsApp channel option for phone changes.
- Never log phone numbers, OTPs, access tokens, refresh tokens, raw infrastructure errors, or provider identifiers.
- Never use user-editable metadata for authorization.
- Native Auth may become the production default only after a real session and refresh smoke test passes for both login channels.
- Email/password authentication must remain unchanged.

---

### Task 1: Add a deterministic unit-test harness

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `vitest.config.ts`

**Interfaces:**
- Consumes: existing Vite/TypeScript project configuration
- Produces: `npm run test:unit -- <path>` for deterministic Node-based tests

- [ ] **Step 1: Install the pinned test runner**

Run:

```bash
npm install --save-dev vitest@2.1.9
```

Expected: `vitest` is added to `devDependencies` and the lockfile changes only for its dependency graph.

- [ ] **Step 2: Add the test script**

Add to `package.json` scripts:

```json
"test:unit": "vitest run"
```

- [ ] **Step 3: Add deterministic Vitest configuration**

Create `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    clearMocks: true,
    restoreMocks: true,
  },
});
```

- [ ] **Step 4: Verify the harness starts successfully**

Run:

```bash
npm run test:unit -- --passWithNoTests
```

Expected: PASS with no discovered tests.

- [ ] **Step 5: Commit the test harness**

```bash
git add package.json package-lock.json vitest.config.ts
git commit -m "test: add deterministic unit test harness"
```

### Task 2: Implement the native phone-auth boundary with TDD

**Files:**
- Create: `src/services/phoneAuthService.test.ts`
- Create: `src/services/phoneAuthService.ts`

**Interfaces:**
- Consumes: `supabase` from `src/services/authService.ts`
- Produces:

```ts
export type PhoneAuthIntent = 'sign_in' | 'sign_up' | 'link';
export type PhoneAuthChannel = 'sms' | 'whatsapp';
export type PhoneAuthErrorCode =
  | 'invalid_phone'
  | 'invalid_or_expired_code'
  | 'account_unavailable'
  | 'rate_limited'
  | 'channel_unavailable'
  | 'session_failed'
  | 'network_error'
  | 'unexpected_error';

export interface StartPhoneAuthInput {
  phone: string;
  intent: PhoneAuthIntent;
  channel: PhoneAuthChannel;
  profile?: { displayName?: string };
  captchaToken?: string;
}

export interface VerifyPhoneAuthInput {
  phone: string;
  intent: PhoneAuthIntent;
  code: string;
}

export function normalizePhone(countryDialCode: string, localNumber: string): string;
export function createPhoneAuthService(client?: PhoneAuthClient): {
  start(input: StartPhoneAuthInput): Promise<void>;
  verify(input: VerifyPhoneAuthInput): Promise<Session>;
};
```

- [ ] **Step 1: Write failing tests for intent/channel payloads**

Create tests asserting these exact calls:

```ts
expect(signInWithOtp).toHaveBeenCalledWith({
  phone: '+26771234567',
  options: {
    channel: 'whatsapp',
    shouldCreateUser: false,
    data: undefined,
    captchaToken: undefined,
  },
});

expect(signInWithOtp).toHaveBeenCalledWith({
  phone: '+26771234567',
  options: {
    channel: 'sms',
    shouldCreateUser: true,
    data: { display_name: 'Ada Lovelace' },
    captchaToken: undefined,
  },
});
```

Also assert that `link` calls `getSession()` and then `updateUser({ phone })`, never `signInWithOtp`.

- [ ] **Step 2: Run the focused tests and verify RED**

Run:

```bash
npm run test:unit -- src/services/phoneAuthService.test.ts
```

Expected: FAIL because `phoneAuthService.ts` does not exist.

- [ ] **Step 3: Implement normalized native start operations**

Implement `normalizePhone` with `^\+[1-9]\d{6,14}$` validation. Implement `start()` so `sign_in` and `sign_up` use `signInWithOtp`, while `link` first requires an authenticated session and then calls `updateUser({ phone })`.

Errors leave the service only as `PhoneAuthError` instances with stable codes and neutral messages.

- [ ] **Step 4: Run the focused tests and verify GREEN**

Run the Task 2 focused command. Expected: all start-operation tests pass.

- [ ] **Step 5: Write failing tests for verification and session invariants**

Assert:

```ts
expect(verifyOtp).toHaveBeenCalledWith({
  phone: '+26771234567',
  token: '123456',
  type: 'sms',
});
```

For `link`, expect `type: 'phone_change'`. Reject responses missing any of `session.access_token`, `session.refresh_token`, or `session.user.id` with `session_failed`.

- [ ] **Step 6: Run the focused tests and verify RED**

Expected: FAIL because `verify()` is incomplete.

- [ ] **Step 7: Implement verification and error mapping**

Implement `verify()` using the native OTP operation and validate the returned session. Map status/message patterns to the stable error taxonomy without forwarding raw errors or logging secrets.

- [ ] **Step 8: Run the focused tests and verify GREEN**

Expected: all service tests pass with no warnings.

- [ ] **Step 9: Commit the service**

```bash
git add src/services/phoneAuthService.ts src/services/phoneAuthService.test.ts
git commit -m "feat: add native phone authentication service"
```

### Task 3: Add the shared phone-auth state machine with TDD

**Files:**
- Create: `src/hooks/usePhoneAuthFlow.test.ts`
- Create: `src/hooks/usePhoneAuthFlow.ts`

**Interfaces:**
- Consumes: `createPhoneAuthService`, `PhoneAuthIntent`, and `PhoneAuthChannel`
- Produces:

```ts
export type PhoneAuthStatus =
  | 'collecting_phone'
  | 'sending_code'
  | 'awaiting_code'
  | 'verifying_code'
  | 'authenticated'
  | 'linked'
  | 'failed';

export interface PhoneAuthFlowState {
  status: PhoneAuthStatus;
  phone: string | null;
  error: string | null;
}

export function phoneAuthReducer(
  state: PhoneAuthFlowState,
  event: PhoneAuthFlowEvent,
): PhoneAuthFlowState;
```

- [ ] **Step 1: Write reducer tests for all legal and illegal transitions**

Tests must prove:

- `SEND` moves collecting to sending;
- `SENT` moves sending to awaiting;
- `VERIFY` moves awaiting to verifying;
- `VERIFIED` moves verifying to authenticated or linked by intent;
- `CHANGE_PHONE` clears phone, code state, and error;
- duplicate `SEND`/`VERIFY` events while busy return the unchanged state;
- invalid transition events return the unchanged state.

- [ ] **Step 2: Run reducer tests and verify RED**

Expected: FAIL because the hook module does not exist.

- [ ] **Step 3: Implement the reducer and thin hook**

The hook exposes `start`, `verify`, `changePhone`, `status`, `error`, and `isBusy`. It delegates all network/authentication work to the injected service and never logs raw errors.

- [ ] **Step 4: Run reducer tests and verify GREEN**

Expected: all state-machine tests pass.

- [ ] **Step 5: Commit the state machine**

```bash
git add src/hooks/usePhoneAuthFlow.ts src/hooks/usePhoneAuthFlow.test.ts
git commit -m "feat: add shared phone auth state machine"
```

### Task 4: Replace modal and settings call sites

**Files:**
- Modify: `src/components/PhoneAuthModal.tsx`
- Modify: `src/components/WhatsAppAuthModal.tsx`
- Modify: `src/components/Settings/PhoneLinkingSettings.tsx`
- Modify: `src/components/LoginModal.tsx`
- Modify: `src/components/SignUpModal.tsx`
- Modify: `src/vite-env.d.ts`

**Interfaces:**
- Consumes: `usePhoneAuthFlow` and `createPhoneAuthService`
- Produces: explicit sign-in/signup behavior for both channels and native SMS phone linking

- [ ] **Step 1: Add the explicit mode to `PhoneAuthModal`**

Use the same prop contract as WhatsApp:

```ts
mode?: 'sign-up' | 'sign-in';
```

Login passes `mode="sign-in"`; signup passes `mode="sign-up"`. Names are required and sent only during signup.

- [ ] **Step 2: Replace custom fetch/session parsing in both auth modals**

Both modals call the shared hook. SMS passes `channel: 'sms'`; WhatsApp passes `channel: 'whatsapp'`. Remove custom function URLs, manual `setSession`, refresh-token fallback, reload fallback, and sensitive console output.

- [ ] **Step 3: Replace phone-linking custom calls**

`PhoneLinkingSettings` uses `start({ intent: 'link', channel: 'sms' })` followed by `verify({ intent: 'link' })`. Display success only after native verification returns a session for the current user ID.

- [ ] **Step 4: Enforce the rollout flag at entry points**

Add the typed environment contract:

```ts
interface ImportMetaEnv {
  readonly VITE_NATIVE_PHONE_AUTH_ENABLED?: string;
}
```

When the value is not exactly `"true"`, hide SMS/WhatsApp login and signup buttons and disable phone linking. Do not call or fall back to any legacy verification function.

- [ ] **Step 5: Verify TypeScript and focused tests**

Run:

```bash
npm run test:unit
npx tsc -b
```

Expected: all tests pass and TypeScript reports zero errors.

- [ ] **Step 6: Commit the call-site migration**

```bash
git add src/components/PhoneAuthModal.tsx src/components/WhatsAppAuthModal.tsx src/components/Settings/PhoneLinkingSettings.tsx src/components/LoginModal.tsx src/components/SignUpModal.tsx src/vite-env.d.ts
git commit -m "fix: use native sessions for phone authentication"
```

### Task 5: Validate production configuration and roll out safely

**Files:**
- Modify: `.env.example` if present
- Modify: deployment environment configuration only after successful probes

**Interfaces:**
- Consumes: native phone provider configuration and `VITE_NATIVE_PHONE_AUTH_ENABLED`
- Produces: confirmed channel availability and explicit rollout state

- [ ] **Step 1: Add the disabled-by-default flag contract**

Document:

```dotenv
VITE_NATIVE_PHONE_AUTH_ENABLED=false
```

The application must not silently fall back from native Auth after a native error.
While this value is false, phone authentication entry points remain unavailable and email authentication remains unchanged.

- [ ] **Step 2: Build and preview locally**

Run:

```bash
npm run lint
npm run build
```

Expected: zero lint warnings/errors and a successful production build.

- [ ] **Step 3: Probe production channel configuration without account creation**

Use a deliberately invalid E.164 destination with `shouldCreateUser: false` for SMS and WhatsApp. Expected: a validation/channel response rather than a missing-provider configuration error. Do not log the destination or raw provider response.

- [ ] **Step 4: Run real existing-account smoke tests**

After explicit action-time authorization to send codes to the designated test number:

- request and verify SMS sign-in;
- request and verify WhatsApp sign-in;
- assert both sessions have refresh tokens;
- assert both session user IDs equal the pre-test existing user ID;
- refresh each session and assert the user ID remains unchanged;
- sign out and confirm protected access fails.

- [ ] **Step 5: Enable production only after both channel gates pass**

Set `VITE_NATIVE_PHONE_AUTH_ENABLED=true`, deploy, and repeat the browser-level login smoke test. If either channel fails, leave the flag false and report the exact release gate without claiming completion.

- [ ] **Step 6: Commit rollout configuration documentation**

```bash
git add .env.example
git commit -m "docs: add native phone auth rollout flag"
```

### Task 6: Quarantine the legacy verification path

**Files:**
- Modify: `supabase/functions/start-phone-verification/index.ts`
- Modify: `supabase/functions/check-phone-verification/index.ts`
- Modify: `supabase/functions/start-whatsapp-verification/index.ts`
- Modify: `supabase/functions/check-whatsapp-verification/index.ts`
- Create: new Supabase migration generated with `supabase migration new quarantine_legacy_phone_verifications`

**Interfaces:**
- Consumes: successful production native-auth evidence from Task 5
- Produces: legacy endpoints returning neutral `410 Gone` and revoked public table writes

- [ ] **Step 1: Write a failing contract test for the retired handler**

Extract a shared handler returning exactly:

```json
{"error":"This authentication path has been retired. Please update the application and try again."}
```

with status `410`, no provider identifier, and no request-body logging.

- [ ] **Step 2: Verify the retirement test fails**

Expected: FAIL because the current handlers still execute the custom verification flow.

- [ ] **Step 3: Implement and deploy the neutral retirement handlers**

Deploy all four functions with their current JWT-verification setting only after the native path is live. Verify every endpoint returns `410` and contains no raw infrastructure details.

- [ ] **Step 4: Generate and apply the write-revocation migration**

The migration revokes `INSERT`, `UPDATE`, and `DELETE` on `public.phone_verifications` from `anon` and `authenticated`, drops permissive write policies, retains RLS, and leaves service-role audit access intact.

- [ ] **Step 5: Run security advisors and verify production privileges**

Expected: no new security advisory and public roles cannot mutate `phone_verifications`.

- [ ] **Step 6: Commit quarantine changes**

```bash
git add supabase/functions/start-phone-verification supabase/functions/check-phone-verification supabase/functions/start-whatsapp-verification supabase/functions/check-whatsapp-verification supabase/migrations
git commit -m "security: retire legacy phone verification path"
```

### Task 7: Final verification, documentation, and communications

**Files:**
- Create: `docs/auth/phone-whatsapp-authentication.md`
- Modify: Samuel Gmail draft/thread
- Create or update: corresponding Notion engineering page

**Interfaces:**
- Consumes: verified test/build/deployment evidence
- Produces: truthful operational documentation and stakeholder communication

- [ ] **Step 1: Run the complete local verification suite**

```bash
npm run test:unit
npx tsc -b
npm run lint
npm run build
git diff --check
```

Expected: every command passes with no warnings attributable to this change.

- [ ] **Step 2: Write operational documentation**

Document architecture, identity invariants, configuration ownership, supported flows, error behavior, privacy/logging rules, smoke-test evidence, rollback, and legacy quarantine. Mark any unverified channel `[TO CONFIRM]`.

- [ ] **Step 3: Update Samuel's Gmail draft truthfully**

State only the verified result. Distinguish UI availability, OTP delivery, genuine session issuance, refresh validation, and any remaining rollout gate. Save as a draft unless the user separately asks to send it.

- [ ] **Step 4: Publish the same source-of-truth summary to Notion**

Create or update one engineering page and include repository doc/commit references. Do not include phone numbers, OTPs, tokens, credentials, internal endpoints, or provider identifiers.

- [ ] **Step 5: Commit repository documentation**

```bash
git add docs/auth/phone-whatsapp-authentication.md
git commit -m "docs: document verified phone authentication"
```

- [ ] **Step 6: Report completion status**

Report committed work, deployed work, production verification, external draft/page updates, remaining gates, and rollback state separately. Do not call the objective complete unless both channels return and refresh genuine sessions for the same existing identity.
