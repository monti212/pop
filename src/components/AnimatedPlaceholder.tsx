import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface AnimatedPlaceholderProps {
  isFocused: boolean;
}

const placeholderTexts = [
  // Personal Life (3)
  "Help me create a weekly meal plan for my family",
  "I need advice on managing stress from work",
  "Write a prayer for my morning meditation",

  // Work Life (4)
  "Draft a business proposal for my farming cooperative",
  "Help me write a professional email to a client",
  "Create a budget plan for my small retail shop",
  "Translate this document from English to Swahili"
];

const AnimatedPlaceholder: React.FC<AnimatedPlaceholderProps> = ({ isFocused }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (isFocused) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % placeholderTexts.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [isFocused]);

  if (isFocused) return null;

  return (
    <div className="flex items-center justify-start pointer-events-none w-full h-full pl-[0.95cm]">
      <AnimatePresence mode="wait">
        <motion.span
          key={currentIndex}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
          className="text-sm text-[#19324A]/50 text-left"
        >
          {placeholderTexts[currentIndex]}
        </motion.span>
      </AnimatePresence>
    </div>
  );
};

export default AnimatedPlaceholder;
