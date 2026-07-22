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

export interface PhoneAuthSession {
  access_token: string;
  refresh_token: string;
  user: { id: string };
  [key: string]: unknown;
}

interface AuthFailure {
  message?: string;
  status?: number;
  code?: string;
}

interface AuthResult<T> {
  data: T;
  error: AuthFailure | null;
}

export interface PhoneAuthClient {
  auth: {
    signInWithOtp(input: {
      phone: string;
      options: {
        channel: PhoneAuthChannel;
        shouldCreateUser: boolean;
        data: { display_name: string } | undefined;
        captchaToken: string | undefined;
      };
    }): Promise<AuthResult<unknown>>;
    verifyOtp(input: {
      phone: string;
      token: string;
      type: 'sms' | 'phone_change';
    }): Promise<AuthResult<{ session: PhoneAuthSession | null; user?: { id: string } | null }>>;
    getSession(): Promise<AuthResult<{ session: PhoneAuthSession | null }>>;
    updateUser(input: { phone: string }): Promise<AuthResult<{ user?: { id: string } | null }>>;
  };
}

const PHONE_PATTERN = /^\+[1-9]\d{6,14}$/;
const CODE_PATTERN = /^\d{4,8}$/;

const ERROR_MESSAGES: Record<PhoneAuthErrorCode, string> = {
  invalid_phone: 'Enter a valid phone number including the country code.',
  invalid_or_expired_code: 'The verification code is invalid or expired. Request a new code and try again.',
  account_unavailable: 'We could not complete phone sign-in. Try signing up or use email instead.',
  rate_limited: 'Too many attempts. Please wait before requesting another code.',
  channel_unavailable: 'Phone verification is temporarily unavailable. Please use email and try again later.',
  session_failed: 'We verified the code but could not establish a secure session. Please try again.',
  network_error: 'Check your connection and try again.',
  unexpected_error: 'Phone authentication could not be completed. Please try again.',
};

export class PhoneAuthError extends Error {
  readonly code: PhoneAuthErrorCode;

  constructor(code: PhoneAuthErrorCode) {
    super(ERROR_MESSAGES[code]);
    this.name = 'PhoneAuthError';
    this.code = code;
  }
}

function assertPhone(phone: string): string {
  if (!PHONE_PATTERN.test(phone)) {
    throw new PhoneAuthError('invalid_phone');
  }
  return phone;
}

export function normalizePhone(countryDialCode: string, localNumber: string): string {
  const dialCode = countryDialCode.replace(/\D/g, '');
  const subscriberNumber = localNumber.replace(/\D/g, '').replace(/^0+/, '');
  return assertPhone(`+${dialCode}${subscriberNumber}`);
}

function mapAuthFailure(error: unknown, phase: 'start' | 'verify'): PhoneAuthError {
  if (error instanceof PhoneAuthError) return error;
  if (error instanceof TypeError) return new PhoneAuthError('network_error');

  const failure = (error ?? {}) as AuthFailure;
  const message = (failure.message ?? '').toLowerCase();

  if (failure.status === 429 || message.includes('rate limit') || message.includes('too many')) {
    return new PhoneAuthError('rate_limited');
  }
  if (
    message.includes('channel') ||
    message.includes('phone provider') ||
    message.includes('unsupported provider') ||
    message.includes('not enabled')
  ) {
    return new PhoneAuthError('channel_unavailable');
  }
  if (
    phase === 'verify' &&
    (failure.status === 400 || failure.status === 403 || message.includes('otp') || message.includes('expired'))
  ) {
    return new PhoneAuthError('invalid_or_expired_code');
  }
  if (
    phase === 'start' &&
    (message.includes('signups not allowed') ||
      message.includes('signup is disabled') ||
      message.includes('user not found') ||
      message.includes('account'))
  ) {
    return new PhoneAuthError('account_unavailable');
  }
  return new PhoneAuthError('unexpected_error');
}

function requireSession(session: PhoneAuthSession | null | undefined): PhoneAuthSession {
  if (!session?.access_token || !session.refresh_token || !session.user?.id) {
    throw new PhoneAuthError('session_failed');
  }
  return session;
}

export function createPhoneAuthService(
  client: PhoneAuthClient,
): {
  start(input: StartPhoneAuthInput): Promise<void>;
  verify(input: VerifyPhoneAuthInput): Promise<PhoneAuthSession>;
} {
  return {
    async start(input) {
      const phone = assertPhone(input.phone);

      try {
        if (input.intent === 'link') {
          const current = await client.auth.getSession();
          if (current.error) throw current.error;
          requireSession(current.data.session);

          const update = await client.auth.updateUser({ phone });
          if (update.error) throw update.error;
          return;
        }

        const displayName = input.profile?.displayName?.trim();
        const result = await client.auth.signInWithOtp({
          phone,
          options: {
            channel: input.channel,
            shouldCreateUser: input.intent === 'sign_up',
            data: input.intent === 'sign_up' && displayName
              ? { display_name: displayName }
              : undefined,
            captchaToken: input.captchaToken,
          },
        });
        if (result.error) throw result.error;
      } catch (error) {
        throw mapAuthFailure(error, 'start');
      }
    },

    async verify(input) {
      const phone = assertPhone(input.phone);
      const code = input.code.trim();
      if (!CODE_PATTERN.test(code)) {
        throw new PhoneAuthError('invalid_or_expired_code');
      }

      try {
        let linkedUserId: string | null = null;
        if (input.intent === 'link') {
          const current = await client.auth.getSession();
          if (current.error) throw current.error;
          linkedUserId = requireSession(current.data.session).user.id;
        }

        const result = await client.auth.verifyOtp({
          phone,
          token: code,
          type: input.intent === 'link' ? 'phone_change' : 'sms',
        });
        if (result.error) throw result.error;

        const verifiedSession = requireSession(result.data.session);
        if (linkedUserId && verifiedSession.user.id !== linkedUserId) {
          throw new PhoneAuthError('session_failed');
        }
        return verifiedSession;
      } catch (error) {
        if (error instanceof PhoneAuthError && error.code === 'session_failed') {
          throw error;
        }
        throw mapAuthFailure(error, 'verify');
      }
    },
  };
}
