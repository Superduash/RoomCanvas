import { motion } from 'framer-motion';
import { Mail, MessageSquare, Bug, HelpCircle } from 'lucide-react';

export function ContactPage() {
  return (
    <div className="flex flex-col py-16">
      <div className="mx-auto max-w-[800px] px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="text-center mb-12">
            <div className="w-12 h-12 rounded-xl bg-accent-subtle text-accent flex items-center justify-center mb-6 mx-auto">
              <Mail className="h-6 w-6" />
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-text-primary mb-4">
              Get in Touch
            </h1>
            <p className="text-lg text-text-secondary max-w-2xl mx-auto">
              Have questions, feedback, or need help? We'd love to hear from you.
            </p>
          </div>

          {/* Contact Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
            <motion.a
              href="mailto:support@roomcanvasai.com"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="group p-6 rounded-2xl bg-surface border border-border shadow-sm hover:shadow-md hover:border-accent/50 transition-all"
            >
              <div className="w-10 h-10 rounded-xl bg-accent-subtle text-accent flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <MessageSquare className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-semibold text-text-primary mb-2">General Support</h3>
              <p className="text-text-secondary text-[15px] leading-relaxed mb-3">
                Questions about using RoomCanvas AI or need help with your account?
              </p>
              <span className="text-accent text-sm font-medium group-hover:underline">
                support@roomcanvasai.com
              </span>
            </motion.a>

            <motion.a
              href="mailto:bug@roomcanvasai.com"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="group p-6 rounded-2xl bg-surface border border-border shadow-sm hover:shadow-md hover:border-accent/50 transition-all"
            >
              <div className="w-10 h-10 rounded-xl bg-accent-subtle text-accent flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Bug className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-semibold text-text-primary mb-2">Report a Bug</h3>
              <p className="text-text-secondary text-[15px] leading-relaxed mb-3">
                Found a bug or technical issue? Let us know so we can fix it.
              </p>
              <span className="text-accent text-sm font-medium group-hover:underline">
                bug@roomcanvasai.com
              </span>
            </motion.a>

            <motion.a
              href="mailto:feedback@roomcanvasai.com"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="group p-6 rounded-2xl bg-surface border border-border shadow-sm hover:shadow-md hover:border-accent/50 transition-all"
            >
              <div className="w-10 h-10 rounded-xl bg-accent-subtle text-accent flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <HelpCircle className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-semibold text-text-primary mb-2">Feedback</h3>
              <p className="text-text-secondary text-[15px] leading-relaxed mb-3">
                Have suggestions for new features or improvements? We're all ears.
              </p>
              <span className="text-accent text-sm font-medium group-hover:underline">
                feedback@roomcanvasai.com
              </span>
            </motion.a>

            <motion.a
              href="mailto:legal@roomcanvasai.com"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="group p-6 rounded-2xl bg-surface border border-border shadow-sm hover:shadow-md hover:border-accent/50 transition-all"
            >
              <div className="w-10 h-10 rounded-xl bg-accent-subtle text-accent flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Mail className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-semibold text-text-primary mb-2">Legal & Privacy</h3>
              <p className="text-text-secondary text-[15px] leading-relaxed mb-3">
                Questions about Terms of Service, Privacy Policy, or data handling?
              </p>
              <span className="text-accent text-sm font-medium group-hover:underline">
                legal@roomcanvasai.com
              </span>
            </motion.a>
          </div>

          {/* FAQ Link */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="p-8 rounded-2xl bg-gradient-to-br from-surface to-surface-alt/50 border border-border text-center"
          >
            <h3 className="text-xl font-bold text-text-primary mb-3">
              Looking for quick answers?
            </h3>
            <p className="text-text-secondary mb-6">
              Check out our FAQ section on the home page for common questions about RoomCanvas AI.
            </p>
            <a
              href="/#faq-heading"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent text-white font-medium hover:bg-accent/90 transition-colors shadow-sm"
            >
              View FAQ
            </a>
          </motion.div>

          {/* Response Time */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="mt-12 text-center"
          >
            <p className="text-sm text-text-tertiary">
              We typically respond within 24-48 hours during business days.
            </p>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}

export default ContactPage;
