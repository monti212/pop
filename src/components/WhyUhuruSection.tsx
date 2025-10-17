import React from 'react';
import { motion } from 'framer-motion';
import { Globe, Wifi, Leaf, TrendingUp, Zap } from 'lucide-react';

const WhyUhuruSection: React.FC = () => {
  const features = [
    {
      icon: <Globe className="w-6 h-6 text-teal" />,
      text: "Available in multiple languages for global accessibility"
    },
    {
      icon: <Wifi className="w-6 h-6 text-teal" />,
      text: "Works on any device - mobile, tablet, or computer"
    },
    {
      icon: <Zap className="w-6 h-6 text-teal" />,
      text: "Instant answers and explanations for homework help"
    },
    {
      icon: <TrendingUp className="w-6 h-6 text-teal" />,
      text: "Proven to improve student learning outcomes"
    }
  ];

  return (
    <section className="py-16 sm:py-20 lg:py-24 bg-off-white">
      <div className="container mx-auto px-4 sm:px-6 max-w-7xl">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.16 }}
            viewport={{ once: true }}
            className="space-y-8 text-center"
          >
            <div>
              <h2 className="font-headline text-3xl sm:text-4xl lg:text-5xl font-bold text-deep-navy mb-6">
                Why Choose Our Platform?
              </h2>
              <p className="text-lg text-deep-navy/70 mb-8">
                Free, accessible AI-powered learning that empowers every student to reach their full potential.
                Quality education shouldn't have barriers - we're making it available to all.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
              {features.map((feature, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.16, delay: index * 0.05 }}
                  viewport={{ once: true }}
                  className="flex items-start gap-4 text-left"
                >
                  <div className="w-12 h-12 rounded-xl bg-teal/10 flex items-center justify-center flex-shrink-0">
                    {feature.icon}
                  </div>
                  <div>
                    <p className="text-deep-navy font-medium text-lg">
                      {feature.text}
                    </p>
                  </div>
                </motion.div>
              ))}
              
              {/* Special highlight for Uhuru 2.5 */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.4 }}
                viewport={{ once: true }}
                className="md:col-span-2 p-6 rounded-xl bg-gradient-to-r from-[#E6F2F9] via-[#FEF7E8] to-[#E6F2F9] border border-[#0170b9]/30"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-[#0170b9] to-[#f5b233] flex items-center justify-center flex-shrink-0">
                    <Leaf className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-deep-navy font-bold text-xl mb-2">Building a Better Future Through Education</h3>
                    <p className="text-deep-navy/80">
                      Every student deserves access to quality education. Our AI learning assistant provides
                      personalized support, helping students understand concepts, complete assignments, and
                      develop critical thinking skills that will serve them for life.
                    </p>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default WhyUhuruSection;