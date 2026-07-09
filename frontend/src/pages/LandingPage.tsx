import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDown, ChevronUp, ArrowRight,
  ScanLine, Sparkles, Pencil, ImageIcon,
  Layers, MoveRight,
} from 'lucide-react';
import { Button } from '../components/primitives/Button';
import { CompareSlider, CompareSliderSkeleton } from '../components/results/CompareSlider';
import { useHistory } from '../api/queries';
import { resolveImageUrl } from '../api/client';

const STEPS: { icon: ReactNode; step: string; label: string; desc: string; link?: string }[] = [
  {
    icon: <ImageIcon className="h-5 w-5" />,
    step: '01',
    label: 'Upload',
    desc: 'Drop a photo of any room — phone snapshots work perfectly.',
    link: '/upload',
  },
  {
    icon: <ScanLine className="h-5 w-5" />,
    step: '02',
    label: 'Analyze',
    desc: 'Gemini AI maps furniture, palette, dimensions, and budget.',
  },
  {
    icon: <Sparkles className="h-5 w-5" />,
    step: '03',
    label: 'Generate',
    desc: 'Flux creates a photorealistic redesign in under 90 seconds.',
  },
  {
    icon: <Pencil className="h-5 w-5" />,
    step: '04',
    label: 'Refine',
    desc: 'Say "make it brighter" and regenerate until it\'s perfect.',
  },
];

const FEATURES = [
  {
    icon: <ScanLine className="h-5 w-5" />,
    title: 'Deep Room Analysis',
    desc: 'Real furniture identification, dimension estimation, color palette extraction — not just a style filter.',
  },
  {
    icon: <Sparkles className="h-5 w-5" />,
    title: 'Photorealistic Generation',
    desc: 'Flux Kontext Pro generates interior redesigns that look like professional photography.',
  },
  {
    icon: <Layers className="h-5 w-5" />,
    title: 'Iterative Refinement',
    desc: 'Keep the bones, change the details. Natural language edits, unlimited iterations.',
  },
];

const FAQ = [
  { q: 'What image formats can I upload?', a: 'JPEG, PNG, and WEBP are supported. Maximum file size is set by the server (shown on the upload page). Phone photos work perfectly.' },
  { q: 'How long does generation take?', a: 'Analysis takes 5–15 seconds. Image generation runs 30–90 seconds on Flux AI via Replicate. You can track progress in real time.' },
  { q: 'Is my data stored?', a: 'Images and designs are stored locally on the server running RoomCanvas. Nothing is sent to third-party services beyond the AI providers.' },
  { q: 'Can I refine multiple times?', a: 'Yes — every refinement creates a new versioned generation you can compare side-by-side with the original or any previous version.' },
  { q: 'What styles are available?', a: 'Modern Minimalist, Scandinavian, Industrial, Bohemian, and Luxury Contemporary. Styles load live from the server.' },
];

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show:   { opacity: 1, y: 0 },
};

const stagger = {
  show: { transition: { staggerChildren: 0.1 } },
};

export function LandingPage() {
  const { data: historyItems, isLoading: historyLoading } = useHistory(3);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const recentCompleted = historyItems?.filter((g) => g.status === 'completed' && g.variations.length > 0) ?? [];

  return (
    <div className="flex flex-col page-enter">

      {/* ── HERO ─────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-bg">
        {/* Warm radial glow */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: 'radial-gradient(ellipse 70% 50% at 60% -10%, rgba(183,110,77,0.10) 0%, transparent 70%)' }}
          aria-hidden="true"
        />

        <div className="mx-auto max-w-content px-6 pt-20 pb-16 relative">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-12 xl:gap-16 items-center">

            {/* Left: headline + CTA */}
            <motion.div
              variants={stagger}
              initial="hidden"
              animate="show"
              className="max-w-lg"
            >
              <motion.p
                variants={fadeUp}
                className="text-xs font-semibold uppercase tracking-widest text-accent mb-5"
              >
                AI Interior Design
              </motion.p>

              <motion.h1
                variants={fadeUp}
                className="font-semibold tracking-tight text-[52px] xl:text-[60px] leading-tight text-text-primary mb-5"
                style={{ lineHeight: 1.1, letterSpacing: '-0.025em' }}
              >
                See your room,{' '}
                <em className="not-italic" style={{ color: 'var(--color-accent)' }}>redesigned</em>
              </motion.h1>

              <motion.p
                variants={fadeUp}
                className="text-lg text-text-secondary leading-relaxed mb-8"
              >
                Upload a photo of any room. Get AI analysis, furniture recommendations,
                and a photorealistic redesign — in under two minutes.
              </motion.p>

              <motion.div variants={fadeUp} className="flex flex-wrap gap-3">
                <Link to="/upload">
                  <Button
                    size="lg"
                    variant="primary"
                    iconRight={<ArrowRight className="h-4 w-4" />}
                  >
                    Start Your Design
                  </Button>
                </Link>
                <Link to="/history">
                  <Button size="lg" variant="secondary">
                    View History
                  </Button>
                </Link>
              </motion.div>

              {/* Subtle social proof */}
              <motion.div variants={fadeUp} className="mt-8 flex items-center gap-3">
                <div className="flex -space-x-2">
                  {['#D4B5A0', '#C4A882', '#B89473'].map((bg, i) => (
                    <div
                      key={i}
                      className="h-7 w-7 rounded-full border-2 border-surface"
                      style={{ backgroundColor: bg }}
                      aria-hidden="true"
                    />
                  ))}
                </div>
                <p className="text-xs text-text-tertiary">
                  5 styles · unlimited refinements · real-time generation
                </p>
              </motion.div>
            </motion.div>

            {/* Right: Before/After hero */}
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            >
              <HeroVisual recentCompleted={recentCompleted} historyLoading={historyLoading} />
            </motion.div>
          </div>
        </div>

        {/* Scroll hint */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 hidden lg:flex flex-col items-center gap-1 opacity-40" aria-hidden="true">
          <div className="h-10 w-[1px] bg-border-strong" />
          <ChevronDown className="h-3 w-3 text-text-tertiary" />
        </div>
      </section>

      {/* ── HOW IT WORKS ──────────────────────────────────────────── */}
      <section className="bg-surface border-y border-border py-20" aria-labelledby="how-heading">
        <div className="mx-auto max-w-content px-6">
          <div className="text-center mb-12">
            <p className="text-xs font-semibold uppercase tracking-widest text-accent mb-3">How it works</p>
            <h2 id="how-heading" className="text-3xl font-semibold text-text-primary">
              From photo to redesign in minutes
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-border rounded-2xl overflow-hidden">
            {STEPS.map((step, i) => (
              <div key={step.label} className="bg-surface p-8 flex flex-col gap-4 relative">
                {/* Step number */}
                <p className="text-xs font-mono text-text-tertiary tracking-widest">{step.step}</p>

                {/* Icon */}
                <div className="w-10 h-10 rounded-xl bg-accent-subtle text-accent flex items-center justify-center">
                  {step.icon}
                </div>

                {/* Content */}
                <div>
                  {step.link ? (
                    <Link to={step.link} className="text-base font-semibold text-accent hover:underline block mb-1.5">
                      {step.label}
                    </Link>
                  ) : (
                    <h3 className="text-base font-semibold text-text-primary mb-1.5">{step.label}</h3>
                  )}
                  <p className="text-sm text-text-secondary leading-relaxed">{step.desc}</p>
                </div>

                {/* Connector arrow */}
                {i < STEPS.length - 1 && (
                  <MoveRight
                    className="absolute -right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-border-strong z-10 hidden lg:block"
                    aria-hidden="true"
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ─────────────────────────────────────────────── */}
      <section className="py-20" aria-labelledby="features-heading">
        <div className="mx-auto max-w-content px-6">
          <div className="text-center mb-12">
            <p className="text-xs font-semibold uppercase tracking-widest text-accent mb-3">Built different</p>
            <h2 id="features-heading" className="text-3xl font-semibold text-text-primary">
              Not a style filter — a full redesign engine
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="group p-8 rounded-2xl border border-border bg-surface hover:border-accent/30 hover:shadow-md transition-all duration-base"
              >
                <div className="w-10 h-10 rounded-xl bg-accent-subtle text-accent flex items-center justify-center mb-5 group-hover:scale-105 transition-transform duration-base">
                  {f.icon}
                </div>
                <h3 className="text-base font-semibold text-text-primary mb-2">{f.title}</h3>
                <p className="text-sm text-text-secondary leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── RECENT DESIGNS (from real history) ───────────────────── */}
      {(historyLoading || recentCompleted.length > 0) && (
        <section className="bg-surface border-y border-border py-20" aria-labelledby="examples-heading">
          <div className="mx-auto max-w-content px-6">
            <div className="text-center mb-10">
              <p className="text-xs font-semibold uppercase tracking-widest text-accent mb-3">Live results</p>
              <h2 id="examples-heading" className="text-3xl font-semibold text-text-primary">
                Recent designs from your library
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {historyLoading
                ? [0, 1, 2].map((i) => (
                    <div key={i} className="rounded-2xl overflow-hidden border border-border">
                      <CompareSliderSkeleton />
                    </div>
                  ))
                : recentCompleted.map((g) => (
                    <Link
                      key={g.id}
                      to={`/results/${g.id}`}
                      className="group block rounded-2xl overflow-hidden border border-border hover:border-accent/30 hover:shadow-md transition-all duration-base"
                    >
                      <CompareSlider
                        beforeSrc={resolveImageUrl(g.original_image_path)}
                        afterSrc={resolveImageUrl(g.variations[0].image_path)}
                      />
                      <div className="px-4 py-3 flex items-center justify-between bg-surface">
                        <p className="text-xs font-medium text-text-secondary">
                          {g.room_type_detected ?? 'Room'} &middot; {g.style}
                        </p>
                        <ArrowRight className="h-3.5 w-3.5 text-text-tertiary group-hover:text-accent group-hover:translate-x-0.5 transition-all duration-fast" aria-hidden="true" />
                      </div>
                    </Link>
                  ))}
            </div>
          </div>
        </section>
      )}

      {/* ── FAQ ──────────────────────────────────────────────────── */}
      <section className="py-20" aria-labelledby="faq-heading">
        <div className="mx-auto max-w-content px-6">
          <div className="text-center mb-10">
            <p className="text-xs font-semibold uppercase tracking-widest text-accent mb-3">FAQ</p>
            <h2 id="faq-heading" className="text-3xl font-semibold text-text-primary">
              Common questions
            </h2>
          </div>

          <div className="max-w-2xl mx-auto divide-y divide-border border border-border rounded-2xl overflow-hidden">
            {FAQ.map((item, i) => (
              <div key={i}>
                <button
                  className="w-full flex items-center justify-between px-6 py-5 text-left hover:bg-surface-alt transition-colors duration-fast focus-visible:outline-none focus-visible:shadow-focus"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  aria-expanded={openFaq === i}
                  aria-controls={`faq-answer-${i}`}
                >
                  <span className="text-sm font-medium text-text-primary pr-4">{item.q}</span>
                  {openFaq === i
                    ? <ChevronUp className="h-4 w-4 text-text-tertiary flex-shrink-0" />
                    : <ChevronDown className="h-4 w-4 text-text-tertiary flex-shrink-0" />
                  }
                </button>
                <AnimatePresence>
                  {openFaq === i && (
                    <motion.div
                      id={`faq-answer-${i}`}
                      role="region"
                      initial={{ height: 0 }}
                      animate={{ height: 'auto' }}
                      exit={{ height: 0 }}
                      transition={{ duration: 0.22, ease: [0, 0, 0.2, 1] }}
                      className="overflow-hidden"
                    >
                      <p className="px-6 pb-5 text-sm text-text-secondary leading-relaxed bg-surface">
                        {item.a}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA BAND ─────────────────────────────────────────────── */}
      <section className="relative overflow-hidden" style={{ backgroundColor: 'var(--color-accent)' }}>
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: 'radial-gradient(ellipse 60% 80% at 90% 50%, rgba(255,255,255,0.06) 0%, transparent 70%)' }}
          aria-hidden="true"
        />
        <div className="relative mx-auto max-w-content px-6 py-20 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-white/60 mb-4">Get started free</p>
          <h2 className="text-4xl font-semibold tracking-tight text-white mb-4" style={{ lineHeight: 1.15 }}>
            Ready to see your room<br />transformed?
          </h2>
          <p className="text-white/70 mb-8 text-base max-w-sm mx-auto leading-relaxed">
            Upload a photo and get your first AI redesign in minutes. No account required.
          </p>
          <Link to="/upload">
            <Button
              size="lg"
              className="bg-white text-accent hover:bg-white/95 shadow-lg"
              iconRight={<ArrowRight className="h-4 w-4" />}
            >
              Start Your Design
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}

/* ── Hero visual — before/after or placeholder ─── */
function HeroVisual({ recentCompleted, historyLoading }: { recentCompleted: ReturnType<typeof useHistory>['data'] extends (infer T)[] | undefined ? T[] : never; historyLoading: boolean }) {
  const first = recentCompleted[0];

  if (historyLoading) {
    return (
      <div className="rounded-2xl overflow-hidden border border-border shadow-xl">
        <CompareSliderSkeleton />
      </div>
    );
  }

  if (first) {
    return (
      <div className="rounded-2xl overflow-hidden border border-border shadow-xl">
        <CompareSlider
          beforeSrc={resolveImageUrl(first.original_image_path)}
          afterSrc={resolveImageUrl(first.variations[0].image_path)}
          beforeLabel="Original"
          afterLabel="Redesigned"
        />
      </div>
    );
  }

  // Placeholder when no designs yet — elegant architectural illustration
  return (
    <div className="rounded-2xl overflow-hidden border border-border shadow-xl bg-surface-alt aspect-[4/3] flex flex-col items-center justify-center gap-5 px-8 text-center">
      <RoomPlaceholderIllustration />
      <div>
        <p className="text-sm font-medium text-text-primary mb-1.5">Your first redesign will appear here</p>
        <p className="text-xs text-text-tertiary leading-relaxed max-w-xs">
          After you generate a design, we'll show a live before &amp; after comparison in this spot.
        </p>
      </div>
      <Link to="/upload">
        <Button size="sm" variant="outline" iconRight={<ArrowRight className="h-3.5 w-3.5" />}>
          Create first design
        </Button>
      </Link>
    </div>
  );
}

function RoomPlaceholderIllustration() {
  return (
    <svg width="200" height="140" viewBox="0 0 200 140" fill="none" aria-hidden="true" className="opacity-60">
      {/* Floor plane */}
      <path d="M20 110 L100 70 L180 110 Z" fill="var(--color-surface-alt)" stroke="var(--color-border)" strokeWidth="1.5" strokeLinejoin="round" />
      {/* Left wall */}
      <path d="M20 20 L100 60 L100 70 L20 110 Z" fill="var(--color-surface)" stroke="var(--color-border)" strokeWidth="1.5" strokeLinejoin="round" />
      {/* Right wall */}
      <path d="M180 20 L100 60 L100 70 L180 110 Z" fill="var(--color-surface-alt)" stroke="var(--color-border)" strokeWidth="1.5" strokeLinejoin="round" />
      {/* Ceiling */}
      <path d="M20 20 L100 60 L180 20 Z" fill="var(--color-border)" stroke="var(--color-border-strong)" strokeWidth="1.5" strokeLinejoin="round" />
      {/* Window on left wall */}
      <rect x="32" y="38" width="38" height="28" rx="2" fill="var(--color-info-subtle)" stroke="var(--color-info)" strokeWidth="1.25" />
      <line x1="51" y1="38" x2="51" y2="66" stroke="var(--color-info)" strokeWidth="0.75" />
      <line x1="32" y1="52" x2="70" y2="52" stroke="var(--color-info)" strokeWidth="0.75" />
      {/* Sofa */}
      <rect x="72" y="82" width="56" height="20" rx="5" fill="var(--color-accent-subtle)" stroke="var(--color-accent)" strokeWidth="1.5" />
      <rect x="72" y="76" width="56" height="10" rx="5" fill="var(--color-accent)" />
      {/* Cushion dividers */}
      <line x1="100" y1="76" x2="100" y2="102" stroke="rgba(183,110,77,0.3)" strokeWidth="1" />
      {/* Legs */}
      <line x1="78" y1="102" x2="78" y2="108" stroke="var(--color-accent)" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="122" y1="102" x2="122" y2="108" stroke="var(--color-accent)" strokeWidth="1.5" strokeLinecap="round" />
      {/* Plant */}
      <rect x="155" y="93" width="14" height="12" rx="2" fill="var(--color-success-subtle)" stroke="var(--color-success)" strokeWidth="1.25" />
      <ellipse cx="162" cy="84" rx="9" ry="12" fill="var(--color-success)" opacity="0.5" />
      <ellipse cx="156" cy="87" rx="7" ry="9" fill="var(--color-success)" opacity="0.4" />
      {/* Coffee table */}
      <rect x="88" y="103" width="24" height="4" rx="2" fill="var(--color-border-strong)" />
    </svg>
  );
}
