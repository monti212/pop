import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown, Send } from 'lucide-react';
import AuthButtons from './AuthButtons';
import Particles from './Particles';
import AnimatedPlaceholder from './AnimatedPlaceholder';
import Logo from './Logo';

interface HeroProps {
  onInitialQuestionSubmit: (question: string) => void;
  onSignIn?: () => void;
  onSignUp?: () => void;
  isAuthenticated?: boolean;
}

const Hero: React.FC<HeroProps> = ({
  onInitialQuestionSubmit,
  onSignIn,
  onSignUp,
  isAuthenticated = false
}) => {
  const [animateBackground, setAnimateBackground] = useState(true);
  const [question, setQuestion] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  
  // Disable animation for reduced motion preference
  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setAnimateBackground(!prefersReducedMotion);
  }, []);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (question.trim()) {
      onInitialQuestionSubmit(question);
      setQuestion('');
    }
  };
  
  return (
    <section className="min-h-[100svh] relative overflow-hidden bg-gradient-to-b from-[#E6F2F9] to-[#FEF7E8] dark:from-[#0165A7] dark:to-[#E5A01E] transition-colors duration-300">
      {/* Background decoration */}
      
      <div className="absolute inset-0 z-0">
        <div style={{ width: '100%', height: '100%', position: 'absolute' }}>
          <Particles
            particleColors={['#0170b9', '#f5b233']}
            particleCount={100}
            particleSpread={10}
            speed={0.1}
            particleBaseSize={100}
            moveParticlesOnHover={true}
            alphaParticles={false}
            disableRotation={false}
          />
        </div>
      </div>
      
      {/* Pencils of Promise Logo in top left */}
      <div className="absolute top-6 left-6 z-30">
        <Logo className="h-8" />
      </div>

      {/* Auth buttons in top right */}
      {!isAuthenticated && (onSignIn && onSignUp) && (
        <div className="absolute top-6 right-6 z-30">
          <AuthButtons
            isAuthenticated={isAuthenticated}
            onSignIn={onSignIn}
            onSignUp={onSignUp}
            heroMode={true}
          />
        </div>
      )}
      
      <div className="container mx-auto px-4 sm:px-6 h-full flex flex-col">
        {/* Centered content layout */}
        <div className="flex-1 flex items-center justify-center min-h-[calc(100vh-80px)]">
          {/* Centered text content */}
          <motion.div 
            className="flex flex-col justify-center items-center text-center max-w-4xl relative z-20 px-4"
          >
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.16 }}
              className="font-headline text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-deep-navy mb-6 leading-tight"
            >
              Empowering Education<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0170b9] to-[#f5b233]">Through Learning</span>
            </motion.h1>
            
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.16, delay: 0.08 }}
              className="text-xl sm:text-2xl md:text-3xl text-deep-navy/80 mb-8 font-medium"
            >
              Your AI-powered learning assistant - helping students and educators create a better world through education
            </motion.h2>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.16, delay: 0.12 }}
              className="w-full max-w-2xl mx-auto"
            >
              <form onSubmit={handleSubmit} className="flex items-center gap-2 relative">
                <div className="flex-1 bg-white rounded-xl shadow-lg border border-teal/20 relative">
                  <input
                    type="text"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    placeholder="Ask me anything..."
                    className="w-full px-6 py-4 text-base text-navy bg-transparent border-none focus:outline-none rounded-xl"
                    style={{ fontSize: '16px' }}
                  />
                </div>
                <motion.button
                  type="submit"
                  disabled={!question.trim()}
                  className={`p-4 rounded-xl shadow-lg border border-teal/20 transition-all duration-200 ${
                    question.trim()
                      ? 'bg-orange hover:bg-orange/90 text-white shadow-glow'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                  whileHover={question.trim() ? { scale: 1.05 } : {}}
                  whileTap={question.trim() ? { scale: 0.95 } : {}}
                  transition={{ duration: 0.15 }}
                >
                  <Send className="w-6 h-6" />
                </motion.button>
              </form>
              
              <p className="text-center text-navy/60 text-sm mt-4">
                Free educational AI for students and teachers • Making quality education accessible to all
              </p>
            </motion.div>
          </motion.div>
        </div>
        
        {/* Scroll indicator */}
      </div>
    </section>
  );
};

export default Hero;