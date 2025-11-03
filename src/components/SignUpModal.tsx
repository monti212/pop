import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Mail, User, Lock, Eye, EyeOff, AlertCircle, ArrowRight, Smartphone } from 'lucide-react';
import { signUp, signInWithGoogle } from '../services/authService';
import Particles from './Particles';
import Logo from './Logo';
import SocialAuthButton from './SocialAuthButton';
import PhoneAuthModal from './PhoneAuthModal';

interface SignUpModalProps {
  onClose: () => void;
  onSuccess: () => void;
  onSignIn: () => void;
  isHeroInputSignup?: boolean;
  initialQuestion?: string | null;
}

const SignUpModal: React.FC<SignUpModalProps> = ({ 
  onClose, 
  onSuccess, 
  onSignIn,
  isHeroInputSignup = false,
  initialQuestion = null
}) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showPhoneAuth, setShowPhoneAuth] = useState(false);
  
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
    if (!formData.name.trim()) {
      setError('I\'d love to know your name first.');
      return;
    }
    
    if (!formData.email.trim()) {
      setError('I need your email address to set up your account.');
      return;
    }
    
    if (!formData.password) {
      setError('You\'ll need a password to keep your account secure.');
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
      const { success, error, user } = await signUp(
        formData.email,
        formData.password,
        formData.name
      );
      
      if (!success) {
        throw new Error(error || 'I couldn\'t set up your account. Want to try again?');
      }
      
      // Normal signup flow
      console.log('Signup successful, proceeding to checkout');
      onSuccess();
    } catch (err: any) {
      console.error('Error signing up:', err);
      setError(err.message || 'Account creation isn\'t working right now. Try again?');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setError('');
    setIsGoogleLoading(true);

    try {
      const { success, error } = await signInWithGoogle();

      if (!success) {
        throw new Error(error || 'Google sign-up isn\'t cooperating. Want to try again?');
      }

      // The OAuth flow will redirect the user, so we don't need to call onSuccess here
    } catch (err: any) {
      console.error('Google sign-up error:', err);
      setError(err.message || 'Something went wrong with Google sign-up. Try again?');
      setIsGoogleLoading(false);
    }
  };
  
  return (
    <div className="fixed inset-0 bg-gradient-to-b from-[#E6F2F9] to-[#FEF7E8] flex items-center justify-center z-50 p-3 sm:p-4 overflow-hidden">
      {/* Particles Background */}
      <div className="absolute inset-0 z-0">
        <Particles
          particleColors={['#0170b9', '#f5b233']}
          particleCount={100}
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
            {isHeroInputSignup ? 'Sign up to continue' : 'Create Your Account'}
          </h2>
          <p className="text-center text-[#002F4B]/70 text-sm mb-4 sm:mb-6">
            {isHeroInputSignup ? 'Continue chatting with Uhuru' : 'Join our learning community'}
          </p>
          
          {isHeroInputSignup && initialQuestion && (
            <div className="mb-4 p-3 bg-gradient-to-r from-[#0170b9]/5 to-[#f5b233]/5 border border-[#0170b9]/20 rounded-xl">
              <p className="text-sm text-[#002F4B] font-medium">
                <strong>Your question:</strong> "{initialQuestion}"
              </p>
              <p className="text-xs text-[#002F4B]/70 mt-1">
                Create your account to get Uhuru's response and continue the conversation.
              </p>
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-4">

            <div>
              <label htmlFor="name" className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Full Name
              </label>
              <div className="relative">
                <input
                  id="name"
                  name="name"
                  type="text"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full pl-10 pr-3 py-3 rounded-xl border border-[#0170b9]/20 bg-white text-[#002F4B] focus:ring-2 focus:ring-[#0170b9] focus:border-transparent text-sm transition-all shadow-sm"
                  placeholder="Your name"
                  style={{ fontSize: '16px' }}
                />
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500 dark:text-gray-400" />
              </div>
            </div>
            
            <div>
              <label htmlFor="email" className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Email
              </label>
              <div className="relative">
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full pl-10 pr-3 py-3 rounded-xl border border-[#0170b9]/20 bg-white text-[#002F4B] focus:ring-2 focus:ring-[#0170b9] focus:border-transparent text-sm transition-all shadow-sm"
                  placeholder="your@email.com"
                  required
                  style={{ fontSize: '16px' }}
                />
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500 dark:text-gray-400" />
              </div>
            </div>
            
            <div>
              <label htmlFor="password" className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full pl-10 pr-10 py-3 rounded-xl border border-[#0170b9]/20 bg-white text-[#002F4B] focus:ring-2 focus:ring-[#0170b9] focus:border-transparent text-sm transition-all shadow-sm"
                  placeholder="••••••••"
                  required
                  style={{ fontSize: '16px' }}
                />
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500 dark:text-gray-400" />
                <button 
                  type="button"
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors duration-200"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 ml-1">
                Must be at least 6 characters
              </p>
            </div>
            
            <div>
              <label htmlFor="confirmPassword" className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="w-full pl-10 pr-10 py-3 rounded-xl border border-[#0170b9]/20 bg-white text-[#002F4B] focus:ring-2 focus:ring-[#0170b9] focus:border-transparent text-sm transition-all shadow-sm"
                  placeholder="••••••••"
                  required
                  style={{ fontSize: '16px' }}
                />
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500 dark:text-gray-400" />
                <button 
                  type="button"
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors duration-200"
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
                className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/30 rounded-lg"
              >
                <AlertCircle className="w-5 h-5 text-red-500 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
              </motion.div>
            )}
            
            <motion.button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-[#0170b9] to-[#0096B3] hover:from-[#015a94] hover:to-[#007a94] text-white py-3 rounded-xl flex items-center justify-center gap-2 min-h-[44px] text-sm font-medium transition-all shadow-lg hover:shadow-xl"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating Account...
                </>
              ) : (
                <>
                  Create Free Account <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </>
              )}
            </motion.button>

            <div className="relative my-5">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#0170b9]/10"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-gray-500">Or sign up with</span>
              </div>
            </div>

            <div className="space-y-2">
              <SocialAuthButton
                provider="Google"
                icon={Mail}
                onClick={handleGoogleSignUp}
                isLoading={isGoogleLoading}
                disabled={isLoading}
              />
              <SocialAuthButton
                provider="Phone"
                icon={Smartphone}
                onClick={() => setShowPhoneAuth(true)}
                disabled={isLoading || isGoogleLoading}
              />
            </div>

            <div className="pt-4 text-center">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                By creating an account, you agree to our{' '}
                <a href="/terms" className="text-teal dark:text-teal-400 hover:underline">Terms</a> and{' '}
                <a href="/privacy" className="text-teal dark:text-teal-400 hover:underline">Privacy Policy</a>
              </p>
            </div>
          </form>

          <div className="mt-5 pt-5 border-t border-[#0170b9]/10 text-center">
            <p className="text-sm text-[#002F4B]/70">
              Already have an account?{' '}
              <button
                onClick={onSignIn}
                className="text-transparent bg-clip-text bg-gradient-to-r from-[#0170b9] to-[#f5b233] font-semibold hover:opacity-80 transition-opacity"
              >
                Log in
              </button>
            </p>
          </div>
        </div>
      </motion.div>

      {showPhoneAuth && (
        <PhoneAuthModal
          onClose={() => setShowPhoneAuth(false)}
          onSuccess={() => {
            setShowPhoneAuth(false);
            onSuccess();
          }}
          onSwitchToEmail={() => setShowPhoneAuth(false)}
        />
      )}
    </div>
  );
};

export default SignUpModal;