import { useEffect, useState } from 'react';
import { Check, Loader2, Phone, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../services/authService';
import { usePhoneAuthFlow } from '../../hooks/usePhoneAuthFlow';
import { normalizePhone, PhoneAuthError, type PhoneAuthClient } from '../../services/phoneAuthService';
import CountryCodeSelector from '../CountryCodeSelector';
import { countries, type Country } from '../../utils/countryCodes';

interface PhoneLinkingSettingsProps {
  darkMode?: boolean;
  interfaceLanguage?: string;
}

const defaultCountry = countries.find((country) => country.code === 'BW') ?? countries[0];

export default function PhoneLinkingSettings({
  darkMode: _darkMode = false,
  interfaceLanguage: _interfaceLanguage = 'english',
}: PhoneLinkingSettingsProps) {
  void _darkMode;
  void _interfaceLanguage;
  const { user } = useAuth();
  const nativePhoneAuthEnabled = import.meta.env.VITE_NATIVE_PHONE_AUTH_ENABLED === 'true';
  const [phoneNumber, setPhoneNumber] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<Country>(defaultCountry);
  const [verificationCode, setVerificationCode] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [linkedPhone, setLinkedPhone] = useState<string | null>(null);
  const flow = usePhoneAuthFlow({
    client: supabase as PhoneAuthClient,
    intent: 'link',
    channel: 'sms',
  });

  useEffect(() => {
    setLinkedPhone(user?.phone ?? user?.user_metadata?.phone_number ?? null);
  }, [user]);

  const handleSendVerification = async () => {
    setValidationError(null);
    setSuccess(null);

    try {
      const phone = normalizePhone(selectedCountry.dialCode, phoneNumber);
      await flow.start({ phone });
    } catch (error) {
      setValidationError(error instanceof PhoneAuthError ? error.message : 'Enter a valid phone number.');
    }
  };

  const handleVerifyAndLink = async () => {
    setValidationError(null);
    setSuccess(null);

    if (!/^\d{4,8}$/.test(verificationCode)) {
      setValidationError('Enter the verification code you received.');
      return;
    }

    const session = await flow.verify(verificationCode);
    if (!session || !flow.phone) return;

    setLinkedPhone(flow.phone);
    setVerificationCode('');
    setSuccess('Phone number linked. You can now use it to sign in.');
  };

  const handleChangePhone = () => {
    flow.changePhone();
    setVerificationCode('');
    setValidationError(null);
    setSuccess(null);
  };

  if (!nativePhoneAuthEnabled) {
    return (
      <section className="space-y-3" aria-labelledby="phone-linking-title">
        <h3 id="phone-linking-title" className="font-headline text-lg font-semibold text-navy">Phone sign-in</h3>
        <div className="rounded-12 border border-borders bg-sand-200/50 p-4">
          <p className="text-sm text-navy">Phone sign-in is not available yet. Your email sign-in remains unchanged.</p>
        </div>
      </section>
    );
  }

  const visibleError = validationError ?? flow.error;

  return (
    <section className="space-y-6" aria-labelledby="phone-linking-title">
      <div>
        <h3 id="phone-linking-title" className="mb-2 font-headline text-lg font-semibold text-navy">Phone sign-in</h3>
        <p className="text-sm text-navy">Verify a phone number to add password-free sign-in to this account.</p>
      </div>

      {linkedPhone ? (
        <div className="rounded-12 border border-borders bg-sand-200/50 p-4">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-green-100 p-2">
              <Phone className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <h4 className="text-sm font-medium text-navy">Verified phone number</h4>
              <p className="mt-1 text-sm text-navy">{linkedPhone}</p>
              <p className="mt-2 text-xs text-navy">You can sign in with this number or continue using email.</p>
            </div>
          </div>
        </div>
      ) : flow.step === 'phone' ? (
        <div className="space-y-4">
          <div>
            <label htmlFor="link-phone" className="mb-2 block text-sm font-medium text-navy">Phone number</label>
            <div className="flex gap-2">
              <CountryCodeSelector selectedCountry={selectedCountry} onSelectCountry={setSelectedCountry} />
              <input
                id="link-phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel-national"
                value={phoneNumber}
                onChange={(event) => setPhoneNumber(event.target.value)}
                placeholder="72 123 456"
                className="flex-1 rounded-lg border border-borders bg-white px-4 py-3 text-sm text-navy focus:border-transparent focus:outline-none focus:ring-2 focus:ring-teal"
                style={{ fontSize: '16px' }}
              />
            </div>
          </div>

          <button
            type="button"
            onClick={() => void handleSendVerification()}
            disabled={flow.isBusy || !phoneNumber.trim()}
            className="flex w-full items-center justify-center gap-2 rounded-12 bg-teal px-4 py-2 text-white transition-colors hover:bg-teal/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {flow.isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Phone className="h-4 w-4" />}
            {flow.isBusy ? 'Sending code…' : 'Send verification code'}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-12 border border-teal/20 bg-teal/10 p-4">
            <p className="text-sm text-navy">Enter the code sent to {flow.phone}.</p>
          </div>

          <div>
            <label htmlFor="link-phone-code" className="mb-2 block text-sm font-medium text-navy">Verification code</label>
            <input
              id="link-phone-code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={verificationCode}
              onChange={(event) => setVerificationCode(event.target.value.replace(/\D/g, '').slice(0, 8))}
              className="w-full rounded-12 border border-borders px-3 py-2 text-center tracking-[0.35em] text-navy focus:border-teal focus:ring-1 focus:ring-teal"
              autoFocus
            />
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleChangePhone}
              disabled={flow.isBusy}
              className="flex-1 rounded-12 border border-borders bg-white px-4 py-2 text-navy transition-colors hover:bg-sand-200 disabled:opacity-50"
            >
              Back
            </button>
            <button
              type="button"
              onClick={() => void handleVerifyAndLink()}
              disabled={flow.isBusy}
              className="flex flex-1 items-center justify-center gap-2 rounded-12 bg-teal px-4 py-2 text-white transition-colors hover:bg-teal/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {flow.isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {flow.status === 'verifying_code' ? 'Verifying…' : 'Verify and link'}
            </button>
          </div>

          <button
            type="button"
            onClick={() => void flow.resend()}
            disabled={flow.isBusy}
            className="w-full text-sm text-teal transition-colors hover:text-teal/80 disabled:opacity-50"
          >
            Resend code
          </button>
        </div>
      )}

      {visibleError && (
        <div className="flex items-start gap-2 rounded-12 border border-red-200 bg-red-50 p-3" role="alert">
          <X className="mt-0.5 h-4 w-4 text-red-600" />
          <p className="text-sm text-red-600">{visibleError}</p>
        </div>
      )}

      {success && (
        <div className="flex items-start gap-2 rounded-12 border border-green-200 bg-green-50 p-3" role="status">
          <Check className="mt-0.5 h-4 w-4 text-green-600" />
          <p className="text-sm text-green-600">{success}</p>
        </div>
      )}

      <div className="rounded-12 border border-borders bg-sand-200/50 p-4">
        <h4 className="mb-2 text-sm font-medium text-navy">How phone sign-in works</h4>
        <ul className="space-y-1 text-xs text-navy">
          <li>• A one-time code verifies that the number belongs to you.</li>
          <li>• The number is attached only to your current account.</li>
          <li>• Your existing email sign-in and account history stay unchanged.</li>
          <li>• Standard messaging rates may apply.</li>
        </ul>
      </div>
    </section>
  );
}
