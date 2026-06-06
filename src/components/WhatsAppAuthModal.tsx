import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, MessageCircle, AlertCircle, User } from 'lucide-react';
import CountryCodeSelector from './CountryCodeSelector';
import { countries, Country } from '../utils/countryCodes';
import { supabase } from '../services/authService';
import { waitForSessionReady } from '../utils/sessionValidator';

interface WhatsAppAuthModalProps {
  onClose: () => void;
  onSuccess: () => void;
  onSwitchToEmail: () => void;
  mode?: 'sign-up' | 'sign-in';
}

const WhatsAppAuthModal: React.FC<WhatsAppAuthModalProps> = ({
  onClose,
  onSuccess,
  onSwitchToEmail,
  mode = 'sign-up'
}) => {
  const defaultCountry = countries.find(c => c.code === 'BW') || countries[0];

  const [step, setStep] = useState<'phone' | 'verify'>('phone');
  const [selectedCountry, setSelectedCountry] = useState<Country>(defaultCountry);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const isSignUp = mode === 'sign-up';

  const getFullPhoneNumber = () => {
    const cleanNumber = phoneNumber.replace(/\D/g, '');
    return `${selectedCountry.dialCode}${cleanNumber}`;
  };

  const validatePhoneForm = () => {
    if (!phoneNumber.trim()) {
      setError('Please enter your WhatsApp number.');
      return false;
    }
    const cleanNumber = phoneNumber.replace(/\D/g, '');
    if (cleanNumber.length < 6) {
      setError('Please enter a valid phone number.');
      return false;
    }
    if (isSignUp && (!firstName.trim() || !lastName.trim())) {
      setError('Please enter your first and last name.');
      return false;
    }
    return true;
  };

  const validateCodeForm = () => {
    if (!verificationCode.trim()) {
      setError('Please enter the verification code from WhatsApp.');
      return false;
    }
    if (verificationCode.length < 4) {
      setError('Please enter a valid verification code.');
      return false;
    }
    return true;
  };

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validatePhoneForm()) return;

    setIsLoading(true);
    try {
      const fullPhoneNumber = getFullPhoneNumber();
      const functionsUrl = import.meta.env.VITE_SUPABASE_FUNCTIONS_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const response = await fetch(`${functionsUrl}/start-whatsapp-verification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${anonKey}`,
          'apikey': anonKey
        },
        body: JSON.stringify({ phone_number: fullPhoneNumber })
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to send WhatsApp code');
      }

      setStep('verify');
    } catch (err: any) {
      console.error('Error sending WhatsApp code:', err);
      setError(err.message || 'Failed to send WhatsApp code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validateCodeForm()) return;

    setIsLoading(true);
    try {
      const fullPhoneNumber = getFullPhoneNumber();
      const fullName = isSignUp ? `${firstName.trim()} ${lastName.trim()}` : undefined;
      const functionsUrl = import.meta.env.VITE_SUPABASE_FUNCTIONS_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const response = await fetch(`${functionsUrl}/check-whatsapp-verification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${anonKey}`,
          'apikey': anonKey
        },
        body: JSON.stringify({
          phone_number: fullPhoneNumber,
          code: verificationCode.trim(),
          name: fullName
        })
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Verification failed');
      }

      if (data.session && data.session.access_token) {
        const { error: signInError } = await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token || data.session.access_token
        });
        if (signInError) {
          throw new Error('Failed to complete authentication. Please try again.');
        }
        const sessionResult = await waitForSessionReady(
          () => supabase.auth.getSession(),
          { maxAttempts: 5, delayMs: 200, validateClaims: true }
        );
        if (sessionResult.error || !sessionResult.session) {
          throw new Error('Session validation failed. Please try again.');
        }
      } else if (data.requires_client_refresh) {
        window.location.reload();
        return;
      }

      onSuccess();
    } catch (err: any) {
      console.error('Error verifying WhatsApp code:', err);
      let errorMessage = err.message || 'Verification failed. Please try again.';
      if (errorMessage.includes('expired')) {
        errorMessage = 'Verification code has expired. Please request a new one.';
      } else if (errorMessage.includes('not found')) {
        errorMessage = 'Verification not found. Please request a new code.';
      } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
        errorMessage = 'Connection issue. Please check your internet and try again.';
      }
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4">
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 4 }}
        transition={{ duration: 0.15 }}
        className="glass-card max-w-md w-full shadow-premium overflow-hidden relative"
      >
        <div className="absolute top-0 left-0 right-0 h-1 bg-[#25D366]"></div>

        <button
          className="absolute top-3 right-3 p-2 rounded-12 text-gray-500 hover:text-gray-700 hover:bg-sand-200 transition-colors duration-200"
          onClick={onClose}
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-5 sm:p-6">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-[#25D366]/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <MessageCircle className="w-8 h-8 text-[#25D366]" />
            </div>
            <h2 className="font-display text-xl sm:text-2xl font-bold text-navy">
              {step === 'phone'
                ? (isSignUp ? 'Sign up with WhatsApp' : 'Sign in with WhatsApp')
                : 'Enter WhatsApp Code'}
            </h2>
            <p className="text-navy/70 text-sm mt-2">
              {step === 'phone'
                ? 'Get a verification code on WhatsApp — no password needed'
                : `Enter the code we just sent to ${getFullPhoneNumber()} on WhatsApp`
              }
            </p>
          </div>

          {step === 'phone' ? (
            <form onSubmit={handleSendCode} className="space-y-4">
              <div>
                <label htmlFor="wa-phone" className="block text-sm font-medium text-gray-700 mb-1">
                  WhatsApp Number
                </label>
                <div className="flex gap-2">
                  <CountryCodeSelector
                    selectedCountry={selectedCountry}
                    onSelectCountry={setSelectedCountry}
                  />
                  <input
                    id="wa-phone"
                    name="wa-phone"
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="flex-1 px-4 py-3 text-navy border border-borders rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#25D366] focus:border-transparent text-sm"
                    placeholder="72 123 456"
                    style={{ fontSize: '16px' }}
                    required
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Make sure WhatsApp is installed on this number
                </p>
              </div>

              {isSignUp && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="wa-firstName" className="block text-sm font-medium text-gray-700 mb-1">
                      First Name
                    </label>
                    <div className="relative">
                      <input
                        id="wa-firstName"
                        name="wa-firstName"
                        type="text"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        className="w-full pl-10 pr-3 py-3 text-navy border border-borders rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#25D366] focus:border-transparent text-sm"
                        placeholder="John"
                        style={{ fontSize: '16px' }}
                        required
                      />
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="wa-lastName" className="block text-sm font-medium text-gray-700 mb-1">
                      Last Name
                    </label>
                    <input
                      id="wa-lastName"
                      name="wa-lastName"
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full px-3 py-3 text-navy border border-borders rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#25D366] focus:border-transparent text-sm"
                      placeholder="Doe"
                      style={{ fontSize: '16px' }}
                      required
                    />
                  </div>
                </div>
              )}

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
                className="w-full bg-[#25D366] hover:bg-[#1ebe57] text-white py-3 rounded-12 flex items-center justify-center min-h-[44px] text-sm font-medium transition-colors shadow-card"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Sending WhatsApp code...
                  </>
                ) : (
                  'Send Code on WhatsApp'
                )}
              </motion.button>
            </form>
          ) : (
            <form onSubmit={handleVerifyCode} className="space-y-4">
              <div>
                <label htmlFor="wa-code" className="block text-sm font-medium text-gray-700 mb-1">
                  Verification Code
                </label>
                <input
                  id="wa-code"
                  name="wa-code"
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                  className="w-full px-4 py-3 text-navy border border-borders rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#25D366] focus:border-transparent text-sm text-center tracking-widest"
                  placeholder="Enter code"
                  style={{ fontSize: '18px', letterSpacing: '0.5em' }}
                  maxLength={6}
                  required
                />
                <p className="text-xs text-gray-500 mt-1 text-center">
                  Check your WhatsApp messages for the code
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
                className="w-full bg-[#25D366] hover:bg-[#1ebe57] text-white py-3 rounded-12 flex items-center justify-center min-h-[44px] text-sm font-medium transition-colors shadow-card"
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
                  'Verify and Continue'
                )}
              </motion.button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => {
                    setStep('phone');
                    setVerificationCode('');
                    setError('');
                  }}
                  className="text-[#25D366] hover:text-[#1ebe57] text-sm transition-colors"
                >
                  Change WhatsApp number
                </button>
              </div>
            </form>
          )}

          <div className="mt-6 pt-4 border-t border-gray-200 text-center">
            <p className="text-sm text-gray-600">
              Prefer email instead?{' '}
              <button
                onClick={onSwitchToEmail}
                className="text-[#25D366] hover:text-[#1ebe57] font-medium transition-colors"
              >
                Use email
              </button>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default WhatsAppAuthModal;
