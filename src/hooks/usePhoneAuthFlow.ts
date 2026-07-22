import { useCallback, useMemo, useReducer, useRef } from 'react';
import {
  PhoneAuthError,
  createPhoneAuthService,
  type PhoneAuthChannel,
  type PhoneAuthClient,
  type PhoneAuthIntent,
  type PhoneAuthSession,
} from '../services/phoneAuthService';

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
  step: 'phone' | 'code';
  phone: string | null;
  error: string | null;
}

export type PhoneAuthFlowEvent =
  | { type: 'SEND'; phone: string }
  | { type: 'RESEND' }
  | { type: 'SENT' }
  | { type: 'VERIFY' }
  | { type: 'VERIFIED'; intent: PhoneAuthIntent }
  | { type: 'FAILED'; message: string }
  | { type: 'CHANGE_PHONE' };

export const initialPhoneAuthState: PhoneAuthFlowState = {
  status: 'collecting_phone',
  step: 'phone',
  phone: null,
  error: null,
};

export function phoneAuthReducer(
  state: PhoneAuthFlowState,
  event: PhoneAuthFlowEvent,
): PhoneAuthFlowState {
  switch (event.type) {
    case 'SEND':
      if (state.status !== 'collecting_phone' && state.status !== 'failed') return state;
      return { status: 'sending_code', step: 'phone', phone: event.phone, error: null };
    case 'SENT':
      if (state.status !== 'sending_code') return state;
      return { ...state, status: 'awaiting_code', step: 'code', error: null };
    case 'RESEND':
      if (state.status !== 'awaiting_code' && !(state.status === 'failed' && state.step === 'code')) {
        return state;
      }
      return { ...state, status: 'sending_code', step: 'code', error: null };
    case 'VERIFY':
      if (state.status !== 'awaiting_code' && !(state.status === 'failed' && state.step === 'code')) {
        return state;
      }
      return { ...state, status: 'verifying_code', error: null };
    case 'VERIFIED':
      if (state.status !== 'verifying_code') return state;
      return {
        ...state,
        status: event.intent === 'link' ? 'linked' : 'authenticated',
        error: null,
      };
    case 'FAILED':
      if (state.status !== 'sending_code' && state.status !== 'verifying_code') return state;
      return { ...state, status: 'failed', error: event.message };
    case 'CHANGE_PHONE':
      return initialPhoneAuthState;
    default:
      return state;
  }
}

interface UsePhoneAuthFlowOptions {
  client: PhoneAuthClient;
  intent: PhoneAuthIntent;
  channel: PhoneAuthChannel;
}

interface StartFlowInput {
  phone: string;
  displayName?: string;
  captchaToken?: string;
}

function publicErrorMessage(error: unknown): string {
  return error instanceof PhoneAuthError
    ? error.message
    : 'Phone authentication could not be completed. Please try again.';
}

export function usePhoneAuthFlow({ client, intent, channel }: UsePhoneAuthFlowOptions) {
  const [state, dispatch] = useReducer(phoneAuthReducer, initialPhoneAuthState);
  const busyRef = useRef(false);
  const lastStartRef = useRef<StartFlowInput | null>(null);
  const service = useMemo(() => createPhoneAuthService(client), [client]);

  const start = useCallback(async ({ phone, displayName, captchaToken }: StartFlowInput) => {
    if (busyRef.current) return false;
    busyRef.current = true;
    lastStartRef.current = { phone, displayName, captchaToken };
    dispatch({ type: 'SEND', phone });

    try {
      await service.start({
        phone,
        intent,
        channel,
        profile: displayName ? { displayName } : undefined,
        captchaToken,
      });
      dispatch({ type: 'SENT' });
      return true;
    } catch (error) {
      dispatch({ type: 'FAILED', message: publicErrorMessage(error) });
      return false;
    } finally {
      busyRef.current = false;
    }
  }, [channel, intent, service]);

  const resend = useCallback(async () => {
    const previous = lastStartRef.current;
    if (busyRef.current || !state.phone || !previous) return false;
    busyRef.current = true;
    dispatch({ type: 'RESEND' });

    try {
      await service.start({
        phone: state.phone,
        intent,
        channel,
        profile: previous.displayName ? { displayName: previous.displayName } : undefined,
        captchaToken: previous.captchaToken,
      });
      dispatch({ type: 'SENT' });
      return true;
    } catch (error) {
      dispatch({ type: 'FAILED', message: publicErrorMessage(error) });
      return false;
    } finally {
      busyRef.current = false;
    }
  }, [channel, intent, service, state.phone]);

  const verify = useCallback(async (code: string): Promise<PhoneAuthSession | null> => {
    if (busyRef.current || !state.phone) return null;
    busyRef.current = true;
    dispatch({ type: 'VERIFY' });

    try {
      const session = await service.verify({ phone: state.phone, intent, code });
      dispatch({ type: 'VERIFIED', intent });
      return session;
    } catch (error) {
      dispatch({ type: 'FAILED', message: publicErrorMessage(error) });
      return null;
    } finally {
      busyRef.current = false;
    }
  }, [intent, service, state.phone]);

  const changePhone = useCallback(() => {
    if (busyRef.current) return;
    lastStartRef.current = null;
    dispatch({ type: 'CHANGE_PHONE' });
  }, []);

  return {
    ...state,
    isBusy: state.status === 'sending_code' || state.status === 'verifying_code',
    start,
    resend,
    verify,
    changePhone,
  };
}
