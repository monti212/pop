import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Mail, Lock, Eye, EyeOff, AlertCircle, ArrowLeft } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { signIn } from '../services/authService';
import Logo from '../components/Logo';

const AdminLogin: React.FC = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

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

    const email = formData.email.trim();
    const password = formData.password;

    if (!email || !password) {
      setError('I need both your email and password to continue.');
      return;
    }

    setIsLoading(true);

    try {
      const { success, error: authError } = await signIn(email, password);

      if (!success) {
        setError(authError || 'I couldn\'t log you in as admin. Want to try again?');
        return;
      }

      // After successful sign in, AdminRoute will check team_role and redirect appropriately
      navigate('/admin');
    } catch (err: any) {
      console.error('Admin login error:', err);
      setError('Something unexpected happened during login. Try again?');
    } finally {
      setIsLoading(false);
    }
  };

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
            <h2 className="font-display text-xl sm:text-2xl font-bold text-center mb-6 sm:mb-8 text-navy">
              Admin Login
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
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
                    className="w-full pl-10 pr-3 py-3 rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-teal focus:border-transparent text-sm transition-all"
                    placeholder="your@email.com"
                    style={{ fontSize: '16px' }}
                    autoComplete="email"
                  />
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                  Password
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
                    autoComplete="current-password"
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
                    Signing in...
                  </>
                ) : "Admin Sign In"}
              </motion.button>
            </form>
          </div>
        </motion.div>
      </main>

      <footer className="py-4 border-t border-teal/10 text-center text-sm text-navy/60">
        <div className="container mx-auto px-4">
          <p>© 2025 OrionX. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default AdminLogin;