import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDown, ChevronUp, ArrowRight,
  ScanLine, Sparkles, ImageIcon,
  Layers, Zap, ShieldCheck
} from 'lucide-react';
import { Button } from '../components/primitives/Button';
import { CompareSlider } from '../components/results/CompareSlider';


const STEPS = [
  {
    icon: <ImageIcon className="h-5 w-5" />,
    step: '1',
    label: 'Upload',
    desc: 'Snap a photo of any room. No perfect lighting required.',
  },
  {
    icon: <ScanLine className="h-5 w-5" />,
    step: '2',
    label: 'Analyze',
    desc: 'Gemini AI maps furniture, layout, and lighting conditions.',
  },
  {
    icon: <Sparkles className="h-5 w-5" />,
    step: '3',
    label: 'Generate',
    desc: 'Flux creates a stunning photorealistic redesign in minutes.',
  }
];

const FAQ = [
  { q: 'What image formats can I upload?', a: 'JPEG, PNG, and WEBP are supported. Maximum file size is 5MB. Phone photos work perfectly.' },
  { q: 'How long does generation take?', a: 'Analysis takes 5–15 seconds. Image generation runs 30–90 seconds via Flux AI. You can track progress in real time.' },
  { q: 'Is my data stored securely?', a: 'Images and designs are stored securely. Nothing is sent to third-party services beyond our AI providers (Google & Replicate).' },
  { q: 'Can I refine multiple times?', a: 'Yes — every refinement creates a new versioned generation you can compare side-by-side with the original.' },
  { q: 'What styles are available?', a: 'Modern Minimalist, Scandinavian, Industrial, Bohemian, and Luxury Contemporary. More are added regularly.' },
];

const STATS = [
  { value: '10+', label: 'Design Styles' },
  { value: '<90s', label: 'Avg. Generation' },
  { value: '5MB', label: 'Max Upload Size' },
  { value: '∞', label: 'Refinements' },
];

export function LandingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="flex flex-col">
      
      {/* ── HERO SECTION ─────────────────────────────────────────── */}
      <section className="relative overflow-hidden min-h-[85vh] flex items-center justify-center pt-20 pb-16">
        {/* Animated bg */}
        <div className="absolute inset-0 -z-10 pointer-events-none overflow-hidden" aria-hidden>
          <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] rounded-full bg-[radial-gradient(circle,var(--color-accent-muted),transparent_70%)] animate-float opacity-60 mix-blend-screen dark:mix-blend-lighten" />
          <div className="absolute bottom-[-10%] left-[5%] w-[500px] h-[500px] rounded-full bg-[radial-gradient(circle,rgba(91,155,213,0.08),transparent_70%)] animate-float [animation-delay:3s] opacity-80" />
        </div>

        <div className="mx-auto max-w-[1280px] px-6 flex flex-col lg:flex-row items-center gap-12 lg:gap-20 w-full relative z-10">
          
          {/* Left Column: Content */}
          <div className="flex-1 flex flex-col items-start text-left max-w-2xl pt-10 lg:pt-0">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}>
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent-subtle border border-accent/20 text-accent text-xs font-semibold tracking-wide uppercase shadow-sm">
                <Sparkles className="h-3 w-3" />
                Photorealistic AI Redesign
              </span>
            </motion.div>

            <motion.h1 
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
              className="text-[clamp(2.4rem,5vw,4.5rem)] font-bold tracking-tight leading-[1.08] text-text-primary text-balance mt-6"
            >
              See your room,<br />
              <span className="text-accent">redesigned.</span>
            </motion.h1>

            <motion.p 
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.16 }}
              className="text-lg text-text-secondary max-w-xl leading-relaxed text-pretty mt-6"
            >
              Upload a photo. AI understands your room and creates a photorealistic redesign.
            </motion.p>

            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.24 }}
              className="flex flex-col sm:flex-row items-center gap-4 mt-8 w-full sm:w-auto"
            >
              <Button size="lg" asChild className="h-12 px-6 text-[15px] shadow-lg shadow-accent/20 hover:shadow-xl hover:shadow-accent/30 transition-all w-full sm:w-auto justify-center">
                <Link to="/upload">Design my room <ArrowRight className="h-4 w-4 ml-1.5" /></Link>
              </Button>
              <Button variant="ghost" size="lg" className="h-12 px-6 text-[15px] w-full sm:w-auto justify-center" onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}>
                How it works
              </Button>
            </motion.div>

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
              className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-8"
            >
              {['✓ AI Room Analysis', '✓ Photorealistic Designs', '✓ Unlimited Refinements'].map(t => (
                <span key={t} className="text-[13px] font-medium text-text-tertiary flex items-center">
                  {t}
                </span>
              ))}
            </motion.div>
          </div>

          {/* Right Column: Interactive Slider */}
          <motion.div 
             initial={{ opacity: 0, x: 40 }}
             animate={{ opacity: 1, x: 0 }}
             transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
             className="flex-1 w-full max-w-3xl lg:max-w-none"
          >
             <div className="rounded-2xl overflow-hidden shadow-2xl border border-border bg-surface relative group aspect-[4/3] lg:aspect-[16/10]">
               <div className="absolute top-4 left-4 z-10 px-3 py-1.5 bg-black/60 backdrop-blur-md rounded-lg text-white text-xs font-medium tracking-wide shadow-sm border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity">Before</div>
               <div className="absolute top-4 right-4 z-10 px-3 py-1.5 bg-black/60 backdrop-blur-md rounded-lg text-white text-xs font-medium tracking-wide shadow-sm border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity">After</div>
               <CompareSlider
                  beforeSrc="/originalroom.png"
                  afterSrc="/redesignedroom.png"
               />
             </div>
          </motion.div>

        </div>
      </section>

      {/* ── HOW IT WORKS ───────────────────────────────────────── */}
      <section id="how-it-works" className="py-24 bg-surface-alt/40 border-y border-border">
        <div className="mx-auto max-w-content px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-text-primary mb-4">How it works</h2>
            <p className="text-text-secondary">From snapshot to stunning design in three simple steps.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 relative">
             {/* Desktop connecting line */}
             <div className="hidden md:block absolute top-[44px] left-[15%] right-[15%] h-[2px] border-t-2 border-dashed border-border-strong z-0" />
             
             {STEPS.map((step, i) => (
               <div key={i} className="flex flex-col items-center text-center relative z-10 bg-surface-alt/40 p-4">
                  <div className="w-12 h-12 rounded-2xl bg-accent text-white flex items-center justify-center font-bold text-lg shadow-lg shadow-accent/20 mb-6">
                    {step.step}
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="w-10 h-10 rounded-full bg-surface border border-border flex items-center justify-center text-accent mb-4 shadow-sm">
                      {step.icon}
                    </div>
                    <h3 className="text-[17px] font-semibold text-text-primary mb-2">{step.label}</h3>
                    <p className="text-[14px] text-text-secondary leading-relaxed max-w-[260px]">{step.desc}</p>
                  </div>
               </div>
             ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES (BENTO GRID) ──────────────────────────────── */}
      <section className="py-24">
        <div className="mx-auto max-w-[1024px] px-6">
          <div className="text-center mb-16">
             <span className="inline-flex items-center px-3 py-1 rounded-full bg-surface-alt border border-border text-[13px] font-medium text-text-secondary mb-4">
                Features
             </span>
             <h2 className="text-3xl font-bold tracking-tight text-text-primary">Not a style filter — a full redesign engine</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 auto-rows-[280px]">
            
            {/* 1. Deep Room Analysis (Large Col-Span-2) */}
            <div className="md:col-span-2 rounded-[24px] bg-surface border border-border p-8 flex flex-col md:flex-row gap-8 overflow-hidden relative shadow-sm hover:shadow-md transition-shadow group">
               <div className="flex-1 z-10 flex flex-col justify-center">
                 <div className="w-10 h-10 rounded-xl bg-accent-subtle text-accent flex items-center justify-center mb-4">
                   <ScanLine className="h-5 w-5" />
                 </div>
                 <h3 className="text-xl font-bold text-text-primary mb-2">Deep Room Analysis</h3>
                 <p className="text-text-secondary mb-6 text-[15px] leading-relaxed">
                   Gemini Vision intelligently maps your room before generation, understanding exactly what's structural and what's decor.
                 </p>
                 <div className="flex flex-col gap-3">
                   {['Furniture Identification', 'Color Palette Extraction', 'Lighting Detection'].map((item, idx) => (
                     <div key={idx} className="flex items-center gap-2.5 text-[14px] font-medium text-text-primary bg-surface-alt w-fit px-3.5 py-2 rounded-xl border border-border shadow-sm">
                       <ShieldCheck className="h-4 w-4 text-success" />
                       {item}
                     </div>
                   ))}
                 </div>
               </div>
               <div className="flex-1 bg-surface-alt rounded-2xl border border-border relative overflow-hidden hidden md:flex items-center justify-center p-6">
                  <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent" />
                  <div className="absolute right-[-10%] top-[-10%] w-64 h-64 bg-accent/10 blur-[60px] rounded-full" />
                  <div className="w-full max-w-[280px] bg-surface border border-border shadow-xl rounded-xl overflow-hidden flex flex-col relative z-10">
                     <div className="h-9 border-b border-border bg-surface-alt/50 flex items-center px-4 gap-2">
                       <div className="w-2.5 h-2.5 rounded-full bg-border-strong" />
                       <div className="w-2.5 h-2.5 rounded-full bg-border-strong" />
                       <div className="w-2.5 h-2.5 rounded-full bg-border-strong" />
                     </div>
                     <div className="p-5 space-y-4">
                        <div className="h-2.5 w-1/3 bg-border-strong rounded-full" />
                        <div className="space-y-2">
                          <div className="h-2 w-full bg-border rounded-full" />
                          <div className="h-2 w-5/6 bg-border rounded-full" />
                          <div className="h-2 w-4/6 bg-border rounded-full" />
                        </div>
                     </div>
                  </div>
               </div>
            </div>

            {/* 2. Lightning Fast Generation */}
            <div className="rounded-[24px] bg-surface border border-border p-8 flex flex-col overflow-hidden shadow-sm hover:shadow-md transition-shadow group">
               <div className="w-10 h-10 rounded-xl bg-accent-subtle text-accent flex items-center justify-center mb-4 z-10">
                 <Zap className="h-5 w-5" />
               </div>
               <h3 className="text-xl font-bold text-text-primary mb-2 z-10">Lightning Fast Generation</h3>
               <p className="text-text-secondary text-[15px] leading-relaxed z-10">
                 Powered by Flux Kontext Pro, get stunning high-res renders in just a few minutes.
               </p>
               <div className="mt-auto pt-6 z-10">
                  <div className="h-14 w-full bg-surface-alt border border-border rounded-xl flex items-center px-5 shadow-inner">
                    <div className="w-full h-2.5 bg-border rounded-full overflow-hidden">
                       <div className="w-[85%] h-full bg-accent rounded-full relative overflow-hidden">
                          <div className="absolute inset-0 bg-white/20 w-1/2 animate-[skeleton-shimmer_1s_infinite]" />
                       </div>
                    </div>
                  </div>
               </div>
            </div>

            {/* 3. Iterative Refinement */}
            <div className="rounded-[24px] bg-surface border border-border p-8 flex flex-col overflow-hidden shadow-sm hover:shadow-md transition-shadow group">
               <div className="w-10 h-10 rounded-xl bg-accent-subtle text-accent flex items-center justify-center mb-4 z-10">
                 <Layers className="h-5 w-5" />
               </div>
               <h3 className="text-xl font-bold text-text-primary mb-2 z-10">Iterative Refinement</h3>
               <p className="text-text-secondary text-[15px] leading-relaxed z-10">
                 Chat with the AI. Say "make it brighter" and keep the bones of the design.
               </p>
               <div className="mt-auto pt-6 flex justify-end z-10">
                  <div className="bg-accent text-white px-4 py-3 rounded-2xl rounded-br-sm shadow-md text-[14px] font-medium w-fit max-w-[90%] relative">
                     "Make the lighting warmer and add some plants."
                  </div>
               </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── SOCIAL PROOF STRIP ─────────────────────────────────── */}
      <section className="py-10 border-y border-border bg-surface-alt overflow-hidden">
         <div className="flex flex-col items-center justify-center gap-6 px-6">
            <span className="text-xs font-semibold uppercase tracking-widest text-text-tertiary">Trusted by designers and homeowners</span>
            <div className="flex flex-col md:flex-row gap-6 w-full max-w-[1024px] overflow-x-auto pb-4 snap-x">
               {[
                 { name: "Sarah J.", role: "Interior Designer", quote: "RoomCanvas cuts my concept phase from days to literally minutes." },
                 { name: "Mark T.", role: "Homeowner", quote: "Finally, I can actually see what my living room looks like before buying furniture." },
                 { name: "Elena R.", role: "Architect", quote: "The structural awareness is incredible. It keeps the walls and windows where they belong." }
               ].map((t, i) => (
                 <div key={i} className="flex-1 min-w-[280px] p-5 bg-surface border border-border rounded-xl shadow-sm snap-center">
                    <p className="text-[14px] text-text-secondary italic mb-4">"{t.quote}"</p>
                    <div className="flex items-center gap-3">
                       <div className="w-8 h-8 rounded-full bg-accent-subtle text-accent flex items-center justify-center font-bold text-xs">{t.name[0]}</div>
                       <div className="flex flex-col">
                         <span className="text-xs font-bold text-text-primary">{t.name}</span>
                         <span className="text-[11px] text-text-tertiary">{t.role}</span>
                       </div>
                    </div>
                 </div>
               ))}
            </div>
         </div>
      </section>

      {/* ── STATS BAR ────────────────────────────────────────── */}
      <section className="py-20 border-b border-border">
         <div className="mx-auto max-w-[1024px] px-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
               {STATS.map(s => (
                 <div key={s.label} className="flex flex-col gap-2">
                    <span className="text-4xl font-bold text-text-primary tracking-tight">{s.value}</span>
                    <span className="text-sm font-medium text-text-tertiary uppercase tracking-wider">{s.label}</span>
                 </div>
               ))}
            </div>
         </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────── */}
      <section className="py-24" aria-labelledby="faq-heading">
        <div className="mx-auto max-w-[800px] px-6">
          <div className="text-center mb-12">
            <h2 id="faq-heading" className="text-3xl font-bold tracking-tight text-text-primary">
              Frequently asked questions
            </h2>
          </div>

          <div className="divide-y divide-border border border-border bg-surface rounded-[24px] overflow-hidden shadow-sm">
            {FAQ.map((item, i) => (
              <div key={i}>
                <button
                  className="w-full flex items-center justify-between px-6 py-5 text-left hover:bg-surface-alt transition-colors duration-[180ms] focus-visible:outline-none focus-visible:bg-surface-alt cursor-pointer"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  aria-expanded={openFaq === i}
                >
                  <span className="text-[15px] font-medium text-text-primary pr-4">{item.q}</span>
                  {openFaq === i ? <ChevronUp className="h-4 w-4 text-text-tertiary shrink-0" /> : <ChevronDown className="h-4 w-4 text-text-tertiary shrink-0" />}
                </button>
                <AnimatePresence>
                  {openFaq === i && (
                    <motion.div
                      initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
                      transition={{ duration: 0.22, ease: [0, 0, 0.2, 1] }}
                      className="overflow-hidden"
                    >
                      <p className="px-6 pb-5 text-[15px] text-text-secondary leading-relaxed bg-surface">
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

      {/* ── CTA BANNER ─────────────────────────────────────────── */}
      <section className="py-24 bg-gradient-to-b from-bg to-accent/5">
        <div className="mx-auto max-w-content px-6 text-center flex flex-col items-center">
          <h2 className="text-4xl font-bold tracking-tight text-text-primary mb-4">
            Ready to reimagine your space?
          </h2>
          <p className="text-text-secondary mb-8 text-[17px] max-w-md mx-auto leading-relaxed">
            Upload a photo and get your first AI redesign in minutes.
          </p>
          <Link to="/upload">
            <Button size="lg" className="h-14 px-8 text-base shadow-xl shadow-accent/20">
              Start designing — it's free
            </Button>
          </Link>
          <p className="text-xs text-text-tertiary mt-4">Takes less than 2 minutes</p>
        </div>
      </section>
    </div>
  );
}
