import React from 'react';
import { motion } from 'framer-motion';
import { Cpu, Globe, Shield, Zap } from 'lucide-react';

const UhuruLLMSection: React.FC = () => {
  const features = [
    {
      icon: <Cpu className="w-6 h-6 text-teal" />,
      title: "Personalized Learning",
      description: "AI-powered tutoring that adapts to each student's unique learning style and pace."
    },
    {
      icon: <Globe className="w-6 h-6 text-teal" />,
      title: "Accessible Everywhere",
      description: "Available in multiple languages, making quality education accessible to all students globally."
    },
    {
      icon: <Shield className="w-6 h-6 text-teal" />,
      title: "Safe & Secure",
      description: "Student data is protected with world-class security and privacy measures."
    },
    {
      icon: <Zap className="w-6 h-6 text-teal" />,
      title: "Instant Support",
      description: "Get help anytime, anywhere with 24/7 AI-powered learning assistance."
    }
  ];

  return (
    <section className="py-16 sm:py-20 lg:py-24 bg-gradient-to-b from-white to-off-white">
      <div className="container mx-auto px-4 sm:px-6 max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.16 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="font-headline text-3xl sm:text-4xl lg:text-5xl font-bold text-deep-navy mb-6">
            AI-Powered Learning for Every Student
          </h2>
          <p className="text-lg text-deep-navy/70 max-w-3xl mx-auto mb-4">
            Our AI learning assistant helps students learn better, teachers teach more effectively, and schools create lasting impact in their communities.
          </p>
          <div className="w-24 h-1 bg-gradient-to-r from-[#0170b9] to-[#f5b233] mx-auto rounded-full"></div>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.16, delay: index * 0.05 }}
              viewport={{ once: true }}
              className="text-center group"
            >
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal/10 to-teal/20 flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                {feature.icon}
              </div>
              <h3 className="font-headline text-xl font-bold text-deep-navy mb-3">
                {feature.title}
              </h3>
              <p className="text-deep-navy/70 leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          viewport={{ once: true }}
          className="bg-gradient-to-r from-blue-900 via-indigo-900 to-cyan-900 rounded-3xl p-8 sm:p-12 text-center text-white relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-[#0170b9]/20 via-[#f5b233]/20 to-[#0170b9]/20 animate-pulse"></div>
          <div className="relative z-10">
            <h3 className="font-headline text-2xl sm:text-3xl font-bold mb-4">
              Advanced Learning Intelligence
            </h3>
            <p className="text-lg text-white/80 max-w-2xl mx-auto mb-8">
              Our AI provides personalized tutoring, homework help, and study assistance tailored to each student's needs.
              Get instant explanations, practice problems, and learning guidance across all subjects.
            </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
            <div>
              <div className="text-3xl font-bold text-[#f5b233] mb-2">24/7</div>
              <div className="text-sm text-white/70">Learning Support</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-[#f5b233] mb-2">50+</div>
              <div className="text-sm text-white/70">Subjects Covered</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-[#f5b233] mb-2">100%</div>
              <div className="text-sm text-white/70">Free for Students</div>
            </div>
          </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default UhuruLLMSection;