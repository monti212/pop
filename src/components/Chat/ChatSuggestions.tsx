import React from 'react';
import { ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

interface ChatSuggestionsProps {
  suggestions: string[];
  onSelect: (suggestion: string) => void;
  selectedModel?: '2.0';
}

const ChatSuggestions: React.FC<ChatSuggestionsProps> = ({ suggestions, onSelect, selectedModel = '2.0' }) => {
  const getSuggestions = () => {
    if (selectedModel === '2.1') {
      return [
        "Explain photosynthesis and help me prepare for my biology test",
        "Search for: best study techniques for memorizing historical dates",
        "Help me understand quadratic equations with step-by-step examples",
        "Create a study guide for my upcoming literature exam on Shakespeare",
        "Explain the causes and effects of World War II for my history essay"
      ];
    } else if (selectedModel === '2.0') {
      return [
        "Help me solve this algebra problem: 2x + 5 = 15",
        "Search for: fun science experiments I can do at home",
        "Explain the water cycle in simple terms for my presentation",
        "Help me write an essay about climate change",
        "What are the parts of a plant cell and their functions?"
      ];
    } else {
      return [
        "What is 7 times 8?",
        "Search for: how to draw a cat step by step",
        "Spell the word 'beautiful' for me",
        "What are the colors of the rainbow?",
        "How many continents are there?"
      ];
    }
  };

  return (
    <motion.div
      className="bg-white p-3 sm:p-5 rounded-16 border border-borders shadow-card max-w-2xl mx-auto"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.16 }}
    >
      <h3 className="text-xs font-medium text-[#19324A]/70 mb-3 flex items-center">
        <svg className="w-3 h-3 mr-1.5 text-[#f5b233]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
        </svg>
        Try asking our learning assistant
      </h3>
      <div className="space-y-2 flex flex-col">
        {getSuggestions().map((suggestion, index) => (
          <motion.button
            key={index}
            onClick={() => onSelect(suggestion)}
            className="group w-full flex items-center justify-between p-2.5 sm:p-3 rounded-12 text-left bg-sand-200 hover:bg-sand-100 border border-transparent hover:border-orange/20 transition-all duration-200"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ 
              duration: 0.15, 
              delay: index * 0.05,
            }}
          >
            <span className="text-xs text-navy truncate pr-2">{suggestion}</span>
            <div className="bg-orange/10 p-1 rounded-full">
              <ArrowRight className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-orange group-hover:translate-x-0.5 transition-transform duration-200" />
            </div>
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
};

export default ChatSuggestions;