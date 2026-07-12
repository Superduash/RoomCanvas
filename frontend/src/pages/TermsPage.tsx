import { motion } from 'framer-motion';
import { FileText } from 'lucide-react';

export function TermsPage() {
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
              <FileText className="h-5 w-5" />
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-text-primary">
              Terms of Service
            </h1>
          </div>
          
          <p className="text-sm text-text-tertiary mb-12">
            Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>

          <div className="prose prose-slate dark:prose-invert max-w-none space-y-8">
            <section>
              <h2 className="text-2xl font-bold text-text-primary mb-4">1. Acceptance of Terms</h2>
              <p className="text-text-secondary leading-relaxed">
                By accessing or using RoomCanvas AI ("Service"), you agree to be bound by these Terms of Service. 
                If you do not agree to these terms, please do not use our Service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-text-primary mb-4">2. Description of Service</h2>
              <p className="text-text-secondary leading-relaxed mb-3">
                RoomCanvas AI is an AI-powered interior design tool that allows users to:
              </p>
              <ul className="list-disc list-inside text-text-secondary space-y-2 ml-4">
                <li>Upload photos of interior spaces</li>
                <li>Generate AI-powered redesigns</li>
                <li>Refine designs using natural language instructions</li>
                <li>Save and manage design history</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-text-primary mb-4">3. User Accounts</h2>
              <p className="text-text-secondary leading-relaxed">
                You may need to create an account to access certain features. You are responsible for:
              </p>
              <ul className="list-disc list-inside text-text-secondary space-y-2 ml-4 mt-3">
                <li>Maintaining the confidentiality of your account credentials</li>
                <li>All activities that occur under your account</li>
                <li>Notifying us immediately of any unauthorized access</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-text-primary mb-4">4. User Content</h2>
              <p className="text-text-secondary leading-relaxed mb-3">
                When you upload images or create designs ("User Content"), you:
              </p>
              <ul className="list-disc list-inside text-text-secondary space-y-2 ml-4">
                <li>Retain all ownership rights to your User Content</li>
                <li>Grant us a license to process, store, and display your content to provide the Service</li>
                <li>Warrant that you have the right to upload the images</li>
                <li>Are responsible for ensuring your content doesn't violate any laws or third-party rights</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-text-primary mb-4">5. Acceptable Use</h2>
              <p className="text-text-secondary leading-relaxed mb-3">
                You agree NOT to:
              </p>
              <ul className="list-disc list-inside text-text-secondary space-y-2 ml-4">
                <li>Use the Service for any illegal purpose</li>
                <li>Upload images you don't have rights to</li>
                <li>Attempt to reverse engineer or extract our AI models</li>
                <li>Use automated tools to access the Service without permission</li>
                <li>Resell or redistribute generated designs as a service</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-text-primary mb-4">6. AI-Generated Content</h2>
              <p className="text-text-secondary leading-relaxed">
                AI-generated designs are provided "as is." We don't guarantee that generated designs will be 
                suitable for construction, meet building codes, or be practically implementable. Designs are 
                for visualization and inspiration purposes only.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-text-primary mb-4">7. Intellectual Property</h2>
              <p className="text-text-secondary leading-relaxed">
                The Service, including its design, code, and AI models, is protected by copyright and other 
                intellectual property laws. You may not copy, modify, or distribute any part of the Service 
                without written permission.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-text-primary mb-4">8. Limitation of Liability</h2>
              <p className="text-text-secondary leading-relaxed">
                To the maximum extent permitted by law, RoomCanvas AI shall not be liable for any indirect, 
                incidental, special, consequential, or punitive damages resulting from your use of the Service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-text-primary mb-4">9. Service Modifications</h2>
              <p className="text-text-secondary leading-relaxed">
                We reserve the right to modify or discontinue the Service at any time, with or without notice. 
                We are not liable for any modification, suspension, or discontinuation of the Service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-text-primary mb-4">10. Termination</h2>
              <p className="text-text-secondary leading-relaxed">
                We may terminate or suspend your account immediately, without prior notice, if you breach these 
                Terms. Upon termination, your right to use the Service will immediately cease.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-text-primary mb-4">11. Changes to Terms</h2>
              <p className="text-text-secondary leading-relaxed">
                We may update these Terms from time to time. We will notify users of material changes via email 
                or through the Service. Continued use after changes constitutes acceptance of the new Terms.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-text-primary mb-4">12. Contact</h2>
              <p className="text-text-secondary leading-relaxed">
                For questions about these Terms, contact us at{' '}
                <a href="mailto:helloitsashwin@gmail.com" className="text-accent hover:underline">
                  helloitsashwin@gmail.com
                </a>
              </p>
            </section>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default TermsPage;
