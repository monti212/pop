import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Smartphone, Shield, AlertCircle, ArrowLeft, Check } from 'lucide-react';
import { supabase } from '../services/authService';
import CountryCodeSelector from './CountryCodeSelector';
import { countries, Country } from '../utils/countryCodes';

interface PhoneAuthModalProps {
  onClose: () => void;
  onSuccess: () => void;
  onSwitchToEmail: () => void;
}

const PhoneAuthModal: React.FC<PhoneAuthModalProps> = ({
  onClose,
  onSuccess,
  onSwitchToEmail
}) => {
  const defaultCountry = countries.find(c => c.code === 'BW') || countries[0];

  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [selectedCountry, setSelectedCountry] = useState<Country>(defaultCountry);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isResending, setIsResending] = useState(false);

  const getFullPhoneNumber = () => {
    const cleanNumber = phoneNumber.replace(/\D/g, '');
    return `${selectedCountry.dialCode}${cleanNumber}`;
  };

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!phoneNumber.trim()) {
      setError('Please enter your phone number.');
      return;
    }

    const cleanNumber = phoneNumber.replace(/\D/g, '');
    if (cleanNumber.length < 6) {
      setError('Please enter a valid phone number.');
      return;
    }

    setIsLoading(true);

    try {
      const fullPhoneNumber = getFullPhoneNumber();
      console.log('Sending OTP to:', fullPhoneNumber);

      const functionsUrl = import.meta.env.VITE_SUPABASE_FUNCTIONS_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const response = await fetch(`${functionsUrl}/start-phone-verification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${anonKey}`,
          'apikey': anonKey
        },
        body: JSON.stringify({
          phone_number: fullPhoneNumber
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send verification code');
      }

      console.log('OTP sent successfully to:', fullPhoneNumber);
      setStep('code');
    } catch (err: any) {
      console.error('Error sending verification code:', err);

      let errorMessage = err.message || 'Failed to send verification code. Please try again.';

      if (errorMessage.includes('rate limit') || errorMessage.includes('429')) {
        errorMessage = 'Too many requests. Please wait 60 seconds before trying again.';
      } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
        errorMessage = 'Connection issue. Please check your internet and try again.';
      }

      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!verificationCode.trim()) {
      setError('Please enter the verification code.');
      return;
    }

    if (verificationCode.length !== 6) {
      setError('Verification code must be 6 digits.');
      return;
    }

    setIsLoading(true);

    try {
      const fullPhoneNumber = getFullPhoneNumber();
      console.log('Verifying OTP for:', fullPhoneNumber);

      const functionsUrl = import.meta.env.VITE_SUPABASE_FUNCTIONS_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const response = await fetch(`${functionsUrl}/check-phone-verification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${anonKey}`,
          'apikey': anonKey
        },
        body: JSON.stringify({
          phone_number: fullPhoneNumber,
          code: verificationCode
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Verification failed');
      }

      if (!data.success) {
        throw new Error(data.error || 'Verification failed');
      }

      console.log('Phone verification successful, user authenticated');

      // Set the session if provided
      if (data.session && supabase) {
        await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token || ''
        });
      }

      onSuccess();
    } catch (err: any) {
      console.error('Error verifying code:', err);

      let errorMessage = err.message || 'Verification failed. Please try again.';

      if (errorMessage.includes('invalid') || errorMessage.includes('expired')) {
        errorMessage = 'Invalid or expired code. Please request a new one.';
      } else if (errorMessage.includes('rate limit') || errorMessage.includes('429')) {
        errorMessage = 'Too many attempts. Please wait before trying again.';
      }

      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    setError('');
    setIsResending(true);

    try {
      const fullPhoneNumber = getFullPhoneNumber();
      console.log('Resending OTP to:', fullPhoneNumber);

      const functionsUrl = import.meta.env.VITE_SUPABASE_FUNCTIONS_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const response = await fetch(`${functionsUrl}/start-phone-verification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${anonKey}`,
          'apikey': anonKey
        },
        body: JSON.stringify({
          phone_number: fullPhoneNumber
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to resend code');
      }

      console.log('OTP resent successfully');
      setError('');
    } catch (err: any) {
      console.error('Error resending verification code:', err);

      let errorMessage = err.message || 'Failed to resend code. Please try again.';

      if (errorMessage.includes('rate limit') || errorMessage.includes('429')) {
        errorMessage = 'Please wait 60 seconds before requesting another code.';
      }

      setError(errorMessage);
    } finally {
      setIsResending(false);
    }
  };

  const handleBackToPhone = () => {
    setStep('phone');
    setVerificationCode('');
    setError('');
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4">
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 4 }}
        transition={{ duration: 0.15 }}
        className="glass-card max-w-md w-full shadow-premium overflow-hidden"
      >
        <div className="absolute top-0 left-0 right-0 h-1 bg-teal"></div>

        <button
          className="absolute top-3 right-3 p-2 rounded-12 text-gray-500 hover:text-gray-700 hover:bg-sand-200 transition-colors duration-200"
          onClick={onClose}
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-5 sm:p-6">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-teal/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Smartphone className="w-8 h-8 text-teal" />
            </div>
            <h2 className="font-display text-xl sm:text-2xl font-bold text-navy">
              {step === 'phone' ? 'Sign in with Phone' : 'Enter Verification Code'}
            </h2>
            <p className="text-navy/70 text-sm mt-2">
              {step === 'phone'
                ? 'Enter your phone number to receive a verification code'
                : `We sent a verification code to ${getFullPhoneNumber()}`
              }
            </p>
          </div>

          {step === 'phone' ? (
            <form onSubmit={handleSendCode} className="space-y-4">
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number
                </label>
                <div className="flex rounded-lg border border-borders bg-white focus-within:ring-2 focus-within:ring-teal focus-within:border-transparent overflow-hidden">
                  <CountryCodeSelector
                    selectedCountry={selectedCountry}
                    onSelectCountry={setSelectedCountry}
                  />
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="flex-1 px-4 py-3 text-navy focus:outline-none text-sm"
                    placeholder="72 123 456"
                    style={{ fontSize: '16px' }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Enter your phone number without the country code
                </p>
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-start gap-2 p-3 bg-red-50 rounded-lg"
                >
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{error}</p>
                </motion.div>
              )}

              <motion.button
                type="submit"
                disabled={isLoading}
                className="w-full bg-teal hover:bg-teal/90 text-white py-3 rounded-12 flex items-center justify-center min-h-[44px] text-sm font-medium transition-colors shadow-card"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Sending Code...
                  </>
                ) : (
                  "Send Verification Code"
                )}
              </motion.button>
            </form>
          ) : (
            <form onSubmit={handleVerifyCode} className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <button
                  type="button"
                  onClick={handleBackToPhone}
                  className="p-2 rounded-12 hover:bg-sand-200 text-navy transition-colors"
                  title="Back to phone number"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div className="flex-1">
                  <p className="text-sm text-navy/70">
                    Verification code sent to
                  </p>
                  <p className="font-medium text-navy">{getFullPhoneNumber()}</p>
                </div>
              </div>

              <div>
                <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-1">
                  Verification Code
                </label>
                <div className="relative">
                  <input
                    id="code"
                    name="code"
                    type="text"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').substring(0, 6))}
                    className="w-full pl-10 pr-3 py-3 rounded-12 border border-borders bg-white text-navy focus:ring-2 focus:ring-teal focus:border-transparent text-sm transition-all text-center font-mono text-lg tracking-wider"
                    placeholder="123456"
                    style={{ fontSize: '16px' }}
                    maxLength={6}
                    autoComplete="one-time-code"
                  />
                  <Shield className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Enter the 6-digit code sent to your phone
                </p>
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-start gap-2 p-3 bg-red-50 rounded-lg"
                >
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{error}</p>
                </motion.div>
              )}

              <motion.button
                type="submit"
                disabled={isLoading || verificationCode.length !== 6}
                className="w-full bg-teal hover:bg-teal/90 text-white py-3 rounded-12 flex items-center justify-center min-h-[44px] text-sm font-medium transition-colors shadow-card disabled:opacity-50 disabled:cursor-not-allowed"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Verifying...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Verify & Continue
                  </>
                )}
              </motion.button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={handleResendCode}
                  disabled={isResending}
                  className="text-teal hover:text-teal/80 text-sm transition-colors disabled:opacity-50"
                >
                  {isResending ? 'Resending...' : "Didn't receive the code? Resend"}
                </button>
              </div>
            </form>
          )}

          <div className="mt-6 pt-4 border-t border-gray-200 text-center">
            <p className="text-sm text-gray-600">
              Prefer email instead?{' '}
              <button
                onClick={onSwitchToEmail}
                className="text-teal hover:text-teal/80 font-medium transition-colors"
              >
                Sign up with email
              </button>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default PhoneAuthModal;
