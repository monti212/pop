import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lightbulb, BookOpen, Sparkles, Brain, Zap, Star } from 'lucide-react';

interface LoadingInsightsProps {
  isVisible: boolean;
  userMessage?: string;
}

// Educational tips and facts categorized by topic
const INSIGHTS = {
  math: [
    { icon: Brain, text: "Did you know? Zero is the only number that cannot be represented in Roman numerals!", color: "text-purple-500" },
    { icon: Sparkles, text: "Fun fact: A 'jiffy' is an actual unit of time - 1/100th of a second!", color: "text-blue-500" },
    { icon: Lightbulb, text: "The word 'mathematics' comes from the Greek 'máthēma' meaning 'knowledge' or 'learning'", color: "text-teal-500" },
    { icon: Star, text: "Quick tip: When adding fractions, always find a common denominator first!", color: "text-orange-500" },
  ],
  science: [
    { icon: Zap, text: "Lightning is five times hotter than the surface of the sun!", color: "text-yellow-500" },
    { icon: Brain, text: "Your brain uses 20% of your body's energy but weighs only 2% of your total body weight", color: "text-purple-500" },
    { icon: Sparkles, text: "Honey never spoils - archaeologists found 3000-year-old honey in Egyptian tombs that was still edible!", color: "text-amber-500" },
    { icon: Lightbulb, text: "The human body contains enough carbon to make 900 pencils!", color: "text-gray-500" },
  ],
  history: [
    { icon: BookOpen, text: "The Great Wall of China is not visible from space with the naked eye", color: "text-red-500" },
    { icon: Star, text: "Cleopatra lived closer to the invention of the iPhone than to the building of the Great Pyramid", color: "text-blue-500" },
    { icon: Brain, text: "The shortest war in history lasted 38 minutes - between Britain and Zanzibar in 1896", color: "text-green-500" },
    { icon: Sparkles, text: "Ancient Egyptians used moldy bread to treat infections - an early form of antibiotics!", color: "text-teal-500" },
  ],
  language: [
    { icon: BookOpen, text: "The word 'alphabet' comes from the first two Greek letters: alpha and beta", color: "text-indigo-500" },
    { icon: Star, text: "English has over 170,000 words in current use, and about 47,000 obsolete words", color: "text-purple-500" },
    { icon: Lightbulb, text: "The sentence 'The quick brown fox jumps over the lazy dog' uses every letter of the alphabet", color: "text-orange-500" },
    { icon: Zap, text: "Reading regularly improves vocabulary, comprehension, and even empathy!", color: "text-pink-500" },
  ],
  writing: [
    { icon: Lightbulb, text: "Writing by hand activates more brain regions than typing!", color: "text-blue-500" },
    { icon: BookOpen, text: "The most common letter in English is 'E' - it appears in 11% of all words", color: "text-green-500" },
    { icon: Star, text: "Pro tip: Read your writing out loud to catch awkward phrasing and errors", color: "text-purple-500" },
    { icon: Brain, text: "Ernest Hemingway wrote standing up - it helped him focus and be concise!", color: "text-teal-500" },
  ],
  general: [
    { icon: Brain, text: "Learning something new creates new neural pathways in your brain!", color: "text-purple-500" },
    { icon: Sparkles, text: "Taking breaks while studying actually improves retention and understanding", color: "text-blue-500" },
    { icon: Lightbulb, text: "Teaching others what you've learned is one of the best ways to remember it", color: "text-teal-500" },
    { icon: Star, text: "Your brain is most creative when you're tired - that's why you get ideas in the shower!", color: "text-orange-500" },
    { icon: Zap, text: "Quick tip: Drinking water before a test can improve performance by up to 10%!", color: "text-cyan-500" },
    { icon: BookOpen, text: "Studies show that handwritten notes lead to better comprehension than typed notes", color: "text-green-500" },
  ],
  lessonPlan: [
    { icon: BookOpen, text: "Engaging lesson plans include activities that appeal to different learning styles!", color: "text-blue-500" },
    { icon: Lightbulb, text: "The 10-2 rule: For every 10 minutes of instruction, give students 2 minutes to process", color: "text-teal-500" },
    { icon: Star, text: "Starting with a hook or question increases student engagement by 40%!", color: "text-purple-500" },
    { icon: Brain, text: "Incorporating movement into lessons improves memory retention significantly", color: "text-orange-500" },
  ],
  assessment: [
    { icon: Brain, text: "Formative assessment helps students learn better than just summative tests alone", color: "text-blue-500" },
    { icon: Lightbulb, text: "Providing specific feedback is more effective than just giving grades", color: "text-teal-500" },
    { icon: Star, text: "Self-assessment helps students become more aware of their own learning process", color: "text-purple-500" },
    { icon: Sparkles, text: "Regular quizzing improves long-term retention more than re-reading material", color: "text-green-500" },
  ],
};

// Detect topic from user message
const detectTopic = (message: string): keyof typeof INSIGHTS => {
  const lowerMessage = message.toLowerCase();

  if (/(math|calcul|equation|algebra|geometry|fraction|number)/i.test(lowerMessage)) return 'math';
  if (/(science|biology|chemistry|physics|experiment|atom|molecule)/i.test(lowerMessage)) return 'science';
  if (/(history|historical|ancient|war|civilization|century|past)/i.test(lowerMessage)) return 'history';
  if (/(language|grammar|vocabulary|word|sentence|reading)/i.test(lowerMessage)) return 'language';
  if (/(write|writing|essay|paragraph|story|composition)/i.test(lowerMessage)) return 'writing';
  if (/(lesson plan|teaching|curriculum|classroom|student)/i.test(lowerMessage)) return 'lessonPlan';
  if (/(assess|test|quiz|exam|grade|evaluation)/i.test(lowerMessage)) return 'assessment';

  return 'general';
};

const LoadingInsights: React.FC<LoadingInsightsProps> = ({ isVisible, userMessage = '' }) => {
  const [currentInsight, setCurrentInsight] = useState(0);
  const [insights, setInsights] = useState<Array<{ icon: any; text: string; color: string }>>([]);

  useEffect(() => {
    if (isVisible && userMessage) {
      const topic = detectTopic(userMessage);
      const topicInsights = INSIGHTS[topic];

      // Shuffle insights to provide variety
      const shuffled = [...topicInsights].sort(() => Math.random() - 0.5);
      setInsights(shuffled);
      setCurrentInsight(0);
    }
  }, [isVisible, userMessage]);

  useEffect(() => {
    if (!isVisible || insights.length === 0) return;

    // Rotate through insights every 4 seconds
    const interval = setInterval(() => {
      setCurrentInsight((prev) => (prev + 1) % insights.length);
    }, 4000);

    return () => clearInterval(interval);
  }, [isVisible, insights.length]);

  if (!isVisible || insights.length === 0) return null;

  const insight = insights[currentInsight];
  const Icon = insight.icon;

  return (
    <div className="flex justify-center my-4">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentInsight}
          initial={{ opacity: 0, y: 10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          transition={{ duration: 0.3 }}
          className="max-w-md mx-auto"
        >
          <div className="bg-gradient-to-r from-white to-gray-50 border border-gray-200 rounded-2xl p-4 shadow-lg">
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-xl bg-gradient-to-br from-gray-50 to-white border border-gray-200 ${insight.color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Did you know?
                  </span>
                  <div className="flex gap-1">
                    {insights.map((_, idx) => (
                      <div
                        key={idx}
                        className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                          idx === currentInsight ? 'bg-teal w-4' : 'bg-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                </div>
                <p className="text-sm text-gray-700 leading-relaxed">
                  {insight.text}
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default LoadingInsights;
