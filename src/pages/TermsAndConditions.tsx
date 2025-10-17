import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import Logo from '../components/Logo';
import NewFooter from '../components/NewFooter';
import { ArrowLeft } from 'lucide-react';

const TermsAndConditions: React.FC = () => {
  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-sand text-navy flex flex-col">
      {/* Header */}
      <header className="w-full bg-sand/80 backdrop-blur-sm z-50 border-b border-teal/10 py-3 sm:py-4">
        <div className="container mx-auto px-4 sm:px-6 flex justify-between items-center">
          <Logo />
          <Link 
            to="/" 
            className="flex items-center gap-1 text-navy hover:text-teal transition-colors duration-200 text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to home</span>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        <div className="container mx-auto px-4 sm:px-6 py-8 sm:py-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="max-w-4xl mx-auto">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-8 text-navy">Terms and Conditions</h1>
              
              <div className="prose prose-sm sm:prose lg:prose-lg max-w-none text-navy/80">
                <h2>1. Introduction</h2>
                <p>These Terms and Conditions govern your use of OrionX, including Hilous AI assistant, websites, and other services (collectively, the "Services"). By accessing or using our Services, you agree to be bound by these Terms and Conditions.</p>

                <h2>2. Definitions</h2>
                <p>"OrionX" refers to Orion X Limited, a company registered in Botswana.</p>
                <p>"Hilous" refers to the AI assistant developed by OrionX.</p>
                <p>"Pax" refers to the large language model powering Hilous.</p>
                <p>"User", "you", or "your" refers to the individual or entity accessing or using the Services.</p>
                <p>"Content" refers to any information, data, text, software, images, audio, video, or other materials that may be viewed or accessed through the Services.</p>

                <h2>3. Use of Services</h2>
                <p>3.1 You must be at least 18 years old to use our Services. If you are under 18, you must have your parent's or legal guardian's permission to use our Services.</p>
                <p>3.2 You agree to use our Services only for lawful purposes and in accordance with these Terms and Conditions.</p>
                <p>3.3 You are prohibited from using our Services:</p>
                <ul>
                  <li>In any way that violates any applicable local, national, or international law or regulation.</li>
                  <li>To send, knowingly receive, upload, download, use, or re-use any material that does not comply with our Content Standards.</li>
                  <li>To transmit, or procure the sending of, any advertising or promotional material, including any "junk mail", "chain letter", "spam", or any other similar solicitation.</li>
                  <li>To impersonate or attempt to impersonate OrionX, an OrionX employee, another user, or any other person or entity.</li>
                  <li>To engage in any other conduct that restricts or inhibits anyone's use or enjoyment of our Services, or which, as determined by us, may harm OrionX or users of our Services or expose them to liability.</li>
                </ul>

                <h2>4. User Accounts</h2>
                <p>4.1 You may need to create an account to use some of our Services. You are responsible for maintaining the confidentiality of your account information, including your password.</p>
                <p>4.2 You are responsible for all activities that occur under your account. You agree to notify OrionX immediately of any unauthorized use of your account or any other breach of security.</p>
                <p>4.3 OrionX reserves the right to disable any user account at any time if, in our opinion, you have failed to comply with any provision of these Terms and Conditions.</p>

                <h2>5. Intellectual Property Rights</h2>
                <p>5.1 The Services and their entire contents, features, and functionality (including but not limited to all information, software, text, displays, images, video, and audio, and the design, selection, and arrangement thereof), are owned by OrionX, its licensors, or other providers of such material and are protected by copyright, trademark, patent, trade secret, and other intellectual property or proprietary rights laws.</p>
                <p>5.2 You are granted a limited license to access and use the Services and to download or print a copy of any portion of the Content to which you have properly gained access solely for your personal, non-commercial use.</p>
                <p>5.3 You must not reproduce, distribute, modify, create derivative works of, publicly display, publicly perform, republish, download, store, or transmit any of the material on our Services, except as follows:</p>
                <ul>
                  <li>Your computer may temporarily store copies of such materials in RAM incidental to your accessing and viewing those materials.</li>
                  <li>You may store files that are automatically cached by your Web browser for display enhancement purposes.</li>
                  <li>You may print or download one copy of a reasonable number of pages of the website for your own personal, non-commercial use and not for further reproduction, publication, or distribution.</li>
                  <li>If we provide desktop, mobile, or other applications for download, you may download a single copy to your computer or mobile device solely for your own personal, non-commercial use, provided you agree to be bound by our end user license agreement for such applications.</li>
                </ul>

                <h2>6. User Content</h2>
                <p>6.1 You retain ownership of any content you submit to the Services ("User Content").</p>
                <p>6.2 By providing User Content to the Services, you grant OrionX a worldwide, non-exclusive, royalty-free license (with the right to sublicense) to use, copy, reproduce, process, adapt, modify, publish, transmit, display, and distribute such content in any and all media or distribution methods (now known or later developed).</p>
                <p>6.3 You represent and warrant that:</p>
                <ul>
                  <li>You own or control all rights in and to the User Content and have the right to grant the license granted above to us.</li>
                  <li>The User Content does not violate the privacy rights, publicity rights, copyrights, contract rights, intellectual property rights, or any other rights of any person or entity.</li>
                  <li>The User Content does not contain any material that is defamatory, obscene, indecent, abusive, offensive, harassing, violent, hateful, inflammatory, or otherwise objectionable.</li>
                </ul>
                <p>6.4 We do not claim ownership in your User Content, but we need certain rights from you so that we can display and share the content you post.</p>

                <h2>7. Data Collection and Use</h2>
                <p>7.1 OrionX may collect and use your data as described in our Privacy Policy.</p>
                <p>7.2 By using our Services, you consent to our data collection and use practices as described in our Privacy Policy.</p>
                <p>7.3 You understand that by using the Services, you may be exposed to User Content that might be offensive, harmful, inaccurate, or otherwise inappropriate. OrionX does not endorse, support, represent, or guarantee the completeness, truthfulness, accuracy, or reliability of any User Content.</p>

                <h2>8. AI Training and Improvement</h2>
                <p>8.1 By default, your prompts and files stay private and are never used to retrain Pax unless you explicitly opt in.</p>
                <p>8.2 If you opt in, your interactions with our AI systems may be used to improve our AI models and services. This could include using your prompts, conversations, and feedback for training purposes.</p>
                <p>8.3 We will always respect your privacy choices and provide clear options for opting in or out of AI training programs.</p>

                <h2>9. Limitation of Liability</h2>
                <p>9.1 In no event shall OrionX, its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential, or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from:</p>
                <ul>
                  <li>Your access to or use of or inability to access or use the Services.</li>
                  <li>Any conduct or content of any third party on the Services.</li>
                  <li>Any content obtained from the Services.</li>
                  <li>Unauthorized access, use, or alteration of your transmissions or content.</li>
                </ul>
                <p>9.2 The foregoing does not affect any liability which cannot be excluded or limited under applicable law.</p>

                <h2>10. Disclaimer of Warranties</h2>
                <p>10.1 Your use of the Services is at your sole risk. The Services are provided on an "AS IS" and "AS AVAILABLE" basis. OrionX expressly disclaims all warranties of any kind, whether express or implied, including but not limited to the implied warranties of merchantability, fitness for a particular purpose, and non-infringement.</p>
                <p>10.2 OrionX makes no warranty that the Services will meet your requirements, be available on an uninterrupted, secure, or error-free basis, or that the Services will be accurate, reliable, complete, legal, or safe.</p>
                <p>10.3 You acknowledge that Hilous may produce inaccurate information. You should verify important information before making decisions based on outputs from our AI systems.</p>

                <h2>11. Governing Law</h2>
                <p>These Terms and Conditions and any dispute or claim arising out of, or related to, them, their subject matter, or their formation shall be governed by and construed in accordance with the laws of Botswana, without giving effect to any choice or conflict of law provision or rule.</p>

                <h2>12. Changes to Terms and Conditions</h2>
                <p>OrionX reserves the right, at its sole discretion, to modify or replace these Terms and Conditions at any time. By continuing to access or use our Services after those revisions become effective, you agree to be bound by the revised terms.</p>

                <h2>13. Termination</h2>
                <p>13.1 OrionX may terminate or suspend your access to all or part of the Services, without notice, for any conduct that OrionX, in its sole discretion, believes violates these Terms and Conditions or is harmful to other users of the Services, OrionX, or third parties, or for any other reason.</p>
                <p>13.2 Upon termination, your right to use the Services will immediately cease. All provisions of these Terms and Conditions which by their nature should survive termination shall survive termination, including, without limitation, ownership provisions, warranty disclaimers, indemnity, and limitations of liability.</p>

                <h2>14. Indemnification</h2>
                <p>You agree to defend, indemnify, and hold harmless OrionX, its affiliates, licensors, and service providers, and its and their respective officers, directors, employees, contractors, agents, licensors, suppliers, successors, and assigns from and against any claims, liabilities, damages, judgments, awards, losses, costs, expenses, or fees (including reasonable attorneys' fees) arising out of or relating to your violation of these Terms and Conditions or your use of the Services, including, but not limited to, your User Content, any use of the Services' content, services, and products other than as expressly authorized in these Terms and Conditions, or your use of any information obtained from the Services.</p>

                <h2>15. Subscription Terms and Payment</h2>
                <p>15.1 Certain aspects of the Services may be provided for a fee or other charge. If you elect to use paid aspects of the Services, you agree to the pricing and payment terms for those Services, as we may update them from time to time.</p>
                <p>15.2 OrionX may add new services for additional fees and charges, or amend fees and charges for existing services, at any time in its sole discretion. Any change to our pricing or payment terms shall become effective in the billing period following notice of such change to you as provided in these Terms and Conditions.</p>
                <p>15.3 You agree to provide accurate and complete billing information including full name, address, state, zip code, telephone number, and valid payment information. By providing your payment information, you authorize us to charge you for any paid features that you choose to sign up for or use.</p>
                <p>15.4 We use third-party payment processors to bill you through a payment account linked to your account. The processing of payments will be subject to the terms, conditions, and privacy policies of the payment processor in addition to these Terms and Conditions.</p>
                <p>15.5 If the payment is not received, for any reason, your subscription may be suspended or cancelled. You will remain responsible for all charges incurred up to the time the subscription is cancelled.</p>

                <h2>16. Free Trial</h2>
                <p>16.1 We may, at our sole discretion, offer a free trial of our paid Services for a limited period of time. You may be required to enter your payment information to sign up for the free trial.</p>
                <p>16.2 If you do enter your payment information when signing up for a free trial, you will not be charged by OrionX until the free trial has expired. On the last day of the free trial period, unless you cancelled your subscription, you will be automatically charged the applicable subscription fee for the type of subscription you have selected.</p>
                <p>16.3 At any time and without notice, OrionX reserves the right to (i) modify the terms and conditions of the free trial offer, or (ii) cancel such free trial offer.</p>

                <h2>17. Content Guidelines</h2>
                <p>17.1 You agree not to use the Services to create, upload, post, send, publish, or distribute any content that:</p>
                <ul>
                  <li>Violates any law or regulation.</li>
                  <li>Infringes the intellectual property rights of others.</li>
                  <li>Is fraudulent, false, misleading, or deceptive.</li>
                  <li>Is defamatory, obscene, pornographic, vulgar, or offensive.</li>
                  <li>Promotes discrimination, bigotry, racism, hatred, harassment, or harm against any individual or group.</li>
                  <li>Is violent or threatening or promotes violence or actions that are threatening to any person or entity.</li>
                  <li>Promotes illegal or harmful activities or substances.</li>
                </ul>
                <p>17.2 OrionX reserves the right, but is not obligated, to monitor, review, and remove any User Content at our sole discretion, including User Content that we believe violates these Terms and Conditions or is otherwise objectionable.</p>

                <h2>18. Third-Party Services</h2>
                <p>18.1 The Services may contain links to third-party websites or services that are not owned or controlled by OrionX.</p>
                <p>18.2 OrionX has no control over, and assumes no responsibility for, the content, privacy policies, or practices of any third-party websites or services. You acknowledge and agree that OrionX shall not be responsible or liable, directly or indirectly, for any damage or loss caused or alleged to be caused by or in connection with the use of or reliance on any such content, goods, or services available on or through any such websites or services.</p>
                <p>18.3 We strongly advise you to read the terms and conditions and privacy policies of any third-party websites or services that you visit.</p>

                <h2>19. Severability</h2>
                <p>If any provision of these Terms and Conditions is held to be unenforceable or invalid, such provision will be changed and interpreted to accomplish the objectives of such provision to the greatest extent possible under applicable law and the remaining provisions will continue in full force and effect.</p>

                <h2>20. Waiver</h2>
                <p>The failure of OrionX to enforce any right or provision of these Terms and Conditions will not be considered a waiver of those rights. If any provision of these Terms and Conditions is held to be invalid or unenforceable by a court, the remaining provisions of these Terms and Conditions will remain in effect.</p>

                <h2>21. Entire Agreement</h2>
                <p>These Terms and Conditions, together with the Privacy Policy, constitute the entire agreement between you and OrionX regarding our Services, and supersede and replace any prior agreements we might have between us regarding the Services.</p>

                <h2>22. Assignment</h2>
                <p>You may not assign or transfer these Terms and Conditions, by operation of law or otherwise, without OrionX's prior written consent. Any attempt by you to assign or transfer these Terms and Conditions without such consent will be null. OrionX may freely assign or transfer these Terms and Conditions without restriction.</p>

                <h2>23. Force Majeure</h2>
                <p>OrionX shall not be liable for any delay or failure to perform resulting from causes outside its reasonable control, including, but not limited to, acts of God, war, terrorism, riots, embargoes, acts of civil or military authorities, fire, floods, accidents, strikes, or shortages of transportation facilities, fuel, energy, labor, or materials.</p>

                <h2>24. Contact Information</h2>
                <p>If you have any questions about these Terms and Conditions, please contact us at:</p>
                <p>Email: legal@orionx.xyz<br />
                Address: Gaborone, Botswana</p>

                <p>Last Updated: May 30, 2025</p>
              </div>
            </div>
          </motion.div>
        </div>
      </main>

      {/* Footer */}
      <NewFooter />
    </div>
  );
};

export default TermsAndConditions;