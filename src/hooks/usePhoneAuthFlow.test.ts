import { describe, expect, it } from 'vitest';
import {
  initialPhoneAuthState,
  phoneAuthReducer,
  type PhoneAuthFlowState,
} from './usePhoneAuthFlow';

describe('phoneAuthReducer', () => {
  it('moves through send and verification states for authentication', () => {
    const sending = phoneAuthReducer(initialPhoneAuthState, {
      type: 'SEND',
      phone: '+26771234567',
    });
    expect(sending).toEqual({
      status: 'sending_code',
      step: 'phone',
      phone: '+26771234567',
      error: null,
    });

    const awaiting = phoneAuthReducer(sending, { type: 'SENT' });
    expect(awaiting.status).toBe('awaiting_code');

    const verifying = phoneAuthReducer(awaiting, { type: 'VERIFY' });
    expect(verifying.status).toBe('verifying_code');

    const authenticated = phoneAuthReducer(verifying, {
      type: 'VERIFIED',
      intent: 'sign_in',
    });
    expect(authenticated.status).toBe('authenticated');
  });

  it('finishes linking in a distinct linked state', () => {
    const verifying: PhoneAuthFlowState = {
      status: 'verifying_code',
      step: 'code',
      phone: '+26771234567',
      error: null,
    };

    expect(phoneAuthReducer(verifying, { type: 'VERIFIED', intent: 'link' }).status).toBe('linked');
  });

  it('clears phone and errors when the user changes number', () => {
    const failed: PhoneAuthFlowState = {
      status: 'failed',
      step: 'code',
      phone: '+26771234567',
      error: 'Could not verify',
    };

    expect(phoneAuthReducer(failed, { type: 'CHANGE_PHONE' })).toEqual(initialPhoneAuthState);
  });

  it('records a neutral failure while preserving the attempted phone', () => {
    const sending: PhoneAuthFlowState = {
      status: 'sending_code',
      step: 'phone',
      phone: '+26771234567',
      error: null,
    };

    expect(phoneAuthReducer(sending, { type: 'FAILED', message: 'Try again' })).toEqual({
      status: 'failed',
      step: 'phone',
      phone: '+26771234567',
      error: 'Try again',
    });
  });

  it('supports resending a code without returning to phone entry', () => {
    const awaiting: PhoneAuthFlowState = {
      status: 'awaiting_code',
      step: 'code',
      phone: '+26771234567',
      error: null,
    };

    const resending = phoneAuthReducer(awaiting, { type: 'RESEND' });
    expect(resending).toEqual({
      status: 'sending_code',
      step: 'code',
      phone: '+26771234567',
      error: null,
    });
    expect(phoneAuthReducer(resending, { type: 'SENT' }).status).toBe('awaiting_code');
  });

  it('ignores duplicate or invalid transitions', () => {
    const sending: PhoneAuthFlowState = {
      status: 'sending_code',
      step: 'phone',
      phone: '+26771234567',
      error: null,
    };
    const awaiting: PhoneAuthFlowState = {
      status: 'awaiting_code',
      step: 'code',
      phone: '+26771234567',
      error: null,
    };
    const verifying: PhoneAuthFlowState = {
      status: 'verifying_code',
      step: 'code',
      phone: '+26771234567',
      error: null,
    };

    expect(phoneAuthReducer(sending, { type: 'SEND', phone: '+26770000000' })).toBe(sending);
    expect(phoneAuthReducer(verifying, { type: 'VERIFY' })).toBe(verifying);
    expect(phoneAuthReducer(initialPhoneAuthState, { type: 'SENT' })).toBe(initialPhoneAuthState);
    expect(phoneAuthReducer(awaiting, { type: 'VERIFIED', intent: 'sign_in' })).toBe(awaiting);
  });
});
