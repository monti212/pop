# Native Phone and WhatsApp Authentication Design

**Date:** 2026-07-22
**Status:** Approved for implementation
**Scope:** Login, signup, and authenticated phone linking through SMS and WhatsApp

## Outcome

Replace the parallel custom verification/session flow with the authentication platform's native phone OTP flow. SMS and WhatsApp remain delivery channels; the authentication platform owns identity resolution, OTP verification, access-token issuance, refresh-token rotation, and session revocation.

The result must let a person:

- sign in to the exact existing account associated with a verified phone number;
- create one new account only from an explicit signup flow;
- link a verified phone number to the account they are already using;
- receive the OTP through either SMS or WhatsApp; and
- receive a genuine, refreshable application session after successful verification.

## Frontier Build Test

### Baseline

A competent implementation would call native phone OTP APIs from each modal and remove the broken session parsing.

### Frontier

This design treats delivery channel, user intent, and authentication state as separate dimensions. One typed state machine owns both channels, while the authentication platform remains the sole issuer of identity and session state.

### First principles

An OTP delivery provider proves possession of a phone number. It does not, by itself, create an application identity or a revocable refreshable session. Those responsibilities must not be duplicated in Edge Functions.

### Original mechanism

The client uses an explicit `PhoneAuthIntent` (`sign_in`, `sign_up`, or `link`) and a separate `PhoneAuthChannel` (`sms` or `whatsapp`). This prevents the current category error in which delivery-channel-specific functions silently choose identity behavior.

### Compounding advantage

Every future phone delivery channel can reuse the same identity state machine, error taxonomy, analytics, and test suite. Authentication reliability improves once rather than separately for each channel.

### Category potential

This is infrastructure, not a category-defining product feature. Its strategic value is trustworthy low-friction access in mobile-first environments without fragmenting user identity or institutional data.

### Craftsmanship

Completion requires typed interfaces, deterministic state transitions, neutral errors, replay-resistant native OTP verification, production configuration validation, regression tests, and a proven refreshable session.

## Invariants

1. A phone number that belongs to an existing account authenticates that exact account. Roles, organization membership, history, and data must remain attached to the same user ID.
2. Sign-in never creates an account.
3. Signup may create an account, but never creates a duplicate for a phone number already registered.
4. Linking requires a valid current session and changes only that authenticated account.
5. A successful UI state requires a real session containing both access and refresh tokens and a user ID matching the resolved account.
6. SMS and WhatsApp differ only by delivery channel.
7. No client receives service credentials, internal endpoints, raw infrastructure errors, or provider identifiers.
8. Existing email/password access must continue to work unchanged.
9. The legacy custom verification functions are not retired until the native production path passes its smoke tests.

## Architecture

### Client service

Create `src/services/phoneAuthService.ts` as the only browser interface for phone authentication.

```ts
export type PhoneAuthIntent = 'sign_in' | 'sign_up' | 'link';
export type PhoneAuthChannel = 'sms' | 'whatsapp';

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
```

The service normalizes input, invokes native Auth methods, validates returned sessions, and maps infrastructure errors to the application error taxonomy. It does not own modal state or presentation copy.

### UI state machine

Create a shared hook, `src/hooks/usePhoneAuthFlow.ts`, used by `PhoneAuthModal` and `WhatsAppAuthModal`. `PhoneLinkingSettings` reuses the service's normalization, error mapping, and session validation, but keeps its separate authenticated phone-change state because the installed native client does not expose a WhatsApp channel option for phone changes.

States are:

```text
collecting_phone
  -> sending_code
  -> awaiting_code
  -> verifying_code
  -> authenticated | linked | failed
```

Only valid transitions are permitted. Repeated submit actions while a request is in flight are ignored. Changing the phone number invalidates the local verification state.

### Native Auth operations

For sign-in and signup:

```ts
supabase.auth.signInWithOtp({
  phone,
  options: {
    channel,
    shouldCreateUser: intent === 'sign_up',
    data: intent === 'sign_up' ? profileMetadata : undefined,
    captchaToken,
  },
});
```

Both SMS and WhatsApp codes are verified with the native mobile OTP operation:

```ts
supabase.auth.verifyOtp({ phone, token: code, type: 'sms' });
```

For linking, the signed-in user first requests an SMS phone change with `updateUser({ phone })`, then verifies it using `type: 'phone_change'`. The current session must be validated before either step. WhatsApp delivery applies to sign-in and signup only unless a later supported native phone-change API adds an explicit WhatsApp channel.

## Identity and data behavior

- `auth.users.id` remains the canonical user identity.
- `auth.users.phone` remains the canonical phone identity.
- `user_profiles` is not queried to resolve authentication identity.
- Profile metadata supplied during signup is descriptive only and must never authorize roles or organizational access.
- Any administrative phone display must derive from an authorized server-side view or RPC, not from a duplicated client-writable identity field.
- Existing rows created by the custom flow are audited before removal or reconciliation. No automatic merge occurs based only on similar names or emails.

## Security boundaries

### Browser

The browser may use only the publishable client configuration. It never receives privileged keys or calls a privileged identity-resolution endpoint.

### Authentication platform

The authentication platform owns account uniqueness, OTP expiration, OTP replay protection, identity lookup, session issuance, refresh-token rotation, and session revocation.

### Abuse controls

- Pass a CAPTCHA token when CAPTCHA is enabled.
- Preserve platform OTP rate limits.
- Disable resend controls during the cooldown and show the remaining wait time.
- Do not reveal whether an unknown phone number has an account; sign-in failures use neutral guidance.
- Record only non-sensitive operational events. Never log phone numbers, OTP values, access tokens, refresh tokens, or raw upstream errors.

## Error taxonomy

The service maps native errors to stable application codes:

```ts
type PhoneAuthErrorCode =
  | 'invalid_phone'
  | 'invalid_or_expired_code'
  | 'account_unavailable'
  | 'rate_limited'
  | 'channel_unavailable'
  | 'session_failed'
  | 'network_error'
  | 'unexpected_error';
```

Sign-in must not disclose whether `account_unavailable` means absent identity, disabled identity, or an incompatible sign-in method. The UI offers signup without confirming account existence.

## Legacy retirement

The following paths are legacy after native validation:

- `start-phone-verification`
- `check-phone-verification`
- `start-whatsapp-verification`
- `check-whatsapp-verification`
- browser writes to `phone_verifications`

Retirement is staged:

1. Ship the shared native client behind `VITE_NATIVE_PHONE_AUTH_ENABLED=false`.
2. Validate SMS and WhatsApp in production for sign-in, signup, linking, refresh, logout, and re-login.
3. Make the native path the default.
4. Replace legacy function bodies with a neutral `410 Gone` response and remove their client call sites.
5. Revoke public write access to `phone_verifications` and retain the table temporarily for audit evidence.
6. Remove the retired functions/table only in a later cleanup migration after the rollback window closes.

## Testing

### Unit tests

- Sign-in sends `shouldCreateUser: false` for both channels.
- Signup sends `shouldCreateUser: true` and only approved descriptive metadata.
- WhatsApp sends `channel: 'whatsapp'`; SMS sends `channel: 'sms'`.
- OTP verification accepts only a returned session containing access token, refresh token, and user ID.
- Linking uses `phone_change` and rejects a missing current session.
- Infrastructure errors map to neutral application codes.
- The state machine rejects duplicate submission and invalid transitions.

### Build validation

- Focused unit suite passes.
- `npx tsc -b` passes.
- `npm run lint` passes without new warnings.
- `npm run build` passes.

### Production smoke tests

Run each case with a designated test account and redact all phone/OTP/session material from evidence:

1. Existing-account SMS sign-in preserves user ID.
2. Existing-account WhatsApp sign-in preserves the same user ID.
3. Unknown-number sign-in does not create a user.
4. New-number signup creates one user and a refreshable session.
5. Repeated signup does not create a duplicate.
6. Authenticated phone linking preserves the current user ID.
7. Refresh survives a page reload.
8. Logout invalidates local session state; subsequent protected access fails.
9. Email/password login still works for an account with a linked phone.

## Rollout and rollback

Native phone-provider configuration is a release gate. Existing custom function configuration does not prove that native Auth delivery is configured. `VITE_NATIVE_PHONE_AUTH_ENABLED` remains `false` until the probe and smoke-test gates pass, then changes to `true` in the deployment environment.

The feature flag remains off until a configuration probe succeeds for each channel. During the rollback window, the legacy implementation remains deployed but is never silently selected after a native authentication error; fallback would create ambiguous identity behavior. Rollback is an explicit flag change performed only if no native-created identity divergence has occurred.

## Documentation and communication

Internal documentation records the architecture, configuration ownership, test matrix, rollback procedure, and verified production results without exposing infrastructure credentials or provider-specific implementation details.

The message to Samuel must distinguish:

- implemented UI and authentication capability;
- verified SMS behavior;
- verified WhatsApp behavior; and
- any remaining configuration or rollout gate.

No channel is described as complete before its production session and refresh smoke tests pass.
