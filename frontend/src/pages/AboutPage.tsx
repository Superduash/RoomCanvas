import { motion } from 'framer-motion';
import { Sparkles, Target, Heart, Users } from 'lucide-react';
import { Button } from '../components/primitives/Button';
import { Link } from 'react-router-dom';

export function AboutPage() {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 md:py-32">
        <div className="absolute inset-0 -z-10 pointer-events-none overflow-hidden" aria-hidden>
          <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] rounded-full bg-[radial-gradient(circle,var(--color-accent-muted),transparent_70%)] animate-float opacity-60 mix-blend-screen dark:mix-blend-lighten" />
          <div className="absolute bottom-[-10%] left-[5%] w-[500px] h-[500px] rounded-full bg-[radial-gradient(circle,rgba(91,155,213,0.08),transparent_70%)] animate-float [animation-delay:3s] opacity-80" />
        </div>

        <div className="mx-auto max-w-[800px] px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent-subtle border border-accent/20 text-accent text-xs font-semibold tracking-wide uppercase shadow-sm mb-6">
              <Sparkles className="h-3 w-3" />
              About RoomCanvas AI
            </span>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-text-primary mb-6">
              Reimagining interior design with AI
            </h1>
            <p className="text-lg text-text-secondary leading-relaxed max-w-2xl mx-auto">
              RoomCanvas AI makes photorealistic interior redesign accessible to everyone. Upload a photo, 
              describe your vision, and watch as AI transforms your space while preserving its structure.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="py-16 border-y border-border bg-surface-alt/40">
        <div className="mx-auto max-w-[1024px] px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="p-8 rounded-2xl bg-surface border border-border shadow-sm"
            >
              <div className="w-12 h-12 rounded-xl bg-accent-subtle text-accent flex items-center justify-center mb-4">
                <Target className="h-6 w-6" />
              </div>
              <h2 className="text-2xl font-bold text-text-primary mb-3">Our Mission</h2>
              <p className="text-text-secondary leading-relaxed">
                To democratize interior design by making professional-quality room redesigns accessible 
                through AI. We believe everyone deserves to visualize their dream space before making 
                costly design decisions.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="p-8 rounded-2xl bg-surface border border-border shadow-sm"
            >
              <div className="w-12 h-12 rounded-xl bg-accent-subtle text-accent flex items-center justify-center mb-4">
                <Heart className="h-6 w-6" />
              </div>
              <h2 className="text-2xl font-bold text-text-primary mb-3">Our Values</h2>
              <p className="text-text-secondary leading-relaxed">
                We prioritize user privacy, design quality, and accessibility. Your images and projects 
                remain private. Our AI understands room structure to generate realistic, practical 
                designs—not just style filters.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* How We're Different */}
      <section className="py-20">
        <div className="mx-auto max-w-[800px] px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold tracking-tight text-text-primary mb-4">
              More than a style filter
            </h2>
            <p className="text-text-secondary">
              RoomCanvas AI goes beyond simple photo filters to understand and respect your room's architecture.
            </p>
          </div>

          <div className="space-y-6">
            {[
              {
                title: 'Structural Awareness',
                desc: 'Our AI detects walls, windows, doors, and furniture placement. Redesigns preserve your room layout and perspective.',
              },
              {
                title: 'Photorealistic Quality',
                desc: 'Powered by Flux AI, we generate high-resolution, realistic designs—not cartoonish renders.',
              },
              {
                title: 'Iterative Refinement',
                desc: 'Chat with AI to refine designs. "Add more plants" or "make it brighter"—your design evolves with natural language.',
              },
              {
                title: 'Privacy First',
                desc: 'Your images and designs are stored securely. We never sell your data or use it for training.',
              },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="flex gap-4 p-6 rounded-xl bg-surface border border-border hover:bg-surface-alt transition-colors"
              >
                <div className="flex-shrink-0 w-2 h-2 rounded-full bg-accent mt-2" />
                <div>
                  <h3 className="text-lg font-semibold text-text-primary mb-2">{item.title}</h3>
                  <p className="text-text-secondary text-[15px] leading-relaxed">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-20 border-y border-border bg-surface-alt/40">
        <div className="mx-auto max-w-[800px] px-6 text-center">
          <div className="w-12 h-12 rounded-xl bg-accent-subtle text-accent flex items-center justify-center mb-6 mx-auto">
            <Users className="h-6 w-6" />
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-text-primary mb-4">
            Built by designers and engineers
          </h2>
          <p className="text-text-secondary leading-relaxed mb-8 max-w-2xl mx-auto">
            RoomCanvas AI is built by a small team passionate about making interior design accessible. 
            We combine expertise in machine learning, computer vision, and design to create tools that 
            empower creativity.
          </p>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="mx-auto max-w-[600px] px-6 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-text-primary mb-4">
            Ready to redesign your room?
          </h2>
          <p className="text-text-secondary mb-8">
            Join thousands of homeowners and designers using RoomCanvas AI.
          </p>
          <Link to="/upload">
            <Button size="lg" className="h-12 px-8">
              Start Designing — It's Free
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}

export default AboutPage;
