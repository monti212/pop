import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Brain, Search, ExternalLink } from 'lucide-react';

interface Tier {
  version: string;
  tagline: string;
  idealFor: string;
  keyAbilities: string[];
  icon: React.ReactNode;
  color: string;
}

const ProductTiersSection: React.FC = () => {
  const [showComparisonModal, setShowComparisonModal] = useState(false);

  const tiers: Tier[] = [
    {
      version: "Uhuru 2.0",
      tagline: "Advanced reasoning unleashed",
      idealFor: "Professionals, analysts, decision-makers",
      keyAbilities: ["Strategic analysis", "Complex problem-solving", "Creative innovation"],
      icon: <Brain className="w-8 h-8" />,
      color: "from-teal to-teal-600"
    },
    {
      version: "Polymath",
      tagline: "Comprehensive research and analysis",
      idealFor: "Researchers, analysts, strategic planners",
      keyAbilities: ["Deep research capabilities", "Comprehensive data analysis", "Multi-source synthesis"],
      icon: <Search className="w-8 h-8" />,
      color: "from-blue-600 to-indigo-600"
    }
  ];

  return (
    <section className="py-16 sm:py-20 lg:py-24 bg-white">
      <div className="container mx-auto px-4 sm:px-6 max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="font-headline text-3xl sm:text-4xl lg:text-5xl font-bold text-deep-navy mb-4">
            Choose Your Uhuru
          </h2>
          <p className="text-lg text-deep-navy/70 max-w-2xl mx-auto">
            From quick answers to deep research, find the right AI assistant for your workflow.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          {tiers.map((tier, index) => (
            <motion.div
              key={tier.version}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              viewport={{ once: true }}
              className="group relative bg-white rounded-2xl border border-gray-100 p-8 hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
            >
              {/* Icon Header */}
              <div className={`w-16 h-16 rounded-2xl bg-gradient-to-r ${tier.color} p-3 mb-6 text-white`}>
                {tier.icon}
              </div>

              {/* Content */}
              <div className="space-y-4">
                <div>
                  <h3 className="font-headline text-2xl font-bold text-deep-navy mb-2">
                    {tier.version}
                  </h3>
                  <p className="text-deep-navy/60 font-medium">
                    "{tier.tagline}"
                  </p>
                </div>

                <div>
                  <p className="text-sm font-medium text-deep-navy/80 mb-3">
                    Ideal for: {tier.idealFor}
                  </p>
                  
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-deep-navy/80">Key abilities:</p>
                    <ul className="space-y-2">
                      {tier.keyAbilities.map((ability, abilityIndex) => (
                        <li key={abilityIndex} className="flex items-start text-sm text-deep-navy/70">
                          <div className="w-1.5 h-1.5 rounded-full bg-teal mt-2 mr-3 flex-shrink-0"></div>
                          {ability}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              {/* Hover effect */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-teal/5 to-accent-orange/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
            </motion.div>
          ))}
        </div>

        {/* CTA Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.4 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <button
            onClick={() => setShowComparisonModal(true)}
            className="inline-flex items-center gap-2 px-8 py-4 bg-deep-navy text-white rounded-xl font-semibold hover:bg-deep-navy/90 transition-all duration-200 hover:scale-[0.97]"
          >
            <span>Compare All Features</span>
            <ExternalLink className="w-5 h-5" />
          </button>
        </motion.div>

        {/* Comparison Modal */}
        {showComparisonModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-2xl max-w-4xl w-full max-h-[80vh] overflow-auto"
            >
              <div className="p-6 border-b border-gray-100">
                <div className="flex justify-between items-center">
                  <h3 className="font-headline text-2xl font-bold text-deep-navy">
                    Feature Comparison
                  </h3>
                  <button
                    onClick={() => setShowComparisonModal(false)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              <div className="p-6">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left p-4 font-semibold text-deep-navy">Feature</th>
                        <th className="text-center p-4 font-semibold text-deep-navy">Uhuru 2.0</th>
                        <th className="text-center p-4 font-semibold text-deep-navy">Polymath</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-gray-50">
                        <td className="p-4 text-deep-navy">Response Speed</td>
                        <td className="p-4 text-center">🔥 Fast</td>
                        <td className="p-4 text-center">🧠 Comprehensive</td>
                      </tr>
                      <tr className="border-b border-gray-50">
                        <td className="p-4 text-deep-navy">Document Upload</td>
                        <td className="p-4 text-center">✅</td>
                        <td className="p-4 text-center">✅✅</td>
                      </tr>
                      <tr className="border-b border-gray-50">
                        <td className="p-4 text-deep-navy">Research & Analysis</td>
                        <td className="p-4 text-center">Advanced</td>
                        <td className="p-4 text-center">Deep Research</td>
                      </tr>
                      <tr className="border-b border-gray-50">
                        <td className="p-4 text-deep-navy">Multi-language Support</td>
                        <td className="p-4 text-center">25+ languages</td>
                        <td className="p-4 text-center">25+ languages</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </section>
  );
};

export default ProductTiersSection;