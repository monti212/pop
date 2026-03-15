import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown, ChevronUp, HelpCircle } from 'lucide-react';

interface FAQItemProps {
  question: string;
  answer: string;
  isOpen: boolean;
  toggleOpen: () => void;
  delay?: number;
}

const FAQItem: React.FC<FAQItemProps> = ({ 
  question, 
  answer, 
  isOpen, 
  toggleOpen,
  delay = 0 
}) => {
  return (
    <motion.div
      className="border-b border-teal/10 last:border-0"
      initial={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.16, delay }}
      viewport={{ once: true }}
    >
      <button
        className="flex justify-between items-center w-full py-4 text-left focus:outline-none"
        onClick={toggleOpen}
        aria-expanded={isOpen}
      >
        <span className="font-medium text-navy text-sm sm:text-base">{question}</span>
        {isOpen ? (
          <ChevronUp className="w-5 h-5 text-teal flex-shrink-0" />
        ) : (
          <ChevronDown className="w-5 h-5 text-teal flex-shrink-0" />
        )}
      </button>
      
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: isOpen ? 'auto' : 0, opacity: isOpen ? 1 : 0 }}
        transition={{ duration: 0.3 }}
        className="overflow-hidden"
      >
        <div className="pb-4 text-navy/80 text-sm">
          {answer}
        </div>
      </motion.div>
    </motion.div>
  );
};

const FAQSection: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  
  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };
  
  // Updated FAQs based on SEO plan
  const faqs = [
    {
      question: "Is Uhuru open source?",
      answer: "Uhuru's core AI models are proprietary, but we're committed to transparency. We publish research papers about our training methodologies and actively contribute to open-source AI tools for African languages."
    },
    {
      question: "Does Uhuru work offline?",
      answer: "Yes! Uhuru has offline capabilities for basic queries and works efficiently on low-bandwidth connections. We also support WhatsApp and USSD access for areas with limited internet connectivity."
    },
    {
      question: "How secure is my data?",
      answer: "Your data security is our priority. We use end-to-end encryption, comply with international data protection standards, and by default, your conversations are private and not used for training our models."
    },
    {
      question: "Which payment methods do you accept?",
      answer: "We accept all major credit cards, mobile money (MTN, Airtel, Vodacom), and bank transfers. For Business plans, we also support invoicing and corporate purchase orders."
    },
    {
      question: "Can I upgrade later?",
      answer: "Absolutely! You can upgrade or downgrade your plan at any time. Changes take effect immediately, and we'll prorate any billing differences."
    },
    {
      question: "Where is Uhuru trained?",
      answer: "Uhuru is trained on diverse African datasets including local languages, cultural contexts, legal frameworks, and business practices. Our training data spans 20+ African countries to ensure cultural relevance and accuracy."
    }
  ];

  return (
    <section className="py-12 sm:py-16 lg:py-20 bg-sand">
      <div className="container mx-auto px-4 sm:px-6">
        <motion.div 
          className="text-center max-w-2xl mx-auto mb-8 sm:mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
        >
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-teal/20 flex items-center justify-center mx-auto mb-4">
            <HelpCircle className="w-6 h-6 sm:w-7 sm:h-7 text-teal" />
          </div>
          <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold mb-2 sm:mb-3 text-navy">Frequently Asked Questions</h2>
          <p className="text-navy/80 text-base mb-4">
            The free version is available now with 25 free messages daily!
          </p>
        </motion.div>
        
        <div className="max-w-3xl mx-auto bg-white rounded-xl p-4 sm:p-6 lg:p-8 border border-teal/10 shadow-sm">
          {faqs.map((faq, index) => (
            <FAQItem
              key={index}
              question={faq.question}
              answer={faq.answer}
              isOpen={openIndex === index}
              toggleOpen={() => toggleFAQ(index)}
              delay={index * 0.1}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default FAQSection;