import { useState, type FormEvent } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, Loader2, MessageCircle, Smartphone, User, X } from 'lucide-react';
import CountryCodeSelector from './CountryCodeSelector';
import { countries, type Country } from '../utils/countryCodes';
import { supabase } from '../services/authService';
import { usePhoneAuthFlow } from '../hooks/usePhoneAuthFlow';
import { normalizePhone, PhoneAuthError, type PhoneAuthChannel, type PhoneAuthClient } from '../services/phoneAuthService';

export interface PhoneOtpAuthModalProps {
  channel: PhoneAuthChannel;
  mode?: 'sign-up' | 'sign-in';
  onClose: () => void;
  onSuccess: () => void;
  onSwitchToEmail: () => void;
}

const defaultCountry = countries.find((country) => country.code === 'BW') ?? countries[0];

export default function PhoneOtpAuthModal({
  channel,
  mode = 'sign-up',
  onClose,
  onSuccess,
  onSwitchToEmail,
}: PhoneOtpAuthModalProps) {
  const [selectedCountry, setSelectedCountry] = useState<Country>(defaultCountry);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const isSignUp = mode === 'sign-up';
  const isWhatsApp = channel === 'whatsapp';
  const flow = usePhoneAuthFlow({
    client: supabase as PhoneAuthClient,
    intent: isSignUp ? 'sign_up' : 'sign_in',
    channel,
  });

  const buildPhone = () => normalizePhone(selectedCountry.dialCode, phoneNumber);

  const handleSendCode = async (event: FormEvent) => {
    event.preventDefault();
    setValidationError(null);

    if (isSignUp && (!firstName.trim() || !lastName.trim())) {
      setValidationError('Enter your first and last name.');
      return;
    }

    try {
      const phone = buildPhone();
      await flow.start({
        phone,
        displayName: isSignUp ? `${firstName.trim()} ${lastName.trim()}` : undefined,
      });
    } catch (error) {
      setValidationError(
        error instanceof PhoneAuthError ? error.message : 'Enter a valid phone number.',
      );
    }
  };

  const handleVerifyCode = async (event: FormEvent) => {
    event.preventDefault();
    setValidationError(null);

    if (!/^\d{4,8}$/.test(verificationCode)) {
      setValidationError('Enter the verification code you received.');
      return;
    }

    const session = await flow.verify(verificationCode);
    if (session) onSuccess();
  };

  const handleChangePhone = () => {
    flow.changePhone();
    setVerificationCode('');
    setValidationError(null);
  };

  const visibleError = validationError ?? flow.error;
  const inputIdPrefix = isWhatsApp ? 'whatsapp-auth' : 'sms-auth';
  const title = flow.step === 'code'
    ? 'Enter your verification code'
    : `${isSignUp ? 'Sign up' : 'Sign in'} with ${isWhatsApp ? 'WhatsApp' : 'SMS'}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 backdrop-blur-sm sm:p-4">
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 4 }}
        transition={{ duration: 0.15 }}
        className="glass-card relative w-full max-w-md overflow-hidden shadow-premium"
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${inputIdPrefix}-title`}
      >
        <div className={isWhatsApp
          ? 'absolute inset-x-0 top-0 h-1 bg-[#25D366]'
          : 'absolute inset-x-0 top-0 h-1 bg-teal'}
        />
        <button
          type="button"
          className="absolute right-3 top-3 rounded-12 p-2 text-gray-500 transition-colors hover:bg-sand-200 hover:text-gray-700"
          onClick={onClose}
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="p-5 sm:p-6">
          <div className="mb-6 text-center">
            <div className={isWhatsApp
              ? 'mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#25D366]/10'
              : 'mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-teal/10'}
            >
              {isWhatsApp
                ? <MessageCircle className="h-8 w-8 text-[#25D366]" />
                : <Smartphone className="h-8 w-8 text-teal" />}
            </div>
            <h2 id={`${inputIdPrefix}-title`} className="font-display text-xl font-bold text-navy sm:text-2xl">
              {title}
            </h2>
            <p className="mt-2 text-sm text-navy/70">
              {flow.step === 'phone'
                ? `Receive a one-time code by ${isWhatsApp ? 'WhatsApp' : 'text message'} — no password needed.`
                : `Enter the code sent to ${flow.phone}.`}
            </p>
          </div>

          {flow.step === 'phone' ? (
            <form onSubmit={handleSendCode} className="space-y-4">
              <div>
                <label htmlFor={`${inputIdPrefix}-phone`} className="mb-1 block text-sm font-medium text-gray-700">
                  {isWhatsApp ? 'WhatsApp number' : 'Phone number'}
                </label>
                <div className="flex gap-2">
                  <CountryCodeSelector selectedCountry={selectedCountry} onSelectCountry={setSelectedCountry} />
                  <input
                    id={`${inputIdPrefix}-phone`}
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel-national"
                    value={phoneNumber}
                    onChange={(event) => setPhoneNumber(event.target.value)}
                    className="flex-1 rounded-lg border border-borders bg-white px-4 py-3 text-sm text-navy focus:border-transparent focus:outline-none focus:ring-2 focus:ring-teal"
                    placeholder="72 123 456"
                    style={{ fontSize: '16px' }}
                    required
                  />
                </div>
              </div>

              {isSignUp && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor={`${inputIdPrefix}-first-name`} className="mb-1 block text-sm font-medium text-gray-700">
                      First name
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                      <input
                        id={`${inputIdPrefix}-first-name`}
                        type="text"
                        autoComplete="given-name"
                        value={firstName}
                        onChange={(event) => setFirstName(event.target.value)}
                        className="w-full rounded-lg border border-borders bg-white py-3 pl-10 pr-3 text-sm text-navy focus:border-transparent focus:outline-none focus:ring-2 focus:ring-teal"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label htmlFor={`${inputIdPrefix}-last-name`} className="mb-1 block text-sm font-medium text-gray-700">
                      Last name
                    </label>
                    <input
                      id={`${inputIdPrefix}-last-name`}
                      type="text"
                      autoComplete="family-name"
                      value={lastName}
                      onChange={(event) => setLastName(event.target.value)}
                      className="w-full rounded-lg border border-borders bg-white px-3 py-3 text-sm text-navy focus:border-transparent focus:outline-none focus:ring-2 focus:ring-teal"
                      required
                    />
                  </div>
                </div>
              )}

              {visibleError && <ErrorMessage message={visibleError} />}

              <button
                type="submit"
                disabled={flow.isBusy}
                className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-12 bg-teal py-3 text-sm font-medium text-white shadow-card transition-colors hover:bg-teal/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {flow.isBusy && <Loader2 className="h-4 w-4 animate-spin" />}
                {flow.isBusy ? 'Sending code…' : 'Send verification code'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyCode} className="space-y-4">
              <div>
                <label htmlFor={`${inputIdPrefix}-code`} className="mb-1 block text-sm font-medium text-gray-700">
                  Verification code
                </label>
                <input
                  id={`${inputIdPrefix}-code`}
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={verificationCode}
                  onChange={(event) => setVerificationCode(event.target.value.replace(/\D/g, '').slice(0, 8))}
                  className="w-full rounded-lg border border-borders bg-white px-4 py-3 text-center text-lg tracking-[0.5em] text-navy focus:border-transparent focus:outline-none focus:ring-2 focus:ring-teal"
                  required
                  autoFocus
                />
              </div>

              {visibleError && <ErrorMessage message={visibleError} />}

              <button
                type="submit"
                disabled={flow.isBusy}
                className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-12 bg-teal py-3 text-sm font-medium text-white shadow-card transition-colors hover:bg-teal/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {flow.isBusy && <Loader2 className="h-4 w-4 animate-spin" />}
                {flow.status === 'verifying_code' ? 'Verifying…' : 'Verify and continue'}
              </button>

              <div className="flex items-center justify-center gap-4 text-sm">
                <button type="button" onClick={handleChangePhone} disabled={flow.isBusy} className="text-teal hover:text-teal/80 disabled:opacity-50">
                  Change number
                </button>
                <button type="button" onClick={() => void flow.resend()} disabled={flow.isBusy} className="text-teal hover:text-teal/80 disabled:opacity-50">
                  Resend code
                </button>
              </div>
            </form>
          )}

          <div className="mt-6 border-t border-gray-200 pt-4 text-center text-sm text-gray-600">
            Prefer email?{' '}
            <button type="button" onClick={onSwitchToEmail} className="font-medium text-teal hover:text-teal/80">
              Use email
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function ErrorMessage({ message }: { message: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-start gap-2 rounded-lg bg-red-50 p-3"
      role="alert"
    >
      <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-500" />
      <p className="text-sm text-red-700">{message}</p>
    </motion.div>
  );
}
