import { describe, expect, it, vi } from 'vitest';
import {
  PhoneAuthError,
  createPhoneAuthService,
  normalizePhone,
  type PhoneAuthClient,
} from './phoneAuthService';

const session = {
  access_token: 'access-token',
  refresh_token: 'refresh-token',
  expires_in: 3600,
  token_type: 'bearer',
  user: { id: 'user-123' },
};

function createClient(overrides: Partial<PhoneAuthClient['auth']> = {}): {
  client: PhoneAuthClient;
  auth: PhoneAuthClient['auth'];
} {
  const auth: PhoneAuthClient['auth'] = {
    signInWithOtp: vi.fn().mockResolvedValue({ data: {}, error: null }),
    verifyOtp: vi.fn().mockResolvedValue({ data: { session, user: session.user }, error: null }),
    getSession: vi.fn().mockResolvedValue({ data: { session }, error: null }),
    updateUser: vi.fn().mockResolvedValue({ data: { user: session.user }, error: null }),
    ...overrides,
  };

  return { client: { auth }, auth };
}

describe('normalizePhone', () => {
  it('normalizes a country code and local number to E.164', () => {
    expect(normalizePhone('+267', '071 234 567')).toBe('+26771234567');
  });

  it('rejects an invalid phone number', () => {
    expect(() => normalizePhone('+267', '12')).toThrowError(PhoneAuthError);
  });
});

describe('phone auth start', () => {
  it('starts existing-account WhatsApp sign-in without creating a user', async () => {
    const { client, auth } = createClient();
    const service = createPhoneAuthService(client);

    await service.start({
      phone: '+26771234567',
      intent: 'sign_in',
      channel: 'whatsapp',
    });

    expect(auth.signInWithOtp).toHaveBeenCalledWith({
      phone: '+26771234567',
      options: {
        channel: 'whatsapp',
        shouldCreateUser: false,
        data: undefined,
        captchaToken: undefined,
      },
    });
  });

  it('starts explicit SMS signup with descriptive metadata', async () => {
    const { client, auth } = createClient();
    const service = createPhoneAuthService(client);

    await service.start({
      phone: '+26771234567',
      intent: 'sign_up',
      channel: 'sms',
      profile: { displayName: 'Ada Lovelace' },
    });

    expect(auth.signInWithOtp).toHaveBeenCalledWith({
      phone: '+26771234567',
      options: {
        channel: 'sms',
        shouldCreateUser: true,
        data: { display_name: 'Ada Lovelace' },
        captchaToken: undefined,
      },
    });
  });

  it('starts an authenticated phone change without requesting a login OTP', async () => {
    const { client, auth } = createClient();
    const service = createPhoneAuthService(client);

    await service.start({ phone: '+26771234567', intent: 'link', channel: 'sms' });

    expect(auth.getSession).toHaveBeenCalledOnce();
    expect(auth.updateUser).toHaveBeenCalledWith({ phone: '+26771234567' });
    expect(auth.signInWithOtp).not.toHaveBeenCalled();
  });

  it('rejects phone linking without an authenticated session', async () => {
    const { client } = createClient({
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
    });

    await expect(
      createPhoneAuthService(client).start({
        phone: '+26771234567',
        intent: 'link',
        channel: 'sms',
      }),
    ).rejects.toMatchObject({ code: 'session_failed' });
  });
});

describe('phone auth verification', () => {
  it('verifies login OTPs as mobile SMS tokens and returns a genuine session', async () => {
    const { client, auth } = createClient();

    const result = await createPhoneAuthService(client).verify({
      phone: '+26771234567',
      intent: 'sign_in',
      code: '123456',
    });

    expect(auth.verifyOtp).toHaveBeenCalledWith({
      phone: '+26771234567',
      token: '123456',
      type: 'sms',
    });
    expect(result).toEqual(session);
  });

  it('verifies linked numbers as phone changes', async () => {
    const { client, auth } = createClient();

    await createPhoneAuthService(client).verify({
      phone: '+26771234567',
      intent: 'link',
      code: '123456',
    });

    expect(auth.verifyOtp).toHaveBeenCalledWith({
      phone: '+26771234567',
      token: '123456',
      type: 'phone_change',
    });
  });

  it.each([
    [{ ...session, access_token: '' }, 'session_failed'],
    [{ ...session, refresh_token: '' }, 'session_failed'],
    [{ ...session, user: { id: '' } }, 'session_failed'],
  ])('rejects incomplete sessions', async (incompleteSession, code) => {
    const { client } = createClient({
      verifyOtp: vi.fn().mockResolvedValue({
        data: { session: incompleteSession, user: incompleteSession.user },
        error: null,
      }),
    });

    await expect(
      createPhoneAuthService(client).verify({
        phone: '+26771234567',
        intent: 'sign_in',
        code: '123456',
      }),
    ).rejects.toMatchObject({ code });
  });

  it('maps rate limits without exposing raw infrastructure errors', async () => {
    const { client } = createClient({
      signInWithOtp: vi.fn().mockResolvedValue({
        data: {},
        error: { status: 429, message: 'raw upstream rate limit details' },
      }),
    });

    await expect(
      createPhoneAuthService(client).start({
        phone: '+26771234567',
        intent: 'sign_in',
        channel: 'sms',
      }),
    ).rejects.toMatchObject({
      code: 'rate_limited',
      message: 'Too many attempts. Please wait before requesting another code.',
    });
  });
});
