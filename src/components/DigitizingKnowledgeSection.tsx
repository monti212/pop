import React from 'react';
import { motion } from 'framer-motion';
import { FileText, Globe, Shield } from 'lucide-react';

interface FeatureProps {
  icon: React.ReactNode;
  title: string;
  description: React.ReactNode;
  delay?: number;
}

const Feature: React.FC<FeatureProps> = ({ icon, title, description, delay = 0 }) => {
  return (
    <motion.div
      className="bg-white rounded-xl p-5 sm:p-6 border border-teal/10 shadow-sm hover:shadow-md transition-all duration-300"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      viewport={{ once: true }}
    >
      <div className="flex flex-col h-full">
        <div className="flex items-center mb-4">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-teal/20 flex items-center justify-center mr-3 sm:mr-4 flex-shrink-0">
            {icon}
          </div>
          <h3 className="text-lg sm:text-xl font-bold text-navy">{title}</h3>
        </div>
        <div className="text-navy/80 text-sm">
          {description}
        </div>
      </div>
    </motion.div>
  );
};

const DigitizingKnowledgeSection: React.FC = () => {
  return (
    <section className="py-12 sm:py-16 lg:py-20 bg-navy/5">
      <div className="container mx-auto px-4 sm:px-6">
        <motion.div 
          className="text-center max-w-2xl mx-auto mb-8 sm:mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
        >
          <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold mb-3 sm:mb-4 text-navy">We digitise the undigitised</h2>
          <p className="text-navy/80 text-sm sm:text-base lg:text-lg">
            Hand-typed court judgments, land-board bylaws filed in steel cabinets, rainfall and soil readings logged in field notebooks, even family proverbs shared around the evening fire—OrionX captures it all. We transcribe, tag, and align these once-offline treasures so Alke can reason with Africa's lived reality, not just its web pages.
          </p>
        </motion.div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 max-w-5xl mx-auto">
          <Feature
            icon={<Globe className="w-5 h-5 sm:w-6 sm:h-6 text-teal" />}
            title="African nuance, built in"
            description={
              <div className="space-y-2 sm:space-y-3">
                <p>Alke effortlessly:</p>
                <ul className="space-y-2">
                  <li className="flex items-start">
                    <div className="w-1.5 h-1.5 rounded-full bg-teal mt-1.5 mr-2 flex-shrink-0"></div>
                    <span>Understands code-switching between English and Setswana</span>
                  </li>
                  <li className="flex items-start">
                    <div className="w-1.5 h-1.5 rounded-full bg-teal mt-1.5 mr-2 flex-shrink-0"></div>
                    <span>Distinguishes villages that share one name</span>
                  </li>
                  <li className="flex items-start">
                    <div className="w-1.5 h-1.5 rounded-full bg-teal mt-1.5 mr-2 flex-shrink-0"></div>
                    <span>Knows the school calendar and planting windows</span>
                  </li>
                </ul>
              </div>
            }
            delay={0}
          />
          
          <Feature
            icon={<Shield className="w-5 h-5 sm:w-6 sm:h-6 text-teal" />}
            title="Responsible AI from day one"
            description={
              <div className="space-y-2 sm:space-y-3">
                <ul className="space-y-2">
                  <li className="flex items-start">
                    <div className="w-1.5 h-1.5 rounded-full bg-teal mt-1.5 mr-2 flex-shrink-0"></div>
                    <span>Ethics-by-design: every dataset passes bias review</span>
                  </li>
                  <li className="flex items-start">
                    <div className="w-1.5 h-1.5 rounded-full bg-teal mt-1.5 mr-2 flex-shrink-0"></div>
                    <span>Quarterly red-team audits stress-test safety</span>
                  </li>
                  <li className="flex items-start">
                    <div className="w-1.5 h-1.5 rounded-full bg-teal mt-1.5 mr-2 flex-shrink-0"></div>
                    <span>Transparent provenance: each document is trace-tagged</span>
                  </li>
                </ul>
              </div>
            }
            delay={0.2}
          />
          
          <Feature
            icon={<FileText className="w-5 h-5 sm:w-6 sm:h-6 text-teal" />}
            title="Local knowledge, global impact"
            description={
              <div className="space-y-2 sm:space-y-3">
                <p>By integrating local knowledge with global AI capabilities:</p>
                <ul className="space-y-2">
                  <li className="flex items-start">
                    <div className="w-1.5 h-1.5 rounded-full bg-teal mt-1.5 mr-2 flex-shrink-0"></div>
                    <span>Preserves cultural heritage while making it actionable</span>
                  </li>
                  <li className="flex items-start">
                    <div className="w-1.5 h-1.5 rounded-full bg-teal mt-1.5 mr-2 flex-shrink-0"></div>
                    <span>Bridges offline expertise with digital innovation</span>
                  </li>
                  <li className="flex items-start">
                    <div className="w-1.5 h-1.5 rounded-full bg-teal mt-1.5 mr-2 flex-shrink-0"></div>
                    <span>Empowers decision-making with context-aware intelligence</span>
                  </li>
                </ul>
              </div>
            }
            delay={0.4}
          />
        </div>
      </div>
    </section>
  );
};

export default DigitizingKnowledgeSection;