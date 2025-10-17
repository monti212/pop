import React from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, Brain, MessageCircle, Check } from 'lucide-react';

interface StepCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  delay?: number;
}

const StepCard: React.FC<StepCardProps> = ({ icon, title, description, delay = 0 }) => {
  return (
    <motion.div
      className="bg-sand rounded-xl p-5 sm:p-6 border border-teal/10 shadow-sm hover:shadow-md transition-all duration-300 text-center"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      viewport={{ once: true }}
    >
      <div className="flex flex-col items-center">
        <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-teal/20 flex items-center justify-center mb-3 sm:mb-4">
          {icon}
        </div>
        <h3 className="text-lg sm:text-xl font-bold text-navy mb-2">{title}</h3>
        <p className="text-navy/80 text-sm">
          {description}
        </p>
      </div>
    </motion.div>
  );
};

const HowItWorksSection: React.FC = () => {
  return (
    <section className="py-12 sm:py-16 lg:py-20 bg-navy/10">
      <div className="container mx-auto px-4 sm:px-6">
        <motion.div 
          className="text-center max-w-2xl mx-auto mb-8 sm:mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
        >
          <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold mb-3 sm:mb-4 text-navy">How It Works</h2>
        </motion.div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6 max-w-4xl mx-auto">
          <StepCard
            icon={<MessageSquare className="w-6 h-6 sm:w-8 sm:h-8 text-teal" />}
            title="Ask"
            description="Type or speak your question."
            delay={0}
          />
          
          <StepCard
            icon={<Brain className="w-6 h-6 sm:w-8 sm:h-8 text-teal" />}
            title="Uhuru thinks"
            description="Uhuru, an LLM developed for Africa by Africa"
            delay={0.2}
          />
          
          <StepCard
            icon={<MessageCircle className="w-6 h-6 sm:w-8 sm:h-8 text-teal" />}
            title="Uhuru answers"
            description="Clear, actionable responses in your language."
            delay={0.4}
          />
          
          <StepCard
            icon={<Check className="w-6 h-6 sm:w-8 sm:h-8 text-orange" />}
            title="No setup needed"
            description="Just ask."
            delay={0.6}
          />
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;