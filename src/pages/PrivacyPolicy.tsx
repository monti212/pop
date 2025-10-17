import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import Logo from '../components/Logo';
import NewFooter from '../components/NewFooter';
import { ArrowLeft } from 'lucide-react';

const PrivacyPolicy: React.FC = () => {
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
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-8 text-navy">Privacy Policy</h1>
              
              <div className="prose prose-sm sm:prose lg:prose-lg max-w-none text-navy/80">
                <h2>Introduction</h2>
                <h3>1.1 Overview</h3>
                <p>OrionX ("we", "our", "us") is committed to protecting the privacy, confidentiality, and security of personal information we collect when you use our Services, including Hilous and Pax. This Privacy Policy describes how we collect, use, disclose, and protect personal data. By accessing or using our Services, you agree to the practices described in this Privacy Policy.</p>
                
                <h3>1.2 Scope</h3>
                <p>This Privacy Policy applies to all personal data collected by OrionX through all channels: our websites (e.g., orionx.xyz), web and mobile applications (Hilous), APIs, integrations, email and support interactions, third-party platforms, and any offline data processing. It governs our handling of information belonging to actual or prospective users, clients, business contacts, job applicants, and website visitors (collectively, "Users").</p>
                
                <h3>1.3 Governing Principles</h3>
                <p>We abide by the principles of data minimization, purpose limitation, transparency, data integrity, security, and accountability. We comply with the Botswana Data Protection Act, 2018, relevant African data protection regulations, and globally recognized best practices (e.g., GDPR principles where applicable).</p>

                <h2>Definitions</h2>
                <h3>2.1 Personal Data</h3>
                <p>"Personal Data" means any information relating to an identified or identifiable natural person. This includes direct identifiers (e.g., name, email, phone) and indirect identifiers (e.g., IP address, usage patterns) that can reasonably be linked to an individual.</p>
                
                <h3>2.2 Processing</h3>
                <p>"Processing" encompasses any operation performed on personal data, such as collection, storage, use, retrieval, disclosure, deletion, or modification.</p>
                
                <h3>2.3 Data Controller and Data Processor</h3>
                <p>OrionX is the Data Controller regarding the personal data processed in connection with our Services: we determine the purposes and means of processing. In some instances, we act as a Data Processor when processing data on behalf of our business clients under their direction.</p>
                
                <h3>2.4 Consent</h3>
                <p>"Consent" refers to the freely given, specific, informed, and unambiguous indication of the data subject's wishes by which they signify agreement to the processing of personal data.</p>

                <h2>Information We Collect</h2>
                <h3>3.1 Categories of Data Collected</h3>
                <h4>3.1.1 Account and Profile Data</h4>
                <ul>
                  <li>Name, title, profession, organization, email address, physical address.</li>
                  <li>Payment and billing details (company name, VAT number, bank details) for paid subscriptions.</li>
                  <li>Authentication credentials (password hashes, OAuth tokens).</li>
                </ul>
                
                <h4>3.1.2 Contact and Communication Data</h4>
                <ul>
                  <li>Email correspondence, chat transcripts, support tickets, call recordings (if applicable).</li>
                  <li>User-submitted feedback, inquiries, and survey responses.</li>
                </ul>
                
                <h4>3.1.3 Usage and Technical Data</h4>
                <ul>
                  <li>Logs and telemetry: IP address, device type, browser version, operating system, session duration, clickstream data.</li>
                  <li>API usage metrics: request counts, token usage, error codes, latency.</li>
                  <li>Performance data: resource utilization, model inference times, uptime/downtime.</li>
                </ul>
                
                <h4>3.1.4 Content and Data Transformations</h4>
                <ul>
                  <li>User-provided prompts, uploads (documents, PDFs, images, audio), and selections submitted to Hilous.</li>
                  <li>Model-generated output: generated text, code, summaries, translations, insights.</li>
                  <li>Anonymized embeddings or vectors for research and improvement.</li>
                </ul>
                
                <h4>3.1.5 Derived and Inferred Data</h4>
                <ul>
                  <li>Language and locale preferences.</li>
                  <li>Inferred topics, sentiment analysis, or user intents derived from chat interactions.</li>
                  <li>Usage patterns, feature preferences, and behavioral analytics.</li>
                </ul>
                
                <h4>3.1.6 Third-Party Data</h4>
                <ul>
                  <li>Publicly available data (e.g., social media profiles, corporate registry info).</li>
                  <li>Data obtained from our partners, integration platforms, or data vendors.</li>
                </ul>
                
                <h3>3.2 Methods of Collection</h3>
                <h4>3.2.1 Direct Collection</h4>
                <ul>
                  <li>When you register, subscribe, or update your profile data.</li>
                  <li>When you use Hilous to enter text, upload documents, or request actions.</li>
                  <li>When you contact our support, sales, or marketing teams.</li>
                </ul>
                
                <h4>3.2.2 Automated/Technical Collection</h4>
                <ul>
                  <li>Through cookies, web beacons, and similar tracking technologies on our websites and web applications.</li>
                  <li>Through log files and telemetry automatically generated by our systems.</li>
                  <li>Through SDKs and APIs integrated into client applications.</li>
                </ul>
                
                <h4>3.2.3 Indirect Collection</h4>
                <ul>
                  <li>From third-party data sources (e.g., data enrichment services, publicly available directories).</li>
                  <li>From our partners or affiliates (e.g., referral programs).</li>
                </ul>

                <h2>Legal Basis for Processing (Where Applicable)</h2>
                <h3>4.1 Contractual Necessity</h3>
                <p>We process personal data to fulfill our contractual obligations, such as creating and maintaining your account, processing payments, and delivering the Services you've subscribed to.</p>
                
                <h3>4.2 Legitimate Interests</h3>
                <p>We rely on legitimate interests to: enhance user experience, prevent fraud and abuse, monitor and improve system performance and security, conduct internal research and analytics, and protect OrionX's intellectual property.</p>
                
                <h3>4.3 Consent</h3>
                <p>When required by law or industry standard (e.g., marketing communications, optional analytics tracking, or certain cookies), we obtain your express consent before processing. You can withdraw consent at any time via your account settings or by contacting privacy@orionx.xyz.</p>
                
                <h3>4.4 Compliance with Legal Obligations</h3>
                <p>We may process personal data to comply with applicable laws, regulations, subpoenas, court orders, or governmental requests.</p>
                
                <h3>4.5 Vital Interests (Minimal)</h3>
                <p>In rare emergency scenarios—such as preventing imminent harm to an individual—OrionX may disclose limited personal data to first responders or legal authorities.</p>

                <h2>Use of Personal Data</h2>
                <h3>5.1 Delivery of Services and Account Management</h3>
                <ul>
                  <li>To create and maintain your OrionX account.</li>
                  <li>To authenticate and authorize your access.</li>
                  <li>To process payments, send invoices, and manage billing.</li>
                  <li>To provide profile-related services (e.g., password recovery, multi-factor authentication).</li>
                </ul>
                
                <h3>5.2 Product Improvement and Research</h3>
                <ul>
                  <li>To train, fine-tune, and enhance Pax's performance (unless you opt out via the privacy dashboard or request).</li>
                  <li>To refine safety filters, bias mitigation, and fairness algorithms.</li>
                  <li>To evaluate and monitor model outputs, identify hallucinations, and reduce error rates.</li>
                  <li>To conduct A/B tests, usage analytics, and feature experiments.</li>
                </ul>
                
                <h3>5.3 Security, Fraud Prevention, and Abuse Detection</h3>
                <ul>
                  <li>To detect and prevent fraudulent or abusive activities (e.g., credential stuffing, malicious bot traffic, user impersonation).</li>
                  <li>To enforce our Terms of Service and Acceptable Use Policy.</li>
                  <li>To investigate security incidents, data breaches, or unauthorized access.</li>
                </ul>
                
                <h3>5.4 Communication and Notifications</h3>
                <ul>
                  <li>To send system alerts (e.g., scheduled maintenance, service disruptions).</li>
                  <li>To provide customer success, technical support, and troubleshooting assistance.</li>
                  <li>To deliver marketing communications, newsletters, event invitations—where you have opted in or as permitted by applicable law.</li>
                </ul>
                
                <h3>5.5 Compliance and Legal Obligations</h3>
                <ul>
                  <li>To comply with statutory and regulatory requirements (e.g., tax reporting, anti-money laundering, anti-terrorism financing).</li>
                  <li>To respond to lawful requests from government authorities, regulators, or law enforcement.</li>
                </ul>
                
                <h3>5.6 Business Operations and Administrative Purposes</h3>
                <ul>
                  <li>To manage our corporate communications, internal analytics, and strategic planning.</li>
                  <li>To conduct investor relations, audits, and financial reporting.</li>
                  <li>To facilitate mergers, acquisitions, or reorganizations—subject to confidentiality and data-transfer safeguards.</li>
                </ul>

                <h2>Sharing and Disclosure of Personal Data</h2>
                <h3>6.1 Third-Party Service Providers (Data Processors)</h3>
                <p>We share personal data with carefully selected third-party service providers who perform services on our behalf:</p>
                <ul>
                  <li>Cloud infrastructure providers (e.g., AWS).</li>
                  <li>Payment gateways and billing processors.</li>
                  <li>Email and marketing automation platforms.</li>
                  <li>Analytics and logging services.</li>
                  <li>Customer support software and CRM systems.</li>
                  <li>Security monitoring and incident-response vendors.</li>
                </ul>
                <p>Each provider is bound by a written Data-Processing Addendum (DPA) guaranteeing they implement appropriate technical and organizational safeguards.</p>
                
                <h3>6.2 Affiliates and Subsidiaries</h3>
                <p>Personal data may be shared within the OrionX corporate group for unified operations, legal compliance, risk management, and centralized administrative support.</p>
                
                <h3>6.3 Business Partners, Resellers, and Integrators</h3>
                <p>Where you expressly enable or authorize short-term integration, we may share limited personal data with our authorized partners, channel partners, or software integrators to facilitate end-user onboarding, account linking, or co-branded service delivery.</p>
                
                <h3>6.4 Legal Obligations and Law Enforcement</h3>
                <p>We may disclose personal data to comply with a legal obligation (e.g., subpoenas, court orders, statutory requirements). We will notify the affected User unless prohibited by law or public authorities.</p>
                
                <h3>6.5 Corporate Transactions</h3>
                <p>In the event OrionX merges, is acquired, reorganized, or sells all or a portion of its assets, personal data may be transferred to the acquiring entity or successor. We will notify Users publicly or by email prior to any such transfer, unless confidentiality obligations prohibit advance notice.</p>
                
                <h3>6.6 Aggregate and Anonymized Data</h3>
                <p>We may de-identify or anonymize personal data and use or share the aggregate insights for research, analytics, marketing, or product development. Anonymized data cannot reasonably be re-associated with a specific individual.</p>

                <h2>Cookies, Tracking, and Other Technologies</h2>
                <h3>7.1 Cookies and Similar Technologies</h3>
                <h4>7.1.1 Functional Cookies</h4>
                <ul>
                  <li>Necessary to provide core functionality—login sessions, UI preferences, security features.</li>
                </ul>
                
                <h4>7.1.2 Performance and Analytics Cookies</h4>
                <ul>
                  <li>Used to collect information about how Users interact with our sites and services: page views, navigation, feature usage, error tracking.</li>
                </ul>
                
                <h4>7.1.3 Marketing and Advertising Cookies</h4>
                <ul>
                  <li>Employed by third-party ad networks and tracking platforms for targeted advertising and marketing analytics.</li>
                </ul>
                
                <p>Users can manage cookie preferences via their browser settings or through our cookie-consent banner. Refusing non-essential cookies may degrade user experience.</p>
                
                <h3>7.2 Web Beacons, Pixel Tags, and JavaScript Libraries</h3>
                <p>We use web beacons and pixel tags to track email opens, measure campaign effectiveness, and gather behavioral analytics. JavaScript libraries may be embedded to load necessary scripts for performance monitoring.</p>
                
                <h3>7.3 IP Address and Device Fingerprinting</h3>
                <p>We may collect IP addresses, device configurations, browser fingerprints, and operating system details to identify sessions, detect fraud, and secure the platform.</p>
                
                <h3>7.4 Mobile and API Fingerprinting</h3>
                <p>For mobile-app usage, we collect anonymized device identifiers (e.g., IDFA, Android Advertising ID) solely for analytics and security; compliance with platform guidelines is strictly maintained.</p>

                <h2>Data Security and Protection</h2>
                <h3>8.1 Technical and Organizational Measures</h3>
                <p>We implement robust security measures, including but not limited to:</p>
                <ul>
                  <li>Encryption: TLS 1.3 for data in transit; AES-256 encryption for data at rest, with KMS-managed keys.</li>
                  <li>Access Controls: Role-based access control (RBAC), least-privilege principle, multi-factor authentication (MFA) for all OrionX staff.</li>
                  <li>Network Security: Virtual Private Cloud (VPC) isolation, firewalls, DDoS protection, web-application firewalls (WAF).</li>
                  <li>Logging & Monitoring: Continuous logging, SIEM integration, anomaly detection, periodic penetration tests and vulnerability assessments.</li>
                </ul>
                
                <h3>8.2 Employee Training and Awareness</h3>
                <p>All OrionX personnel receive regular security, privacy, and data-protection training. Employees are required to sign confidentiality agreements and undergo background checks.</p>
                
                <h3>8.3 Data Breach Response</h3>
                <p>In the event of a confirmed data breach or security incident involving Personal Data, OrionX will:</p>
                <ol>
                  <li>Activate the incident-response team immediately.</li>
                  <li>Contain and assess the scope of the breach.</li>
                  <li>Notify affected Users and regulatory authorities (if required) within 72 hours of discovery, providing details on the nature of the breach, affected data categories, and remediation steps.</li>
                  <li>Offer guidance to impacted Users (e.g., password resets, credit-monitoring services).</li>
                  <li>Conduct a post-incident review to implement improvements and prevent recurrence.</li>
                </ol>

                <h2>Data Retention and Deletion</h2>
                <h3>9.1 Retention Principles</h3>
                <p>We retain Personal Data only for as long as necessary to fulfill the purposes outlined herein, comply with legal obligations, resolve disputes, and enforce our policies.</p>
                
                <h3>9.2 Retention Periods by Data Category</h3>
                <ul>
                  <li>"Account & Billing Data": Retained for 7 years post-account closure to comply with Botswana Tax Authority requirements and financial-audit standards.</li>
                  <li>"Usage Logs & Telemetry": Stored for 12 months, with rolling deletion of logs older than one year, to assist with operational troubleshooting and security investigations.</li>
                  <li>"Prompt & Output Records": Preserved for 30 days in raw form to enhance Service quality, then moved to an anonymized research cluster (subject to opt-out).</li>
                  <li>"Marketing & Communication Data": Kept for up to 3 years or until consent is withdrawn.</li>
                  <li>"Support Tickets & Customer Interactions": Retained for 24 months, then reviewed for archival or deletion based on business needs.</li>
                </ul>
                
                <h3>9.3 Data Deletion Requests (Right to be Forgotten)</h3>
                <h4>9.3.1 User-Initiated Deletion</h4>
                <ul>
                  <li>Users may request deletion of their personal information via their account dashboard or by emailing privacy@orionx.xyz with the subject "Data Deletion Request".</li>
                  <li>Upon receiving a verifiable request, we will delete your Personal Data from our primary systems within 30 days, except where retention is required by law, such as tax or regulatory obligations.</li>
                </ul>
                
                <h4>9.3.2 Anonymization and Aggregation</h4>
                <ul>
                  <li>For data already incorporated into aggregated analytics or model training, we will remove identifying information and cease linking it to your identity.</li>
                </ul>
                
                <h4>9.3.3 Exceptions</h4>
                <ul>
                  <li>We may retain limited data necessary for legal compliance, fraud prevention, enforcement of our Terms, or to protect rights and safety, subject to applicable law.</li>
                </ul>

                <h2>International Data Transfers</h2>
                <h3>10.1 Hosting and Transfer Locations</h3>
                <ul>
                  <li>Primary hosting occurs in AWS Cape Town (af-south-1), with encrypted failover replicas in EU (af-south-1 standby).</li>
                  <li>Backups may be stored in multiple geo-redundant zones, including EU (Frankfurt) and US (Oregon), to ensure resilience and business continuity.</li>
                </ul>
                
                <h3>10.2 Transfer Mechanisms and Safeguards</h3>
                <p>Where personal data is transferred outside Botswana, we rely on one or more of the following safeguards:</p>
                <ul>
                  <li>Standard Contractual Clauses (SCCs) approved by the European Commission.</li>
                  <li>Binding Corporate Rules (BCRs) for our internal staff transfers.</li>
                  <li>Adequacy decisions (for countries recognized by EU data-protection authorities).</li>
                </ul>
                
                <h3>10.3 User Consent for Transfers</h3>
                <p>By agreeing to this Privacy Policy, you explicitly consent to the international transfer, processing, and storage of your Personal Data in jurisdictions that may have different data-protection laws than your home country.</p>

                <h2>Data Subject Rights and Choices (Botswana and Beyond)</h2>
                <h3>11.1 Right of Access</h3>
                <p>You may request a copy of Personal Data we hold about you—covering categories, purpose of processing, recipients, retention period, and source—by submitting a "Data Access Request" to privacy@orionx.xyz. We will respond within 30 days, or within the timeframe mandated by applicable law.</p>
                
                <h3>11.2 Right to Correction (Rectification)</h3>
                <p>You may correct incomplete or inaccurate Personal Data by updating your account profile or by contacting privacy@orionx.xyz. We will verify identity before granting access or making changes.</p>
                
                <h3>11.3 Right to Deletion (Erasure)</h3>
                <p>As described in Section 9.3, you can request deletion of Personal Data. Exceptions apply for data essential to legal compliance, dispute resolution, or legitimate OrionX interests.</p>
                
                <h3>11.4 Right to Data Portability</h3>
                <p>Where technically feasible, we will provide your Personal Data in a structured, commonly used, machine-readable format (e.g., CSV, JSON) for export upon request. This excludes data that:</p>
                <ul>
                  <li>Contains personal information about other users.</li>
                  <li>Is proprietary to OrionX's internal models or trade secrets.</li>
                </ul>
                
                <h3>11.5 Right to Object / Restrict Processing</h3>
                <p>You may object to or request restriction of processing of your Personal Data for direct-marketing purposes or if you contest accuracy. We will comply unless we demonstrate compelling legitimate grounds for the processing.</p>
                
                <h3>11.6 Right to Withdraw Consent</h3>
                <p>Where processing is based solely on your consent (e.g., marketing emails, optional analytics), you can withdraw consent by updating preferences in your account or emailing privacy@orionx.xyz. Withdrawal does not affect lawfulness of prior processing.</p>
                
                <h3>11.7 Right to Lodge Complaint</h3>
                <p>If you believe we have violated your data-protection rights, you may file a complaint with the Botswana Data Protection Office (DPO) or other relevant regulator in your jurisdiction.</p>

                <h2>Children's Privacy</h2>
                <h3>12.1 Age Restriction</h3>
                <p>Our Services are not intended for individuals under the age of 16. We do not knowingly collect or solicit Personal Data from minors under 16.</p>
                
                <h3>12.2 Parental Consent</h3>
                <p>If you are under 16, you may use our Services only if accompanied by a parent or legal guardian who agrees to this Privacy Policy on your behalf.</p>
                
                <h3>12.3 Removal of Children's Data</h3>
                <p>If we discover that a minor's Personal Data was collected without parental consent, we will promptly delete it. Parents or guardians may request deletion by emailing privacy@orionx.xyz.</p>

                <h2>Vendors, Sub-processors, and Third-Party Services</h2>
                <h3>13.1 Criteria for Selecting Processors</h3>
                <p>We only engage sub-processors who agree to contractual obligations consistent with this Privacy Policy, including data security, confidentiality, and breach notification.</p>
                
                <h3>13.2 Current Sub-processor List</h3>
                <p>A complete list of our third-party processors (including AWS, Mailgun, Stripe, etc.) is maintained at https://uhuru.orionx.xyz/subprocessors. We update this list regularly when new sub-processors are engaged.</p>
                
                <h3>13.3 Data-Processing Addendum (DPA)</h3>
                <p>All sub-processors handling Personal Data are bound by a DPA that requires them to:</p>
                <ul>
                  <li>Process data only on OrionX's documented instructions.</li>
                  <li>Maintain appropriate security measures.</li>
                  <li>Promptly notify OrionX of any data breaches or unauthorized access.</li>
                  <li>Ensure any further sub-processing is governed by similar contractual safeguards.</li>
                </ul>

                <h2>Security Standards and Certifications</h2>
                <h3>14.1 Industry Best Practices</h3>
                <p>We adhere to recognized standards such as ISO/IEC 27001, NIST SP 800-53, and OWASP Top 10. Our security controls are aligned with these frameworks.</p>
                
                <h3>14.2 Encryption and Key Management</h3>
                <ul>
                  <li>All data in transit is protected by TLS 1.3 or higher.</li>
                  <li>Data at rest is encrypted with AES-256; separate AWS KMS keys manage encryption for production vs. development environments.</li>
                </ul>
                
                <h3>14.3 Access Control</h3>
                <ul>
                  <li>Role-based access control (RBAC) and principle of least privilege ensure only authorized personnel can access sensitive data.</li>
                  <li>Multi-factor authentication (MFA) is mandatory for all OrionX employees and administrators.</li>
                </ul>
                
                <h3>14.4 Penetration Testing and Vulnerability Management</h3>
                <ul>
                  <li>We conduct annual third-party penetration tests, with a policy to remediate critical vulnerabilities within 30 days.</li>
                  <li>Internal vulnerability scanning is performed monthly; emerging threats are patched within a 15-day SLA.</li>
                </ul>
                
                <h3>14.5 Incident Response Plan</h3>
                <p>We maintain a documented Incident Response Plan, including contact rosters, escalation procedures, forensic methodologies, and compliance notification requirements.</p>

                <h2>Behavioral Profiling and Automated Decision-Making</h2>
                <h3>15.1 Profiling Purposes</h3>
                <p>We may use algorithms to analyze usage data and interactions to:</p>
                <ul>
                  <li>Personalize user experiences (e.g., recommendations, localized content).</li>
                  <li>Detect fraudulent or abusive patterns.</li>
                  <li>Optimize feature prioritization based on aggregate behavior.</li>
                </ul>
                
                <h3>15.2 Automated Decisions</h3>
                <p>In rare cases, decisions related to account suspension or security flags may be made automatically by our risk-scoring engine.</p>
                
                <h3>15.3 User Rights</h3>
                <p>You have the right to challenge any automated decision that significantly affects you, request a human review, and obtain an explanation of the logic used.</p>

                <h2>International Transfers and Cross-Border Compliance</h2>
                <h3>16.1 Adequacy and Safeguards</h3>
                <p>In addition to SCCs (Section 10.2), we maintain Binding Corporate Rules (BCRs) for data transfers within the OrionX group.</p>
                
                <h3>16.2 Local Data Storage Options</h3>
                <p>Enterprise clients in regulated industries (finance, healthcare, government) may request on-premises deployments or dedicated isolated cloud regions.</p>
                
                <h3>16.3 Impact Assessments</h3>
                <p>Prior to transferring Sensitive Personal Data across borders, we conduct a Transfer Impact Assessment to evaluate local legal frameworks and mitigation measures.</p>

                <h2>Marketing, Communications, and Direct Advertising</h2>
                <h3>17.1 Marketing Communications</h3>
                <p>We may send newsletters, product updates, or promotional offers via email if you have opted in.</p>
                
                <h3>17.2 Unsubscribe and Do-Not-Track (DNT)</h3>
                <p>All marketing emails include an easy opt-out link. We honor DNT browser signals and will disable non-essential tracking if DNT is detected.</p>
                
                <h3>17.3 Targeted Advertising</h3>
                <p>We may display behavioral-based ads on our platform and partner sites to users who have consented to cookies.</p>
                
                <h3>17.4 Third-Party Advertising Partners</h3>
                <p>We use third-party ad networks that may set cookies or use local storage; these partners are prohibited from collecting Personal Data without user consent.</p>

                <h2>Data Portability and Interoperability</h2>
                <h3>18.1 Exporting Your Data</h3>
                <p>You may request a package containing your account data, User Content, usage logs, and preferences. We will provide this in a machine-readable format (JSON, CSV) within 30 days of request.</p>
                
                <h3>18.2 Interoperability Standards</h3>
                <p>We support common export formats for documents, transcripts, and usage reports so you can migrate to alternate platforms if desired.</p>
                
                <p className="text-right text-sm italic">Effective Date: 31 May 2025</p>
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

export default PrivacyPolicy;