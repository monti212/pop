import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Lock, Eye, EyeOff, AlertCircle, Check, ArrowLeft } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../services/authService';
import Logo from '../components/Logo';

const ResetPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isValidating, setIsValidating] = useState(true);
  const [isValidToken, setIsValidToken] = useState(false);

  // Supabase sends reset tokens in the URL hash: #access_token=...&type=recovery
  // We must listen for the PASSWORD_RECOVERY auth event — getSession() alone won't work
  useEffect(() => {
    // Give Supabase a moment to parse the hash and fire the event
    const timeout = setTimeout(() => {
      if (isValidating) {
        setIsValidating(false);
        setError('That reset link has expired or is invalid. Please request a new one.');
      }
    }, 5000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: string, session: any) => {
      if (event === 'PASSWORD_RECOVERY') {
        clearTimeout(timeout);
        setIsValidToken(true);
        setIsValidating(false);
      } else if (event === 'SIGNED_IN' && session) {
        // Already signed in with a valid session from the hash
        clearTimeout(timeout);
        setIsValidToken(true);
        setIsValidating(false);
      } else if (!session && !isValidToken) {
        clearTimeout(timeout);
        setIsValidating(false);
        setError('That reset link has expired or is invalid. Please request a new one.');
      }
    });

    return () => {
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate form
    if (!formData.password) {
      setError('I need your new password to continue.');
      return;
    }

    if (formData.password.length < 6) {
      setError('That password\'s a bit short. How about at least 6 characters?');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Those passwords don\'t match. Could you try typing them again?');
      return;
    }

    setIsLoading(true);

    try {
      // Update the user's password
      const { error: updateError } = await supabase.auth.updateUser({
        password: formData.password
      });

      if (updateError) {
        throw updateError;
      }

      setIsSuccess(true);

      // Redirect to login page after 3 seconds
      setTimeout(() => {
        navigate('/', { replace: true });
      }, 3000);

    } catch (err: any) {
      console.error('Error updating password:', err);
      setError(err.message || 'I couldn\'t update that password. Want to try again?');
    } finally {
      setIsLoading(false);
    }
  };

  if (isValidating) {
    return (
      <div className="min-h-screen bg-sand flex flex-col">
        <header className="w-full bg-sand/80 backdrop-blur-sm z-50 border-b border-teal/10 py-3 sm:py-4">
          <div className="container mx-auto px-4 sm:px-6 flex justify-between items-center">
            <Logo />
            <Link
              to="/"
              className="flex items-center gap-1 text-navy hover:text-teal transition-colors duration-200 text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to home</span>
            </Link>
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal mx-auto mb-4"></div>
            <h3 className="text-xl font-semibold text-navy mb-2">Validating reset link</h3>
            <p className="text-navy/70">Please wait while we verify your password reset request...</p>
          </div>
        </main>
      </div>
    );
  }

  if (!isValidToken) {
    return (
      <div className="min-h-screen bg-sand flex flex-col">
        <header className="w-full bg-sand/80 backdrop-blur-sm z-50 border-b border-teal/10 py-3 sm:py-4">
          <div className="container mx-auto px-4 sm:px-6 flex justify-between items-center">
            <Logo />
            <Link
              to="/"
              className="flex items-center gap-1 text-navy hover:text-teal transition-colors duration-200 text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to home</span>
            </Link>
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="glass-card max-w-md w-full shadow-premium overflow-hidden text-center"
          >
            <div className="p-6">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-red-500" />
              </div>
              
              <h2 className="font-display text-xl font-bold text-center mb-4 text-navy">
                Invalid Reset Link
              </h2>
              
              <p className="text-navy/70 mb-6">
                {error}
              </p>
              
              <Link
                to="/"
                className="inline-flex items-center gap-2 px-6 py-3 bg-teal text-white rounded-lg hover:bg-teal/90 transition-colors duration-200 font-medium"
              >
                Request New Reset Link
              </Link>
            </div>
          </motion.div>
        </main>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-sand flex flex-col">
        <header className="w-full bg-sand/80 backdrop-blur-sm z-50 border-b border-teal/10 py-3 sm:py-4">
          <div className="container mx-auto px-4 sm:px-6 flex justify-between items-center">
            <Logo />
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="glass-card max-w-md w-full shadow-premium overflow-hidden text-center"
          >
            <div className="p-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-green-500" />
              </div>
              
              <h2 className="font-display text-xl font-bold text-center mb-4 text-navy">
                Password Updated!
              </h2>
              
              <p className="text-navy/70 mb-6">
                Your password has been successfully updated. You can now log in with your new password.
              </p>
              
              <p className="text-sm text-navy/50">
                Redirecting to homepage in a few seconds...
              </p>
            </div>
          </motion.div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-sand flex flex-col">
      <header className="w-full bg-sand/80 backdrop-blur-sm z-50 border-b border-teal/10 py-3 sm:py-4">
        <div className="container mx-auto px-4 sm:px-6 flex justify-between items-center">
          <Logo />
          <Link
            to="/"
            className="flex items-center gap-1 text-navy hover:text-teal transition-colors duration-200 text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to home</span>
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="glass-card max-w-md w-full shadow-premium overflow-hidden"
        >
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-teal to-teal-400"></div>

          <div className="p-5 sm:p-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-teal/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Lock className="w-8 h-8 text-teal" />
              </div>
              <h2 className="font-display text-xl sm:text-2xl font-bold text-navy">
                Set New Password
              </h2>
              <p className="text-navy/70 text-sm mt-2">
                Enter your new password below
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  New Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
                    value={formData.password}
                    onChange={handleChange}
                    className="w-full pl-10 pr-10 py-3 rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-teal focus:border-transparent text-sm transition-all"
                    placeholder="••••••••"
                    style={{ fontSize: '16px' }}
                    autoComplete="new-password"
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
                <p className="text-xs text-gray-500 mt-1">
                  Must be at least 6 characters
                </p>
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm New Password
                </label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className="w-full pl-10 pr-10 py-3 rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-teal focus:border-transparent text-sm transition-all"
                    placeholder="••••••••"
                    style={{ fontSize: '16px' }}
                    autoComplete="new-password"
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
                className="w-full premium-button-primary py-3 rounded-lg flex items-center justify-center min-h-[44px] text-sm"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Updating Password...
                  </>
                ) : "Update Password"}
              </motion.button>
            </form>

            <div className="mt-6 text-center">
              <Link
                to="/"
                className="text-teal hover:text-teal/80 text-sm font-medium transition-colors"
              >
                Back to homepage
              </Link>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default ResetPasswordPage;