import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Mail, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { signIn, resetPassword, signInWithGoogle } from '../services/authService';
import Particles from './Particles';
import Logo from './Logo';

interface LoginModalProps {
  onClose: () => void;
  onSuccess: () => void;
  onSignUp: () => void;
}

const LoginModal: React.FC<LoginModalProps> = ({ onClose, onSuccess, onSignUp }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  
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
    
    if (!formData.email.trim() || !formData.password) {
      setError('I need both your email and password to sign you in.');
      return;
    }
    
    setIsLoading(true);
    
    try {
      const { success, error } = await signIn(formData.email, formData.password);
      
      if (!success) {
        throw new Error(error || 'I couldn\'t log you in. Want to try again?');
      }
      
      onSuccess();
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || 'Those details don\'t look right. Mind double-checking them?');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleGoogleSignIn = async () => {
    setError('');
    setIsGoogleLoading(true);
    
    try {
      const { success, error } = await signInWithGoogle();
      
      if (!success) {
        throw new Error(error || 'Google sign-in isn\'t cooperating. Want to try again?');
      }
      
      // The OAuth flow will redirect the user, so we don't need to call onSuccess here
    } catch (err: any) {
      console.error('Google sign-in error:', err);
      setError(err.message || 'Something went wrong with Google sign-in. Try again?');
      setIsGoogleLoading(false);
    }
  };
  
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    const email = resetEmail.trim() || formData.email.trim();
    
    if (!email) {
      setError('I need your email address to send the reset link.');
      return;
    }
    
    setIsResetting(true);
    
    try {
      const { success, error } = await resetPassword(email);
      
      if (!success) {
        throw new Error(error || 'I couldn\'t send that reset email. Want to try again?');
      }
      
      setResetSuccess(true);
      setError('');
    } catch (err: any) {
      console.error('Password reset error:', err);
      setError(err.message || 'Password reset isn\'t working right now. Try again?');
    } finally {
      setIsResetting(false);
    }
  };
  
  const handleBackToLogin = () => {
    setShowForgotPassword(false);
    setResetSuccess(false);
    setResetEmail('');
    setError('');
  };
  
  return (
    <div className="fixed inset-0 bg-gradient-to-b from-[#E6F2F9] to-[#FEF7E8] flex items-center justify-center z-50 p-3 sm:p-4 overflow-hidden">
      {/* Particles Background */}
      <div className="absolute inset-0 z-0">
        <Particles
          particleColors={['#0170b9', '#f5b233']}
          particleCount={285}
          particleSpread={10}
          speed={0.1}
          particleBaseSize={70}
          moveParticlesOnHover={true}
          alphaParticles={false}
          disableRotation={false}
        />
      </div>

      {/* Logo in top left */}
      <div className="absolute top-6 left-6 z-30">
        <Logo className="h-8" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 4 }}
        transition={{ duration: 0.15 }}
        className="bg-white/95 backdrop-blur-sm rounded-2xl max-w-md w-full shadow-[0_20px_60px_rgba(0,0,0,0.15)] overflow-hidden relative z-10 border border-[#0170b9]/10"
      >
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#0170b9] to-[#f5b233]"></div>
        
        <button 
          className="absolute top-3 right-3 p-2 rounded-12 text-gray-500 hover:text-gray-700 hover:bg-sand-200 transition-colors duration-200"
          onClick={onClose}
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>
        
        <div className="p-5 sm:p-6">
          <h2 className="font-display text-xl sm:text-2xl font-bold text-center mb-2 text-transparent bg-clip-text bg-gradient-to-r from-[#0170b9] to-[#f5b233]">
            {showForgotPassword ? 'Reset Password' : 'Welcome Back'}
          </h2>
          <p className="text-center text-[#002F4B]/70 text-sm mb-6 sm:mb-8">
            {showForgotPassword ? 'Enter your email to reset your password' : 'Continue your learning journey'}
          </p>
          
          {showForgotPassword ? (
            /* Forgot Password Form */
            <div className="space-y-4">
              {resetSuccess ? (
                <div className="text-center py-4">
                  <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Check your email</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                    We've sent a password reset link to your email address. Please check your inbox and follow the instructions to reset your password.
                  </p>
                  <button
                    onClick={handleBackToLogin}
                    className="text-teal dark:text-teal-400 hover:text-teal-600 dark:hover:text-teal-300 font-medium transition-colors text-sm"
                  >
                    Back to login
                  </button>
                </div>
              ) : (
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div>
                    <label htmlFor="resetEmail" className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Email Address
                    </label>
                    <div className="relative">
                      <input
                        id="resetEmail"
                        name="resetEmail"
                        type="email"
                        required
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        className="w-full pl-10 pr-3 py-3 rounded-xl border border-[#0170b9]/20 bg-white text-[#002F4B] focus:ring-2 focus:ring-[#0170b9] focus:border-transparent text-sm transition-all shadow-sm"
                        placeholder="Enter your email address"
                        style={{ fontSize: '16px' }}
                      />
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500 dark:text-gray-400" />
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Enter the email address associated with your account
                    </p>
                  </div>
                  
                  {error && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/30 rounded-lg"
                    >
                      <AlertCircle className="w-5 h-5 text-red-500 dark:text-red-400 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                    </motion.div>
                  )}
                  
                  <motion.button
                    type="submit"
                    disabled={isResetting}
                    className="w-full bg-gradient-to-r from-[#0170b9] to-[#0096B3] hover:from-[#015a94] hover:to-[#007a94] text-white py-3 rounded-xl flex items-center justify-center min-h-[44px] text-sm font-medium transition-all shadow-lg hover:shadow-xl"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {isResetting ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Sending reset link...
                      </>
                    ) : "Send Reset Link"}
                  </motion.button>
                  
                  <div className="text-center">
                    <button
                      type="button"
                      onClick={handleBackToLogin}
                      className="text-teal dark:text-teal-400 hover:text-teal-600 dark:hover:text-teal-300 font-medium transition-colors text-sm"
                    >
                      Back to login
                    </button>
                  </div>
                </form>
              )}
            </div>
          ) : (
            /* Login Form */
            <form onSubmit={handleSubmit} className="space-y-4">

              <div>
                <label htmlFor="email" className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email
                </label>
                <div className="relative">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full pl-10 pr-3 py-3 rounded-xl border border-[#0170b9]/20 bg-white text-[#002F4B] focus:ring-2 focus:ring-[#0170b9] focus:border-transparent text-sm transition-all shadow-sm"
                    placeholder="your@email.com"
                    style={{ fontSize: '16px' }}
                  />
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500 dark:text-gray-400" />
                </div>
              </div>
              
              <div>
                <div className="flex items-center justify-between">
                  <label htmlFor="password" className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Password
                  </label>
                  <button 
                    type="button" 
                    onClick={() => setShowForgotPassword(true)}
                    className="text-xs text-teal dark:text-teal-400 hover:text-teal-600 dark:hover:text-teal-300 transition-colors"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
                    value={formData.password}
                    onChange={handleChange}
                    className="w-full pl-10 pr-10 py-3 rounded-xl border border-[#0170b9]/20 bg-white text-[#002F4B] focus:ring-2 focus:ring-[#0170b9] focus:border-transparent text-sm transition-all shadow-sm"
                    placeholder="••••••••"
                    style={{ fontSize: '16px' }}
                  />
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500 dark:text-gray-400" />
                  <button 
                    type="button"
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              
              {error && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/30 rounded-lg"
                >
                  <AlertCircle className="w-5 h-5 text-red-500 dark:text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                </motion.div>
              )}
              
              <motion.button
                type="submit"
                disabled={isLoading || isGoogleLoading}
                className="w-full bg-gradient-to-r from-[#0170b9] to-[#0096B3] hover:from-[#015a94] hover:to-[#007a94] text-white py-3 rounded-xl flex items-center justify-center min-h-[44px] text-sm font-medium transition-all shadow-lg hover:shadow-xl"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Signing in...
                  </>
                ) : "Sign In"}
              </motion.button>
            </form>
          )}
          
          <div className="mt-5 pt-5 border-t border-[#0170b9]/10 text-center">
            {!showForgotPassword && (
              <p className="text-sm text-[#002F4B]/70">
                Don't have an account?{' '}
                <button
                  onClick={onSignUp}
                  className="text-transparent bg-clip-text bg-gradient-to-r from-[#0170b9] to-[#f5b233] font-semibold hover:opacity-80 transition-opacity"
                >
                  Sign up for free
                </button>
              </p>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default LoginModal;