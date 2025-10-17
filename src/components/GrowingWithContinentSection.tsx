import React from 'react';
import { motion } from 'framer-motion';
import { Users, Globe, Database } from 'lucide-react';

interface PhaseCardProps {
  icon: React.ReactNode;
  date: string;
  description: string;
  delay?: number;
}

const PhaseCard: React.FC<PhaseCardProps> = ({ icon, date, description, delay = 0 }) => {
  return (
    <motion.div
      className="bg-sand rounded-xl p-5 sm:p-6 border border-teal/10 shadow-sm hover:shadow-md transition-all duration-300 h-full"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      viewport={{ once: true }}
    >
      <div className="flex flex-col items-center text-center h-full">
        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-teal/20 flex items-center justify-center mb-3 sm:mb-4">
          {icon}
        </div>
        <div className="px-2 sm:px-3 py-1 rounded-full bg-orange/20 text-orange text-xs font-medium mb-3">
          {date}
        </div>
        <p className="text-navy/80 text-sm sm:text-base flex-grow">
          {description}
        </p>
      </div>
    </motion.div>
  );
};

const GrowingWithContinentSection: React.FC = () => {
  return (
    <section className="py-12 sm:py-16 lg:py-20 bg-sand">
      <div className="container mx-auto px-4 sm:px-6">
        <motion.div 
          className="text-center max-w-3xl mx-auto mb-8 sm:mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
        >
          <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold mb-3 text-navy">Growing with our continent</h2>
        </motion.div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 max-w-5xl mx-auto">
          <PhaseCard
            icon={<Users className="w-6 h-6 sm:w-7 sm:h-7 text-teal" />}
            date="June 2025"
            description="Early-access for 100 users (free, feedback cohort)"
            delay={0}
          />
          
          <PhaseCard
            icon={<Globe className="w-6 h-6 sm:w-7 sm:h-7 text-teal" />}
            date="Q4 2025"
            description="5,000-user public beta with 5 local-language packs"
            delay={0.2}
          />
          
          <PhaseCard
            icon={<Database className="w-6 h-6 sm:w-7 sm:h-7 text-teal" />}
            date="2026"
            description="Full public launch with domain-specific Pax models for health, agriculture, finance, and more"
            delay={0.4}
          />
        </div>
      </div>
    </section>
  );
};

export default GrowingWithContinentSection;