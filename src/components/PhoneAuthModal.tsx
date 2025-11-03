import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Smartphone, AlertCircle, User, Lock, Eye, EyeOff } from 'lucide-react';
import CountryCodeSelector from './CountryCodeSelector';
import { countries, Country } from '../utils/countryCodes';

interface PhoneAuthModalProps {
  onClose: () => void;
  onSuccess: () => void;
  onSwitchToEmail: () => void;
  mode?: 'login' | 'signup';
}

const PhoneAuthModal: React.FC<PhoneAuthModalProps> = ({
  onClose,
  onSuccess,
  onSwitchToEmail,
  mode: initialMode = 'signup'
}) => {
  const defaultCountry = countries.find(c => c.code === 'BW') || countries[0];

  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);
  const [selectedCountry, setSelectedCountry] = useState<Country>(defaultCountry);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const getFullPhoneNumber = () => {
    const cleanNumber = phoneNumber.replace(/\D/g, '');
    return `${selectedCountry.dialCode}${cleanNumber}`;
  };

  const validateForm = () => {
    if (!phoneNumber.trim()) {
      setError('Please enter your phone number.');
      return false;
    }

    const cleanNumber = phoneNumber.replace(/\D/g, '');
    if (cleanNumber.length < 6) {
      setError('Please enter a valid phone number.');
      return false;
    }

    if (mode === 'signup' && !name.trim()) {
      setError('Please enter your name.');
      return false;
    }

    if (!password) {
      setError('Please enter a password.');
      return false;
    }

    if (mode === 'signup' && password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return false;
    }

    if (mode === 'signup' && password !== confirmPassword) {
      setError('Passwords do not match.');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      const fullPhoneNumber = getFullPhoneNumber();
      const functionsUrl = import.meta.env.VITE_SUPABASE_FUNCTIONS_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const endpoint = mode === 'signup' ? 'phone-signup' : 'phone-login';

      const body = mode === 'signup'
        ? {
            phone_number: fullPhoneNumber,
            password: password,
            name: name.trim()
          }
        : {
            phone_number: fullPhoneNumber,
            password: password
          };

      const response = await fetch(`${functionsUrl}/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${anonKey}`,
          'apikey': anonKey
        },
        body: JSON.stringify(body)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `${mode === 'signup' ? 'Sign up' : 'Login'} failed`);
      }

      if (!data.success) {
        throw new Error(data.error || `${mode === 'signup' ? 'Sign up' : 'Login'} failed`);
      }

      onSuccess();
    } catch (err: any) {
      console.error(`Error during phone ${mode}:`, err);

      let errorMessage = err.message || `${mode === 'signup' ? 'Sign up' : 'Login'} failed. Please try again.`;

      if (errorMessage.includes('already exists') || errorMessage.includes('already registered')) {
        errorMessage = 'This phone number is already registered. Try logging in instead.';
      } else if (errorMessage.includes('not found') || errorMessage.includes('invalid credentials')) {
        errorMessage = 'Invalid phone number or password.';
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
              {mode === 'signup' ? 'Sign Up with Phone' : 'Login with Phone'}
            </h2>
            <p className="text-navy/70 text-sm mt-2">
              {mode === 'signup'
                ? 'Create your account using your phone number'
                : 'Enter your credentials to continue'
              }
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number
              </label>
              <div className="flex gap-2">
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
                  className="flex-1 px-4 py-3 text-navy border border-borders rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent text-sm"
                  placeholder="72 123 456"
                  style={{ fontSize: '16px' }}
                  required
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Enter your phone number without the country code
              </p>
            </div>

            {mode === 'signup' && (
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <input
                    id="name"
                    name="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-10 pr-3 py-3 text-navy border border-borders rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent text-sm"
                    placeholder="John Doe"
                    style={{ fontSize: '16px' }}
                    required
                  />
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                </div>
              </div>
            )}

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-3 text-navy border border-borders rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent text-sm"
                  placeholder="••••••••"
                  style={{ fontSize: '16px' }}
                  required
                />
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {mode === 'signup' && (
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-3 text-navy border border-borders rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent text-sm"
                    placeholder="••••••••"
                    style={{ fontSize: '16px' }}
                    required
                  />
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
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
                  {mode === 'signup' ? 'Creating Account...' : 'Logging In...'}
                </>
              ) : (
                mode === 'signup' ? 'Create Account' : 'Login'
              )}
            </motion.button>
          </form>

          <div className="mt-4 text-center">
            <button
              onClick={() => setMode(mode === 'signup' ? 'login' : 'signup')}
              className="text-teal hover:text-teal/80 text-sm transition-colors"
            >
              {mode === 'signup'
                ? 'Already have an account? Login'
                : "Don't have an account? Sign up"}
            </button>
          </div>

          <div className="mt-6 pt-4 border-t border-gray-200 text-center">
            <p className="text-sm text-gray-600">
              Prefer email instead?{' '}
              <button
                onClick={onSwitchToEmail}
                className="text-teal hover:text-teal/80 font-medium transition-colors"
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

export default PhoneAuthModal;
