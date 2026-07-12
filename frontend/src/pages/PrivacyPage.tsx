import { motion } from 'framer-motion';
import { Shield } from 'lucide-react';

export function PrivacyPage() {
  return (
    <div className="flex flex-col py-16">
      <div className="mx-auto max-w-[800px] px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-accent-subtle text-accent flex items-center justify-center">
              <Shield className="h-5 w-5" />
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-text-primary">
              Privacy Policy
            </h1>
          </div>
          
          <p className="text-sm text-text-tertiary mb-12">
            Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>

          <div className="prose prose-slate dark:prose-invert max-w-none space-y-8">
            <section>
              <h2 className="text-2xl font-bold text-text-primary mb-4">1. Introduction</h2>
              <p className="text-text-secondary leading-relaxed">
                RoomCanvas AI ("we", "our", "us") is committed to protecting your privacy. This Privacy Policy 
                explains how we collect, use, disclose, and safeguard your information when you use our Service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-text-primary mb-4">2. Information We Collect</h2>
              
              <h3 className="text-xl font-semibold text-text-primary mb-3 mt-6">2.1 Information You Provide</h3>
              <ul className="list-disc list-inside text-text-secondary space-y-2 ml-4">
                <li><strong>Account Information:</strong> Email address, name, password (encrypted)</li>
                <li><strong>Images:</strong> Photos of rooms you upload for redesign</li>
                <li><strong>Design Preferences:</strong> Style choices, refinement instructions</li>
                <li><strong>Communications:</strong> Messages sent to our support team</li>
              </ul>

              <h3 className="text-xl font-semibold text-text-primary mb-3 mt-6">2.2 Automatically Collected Information</h3>
              <ul className="list-disc list-inside text-text-secondary space-y-2 ml-4">
                <li><strong>Usage Data:</strong> Pages viewed, features used, time spent</li>
                <li><strong>Device Information:</strong> Browser type, operating system, IP address</li>
                <li><strong>Cookies:</strong> Session identifiers, authentication tokens</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-text-primary mb-4">3. How We Use Your Information</h2>
              <p className="text-text-secondary leading-relaxed mb-3">
                We use collected information to:
              </p>
              <ul className="list-disc list-inside text-text-secondary space-y-2 ml-4">
                <li>Provide and maintain the Service</li>
                <li>Process your uploaded images and generate redesigns</li>
                <li>Authenticate your account and prevent fraud</li>
                <li>Send service-related notifications (e.g., generation complete)</li>
                <li>Improve our AI models and Service quality</li>
                <li>Respond to customer support requests</li>
                <li>Comply with legal obligations</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-text-primary mb-4">4. How We Share Your Information</h2>
              <p className="text-text-secondary leading-relaxed mb-3">
                We do NOT sell your personal information. We may share information with:
              </p>
              
              <h3 className="text-xl font-semibold text-text-primary mb-3 mt-6">4.1 AI Service Providers</h3>
              <p className="text-text-secondary leading-relaxed">
                Uploaded images are processed by our AI providers (Google Gemini, Replicate) to analyze and 
                generate redesigns. These providers process data according to their privacy policies.
              </p>

              <h3 className="text-xl font-semibold text-text-primary mb-3 mt-6">4.2 Infrastructure Providers</h3>
              <p className="text-text-secondary leading-relaxed">
                We use cloud hosting services (e.g., Render, Vercel) to store data and deliver the Service.
              </p>

              <h3 className="text-xl font-semibold text-text-primary mb-3 mt-6">4.3 Legal Requirements</h3>
              <p className="text-text-secondary leading-relaxed">
                We may disclose information if required by law, court order, or government request.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-text-primary mb-4">5. Data Retention</h2>
              <p className="text-text-secondary leading-relaxed">
                We retain your data for as long as your account is active or as needed to provide services. 
                You can request deletion of your account and associated data at any time. Some data may be 
                retained for legal or security purposes.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-text-primary mb-4">6. Data Security</h2>
              <p className="text-text-secondary leading-relaxed">
                We implement industry-standard security measures including:
              </p>
              <ul className="list-disc list-inside text-text-secondary space-y-2 ml-4 mt-3">
                <li>Encryption in transit (HTTPS/TLS)</li>
                <li>Encrypted password storage</li>
                <li>Firebase Authentication for secure user management</li>
                <li>Regular security audits and updates</li>
              </ul>
              <p className="text-text-secondary leading-relaxed mt-3">
                However, no method of transmission over the internet is 100% secure. We cannot guarantee 
                absolute security.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-text-primary mb-4">7. Your Rights</h2>
              <p className="text-text-secondary leading-relaxed mb-3">
                Depending on your location, you may have the following rights:
              </p>
              <ul className="list-disc list-inside text-text-secondary space-y-2 ml-4">
                <li><strong>Access:</strong> Request a copy of your personal data</li>
                <li><strong>Correction:</strong> Update or correct inaccurate information</li>
                <li><strong>Deletion:</strong> Request deletion of your account and data</li>
                <li><strong>Portability:</strong> Receive your data in a machine-readable format</li>
                <li><strong>Opt-out:</strong> Unsubscribe from marketing emails (we don't send these currently)</li>
              </ul>
              <p className="text-text-secondary leading-relaxed mt-3">
                To exercise these rights, contact us at{' '}
                <a href="mailto:privacy@roomcanvasai.com" className="text-accent hover:underline">
                  privacy@roomcanvasai.com
                </a>
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-text-primary mb-4">8. Cookies and Tracking</h2>
              <p className="text-text-secondary leading-relaxed">
                We use essential cookies for authentication and session management. We do not use third-party 
                advertising cookies or tracking pixels. You can disable cookies in your browser, but this may 
                affect Service functionality.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-text-primary mb-4">9. Children's Privacy</h2>
              <p className="text-text-secondary leading-relaxed">
                Our Service is not intended for users under 13 years of age. We do not knowingly collect 
                personal information from children. If you believe we have collected information from a child, 
                please contact us immediately.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-text-primary mb-4">10. International Data Transfers</h2>
              <p className="text-text-secondary leading-relaxed">
                Your data may be transferred to and processed in countries other than your own. We ensure 
                appropriate safeguards are in place to protect your data in accordance with this Privacy Policy.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-text-primary mb-4">11. Changes to This Policy</h2>
              <p className="text-text-secondary leading-relaxed">
                We may update this Privacy Policy from time to time. We will notify you of significant changes 
                via email or through the Service. The "Last updated" date at the top indicates when changes 
                were made.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-text-primary mb-4">12. Contact Us</h2>
              <p className="text-text-secondary leading-relaxed">
                For questions or concerns about this Privacy Policy or our data practices, contact us at:
              </p>
              <ul className="list-none text-text-secondary space-y-2 mt-3">
                <li>
                  Email:{' '}
                  <a href="mailto:privacy@roomcanvasai.com" className="text-accent hover:underline">
                    privacy@roomcanvasai.com
                  </a>
                </li>
                <li>
                  Support:{' '}
                  <a href="mailto:support@roomcanvasai.com" className="text-accent hover:underline">
                    support@roomcanvasai.com
                  </a>
                </li>
              </ul>
            </section>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default PrivacyPage;
