import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDown, ChevronUp, ArrowRight,
  ScanLine, Sparkles, ImageIcon,
  Layers, Zap, ShieldCheck, User
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
    label: 'Understand',
    desc: "AI understands your room's layout, furniture and lighting.",
  },
  {
    icon: <Sparkles className="h-5 w-5" />,
    step: '3',
    label: 'Generate',
    desc: 'Generate a realistic redesign tailored to your style.',
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
  { value: 'Private', label: 'Design History' },
  { value: 'Unlimited', label: 'Refinements' },
  { value: 'AI', label: 'Room Understanding' },
];

export function LandingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="flex flex-col">
      
      {/* ── HERO SECTION ─────────────────────────────────────────── */}
      <section className="relative overflow-hidden min-h-[75vh] lg:min-h-[85vh] flex items-center justify-center pt-8 sm:pt-12 lg:pt-20 pb-12 lg:pb-16">
        {/* Animated bg */}
        <div className="absolute inset-0 -z-10 pointer-events-none overflow-hidden" aria-hidden>
          <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] rounded-full bg-[radial-gradient(circle,var(--color-accent-muted),transparent_70%)] animate-float opacity-60 mix-blend-screen dark:mix-blend-lighten" />
          <div className="absolute bottom-[-10%] left-[5%] w-[500px] h-[500px] rounded-full bg-[radial-gradient(circle,rgba(91,155,213,0.08),transparent_70%)] animate-float [animation-delay:3s] opacity-80" />
        </div>

        <div className="mx-auto max-w-[1280px] px-4 sm:px-6 flex flex-col lg:flex-row items-center gap-8 sm:gap-10 lg:gap-20 w-full relative z-10">
          
          {/* Left Column: Content */}
          <div className="flex-1 flex flex-col items-start text-left max-w-2xl lg:pt-10">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}>
              <span className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full bg-accent-subtle border border-accent/20 text-accent text-[10px] sm:text-xs font-semibold tracking-wide uppercase shadow-sm">
                <Sparkles className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                Photorealistic AI Redesign
              </span>
            </motion.div>

            <motion.h1 
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
              className="text-[clamp(2rem,8vw,4.5rem)] sm:text-[clamp(2.4rem,5vw,4.5rem)] font-bold tracking-tight leading-[1.08] text-text-primary text-balance mt-4 sm:mt-6"
            >
              See your room,<br />
              <span className="text-accent">redesigned.</span>
            </motion.h1>

            <motion.p 
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.16 }}
              className="text-base sm:text-lg text-text-secondary max-w-[90%] sm:max-w-xl leading-relaxed text-pretty mt-4 sm:mt-6"
            >
              Upload a photo of your room. AI preserves its layout while creating realistic interior redesigns.
            </motion.p>

            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.24 }}
              className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 mt-6 sm:mt-8 w-full sm:w-auto"
            >
              <Button size="lg" asChild className="h-11 sm:h-12 px-6 text-sm sm:text-[15px] shadow-lg shadow-accent/20 hover:shadow-xl hover:shadow-accent/30 transition-all w-[90%] sm:w-auto justify-center mx-auto sm:mx-0">
                <Link to="/upload">Design my room <ArrowRight className="h-4 w-4 ml-1.5" /></Link>
              </Button>
              <Button variant="ghost" size="lg" className="h-11 sm:h-12 px-6 text-sm sm:text-[15px] w-[90%] sm:w-auto justify-center mx-auto sm:mx-0" onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}>
                How it works
              </Button>
            </motion.div>

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
              className="flex flex-wrap items-center justify-center sm:justify-start gap-x-4 sm:gap-x-6 gap-y-2 mt-6 sm:mt-8 w-full"
            >
              {['✓ Preserves Room Layout', '✓ Photorealistic Redesigns', '✓ Unlimited Refinements'].map(t => (
                <span key={t} className="text-[11px] sm:text-[13px] font-medium text-text-tertiary flex items-center">
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
             className="flex-1 w-full max-w-3xl lg:max-w-none px-2 sm:px-0"
          >
             <CompareSlider
                beforeSrc="/originalroom.png"
                afterSrc="/redesignedroom.png"
                className="rounded-xl sm:rounded-2xl shadow-2xl border border-border"
             />
          </motion.div>

        </div>
      </section>

      {/* ── HOW IT WORKS ───────────────────────────────────────── */}
      <section id="how-it-works" className="py-12 sm:py-16 lg:py-24 bg-surface-alt/40 border-y border-border">
        <div className="mx-auto max-w-content px-4 sm:px-6">
          <div className="text-center mb-8 sm:mb-12 lg:mb-16">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-text-primary mb-2 sm:mb-4">How it works</h2>
            <p className="text-sm sm:text-base text-text-secondary">From snapshot to stunning design in three simple steps.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 lg:gap-10 relative">
             {/* Desktop connecting line */}
             <div className="hidden md:block absolute top-[44px] left-[15%] right-[15%] h-[2px] border-t-2 border-dashed border-border-strong z-0" />
             
             {STEPS.map((step, i) => (
               <div key={i} className="flex flex-col items-center text-center relative z-10 bg-surface-alt/40 p-4 sm:p-5 lg:p-6 rounded-xl">
                  <div className="w-10 h-10 sm:w-11 sm:h-11 lg:w-12 lg:h-12 rounded-2xl bg-accent text-white flex items-center justify-center font-bold text-base sm:text-lg shadow-lg shadow-accent/20 mb-4 sm:mb-5 lg:mb-6">
                    {step.step}
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-surface border border-border flex items-center justify-center text-accent mb-3 sm:mb-4 shadow-sm">
                      {step.icon}
                    </div>
                    <h3 className="text-base sm:text-[17px] font-semibold text-text-primary mb-1.5 sm:mb-2">{step.label}</h3>
                    <p className="text-xs sm:text-sm text-text-secondary leading-relaxed max-w-[260px]">{step.desc}</p>
                  </div>
               </div>
             ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES (BENTO GRID) ──────────────────────────────── */}
      <section className="py-12 sm:py-16 lg:py-24">
        <div className="mx-auto max-w-[1024px] px-4 sm:px-6">
          <div className="text-center mb-8 sm:mb-12 lg:mb-16">
             <span className="inline-flex items-center px-3 py-1 rounded-full bg-surface-alt border border-border text-xs sm:text-[13px] font-medium text-text-secondary mb-3 sm:mb-4">
                Features
             </span>
             <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-text-primary">More than a style filter</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 auto-rows-auto">
            
            {/* 1. Deep Room Analysis (Large Col-Span-2) - Premium AI Visualization */}
            <motion.div 
               initial={{ opacity: 0, y: 8 }}
               whileInView={{ opacity: 1, y: 0 }}
               viewport={{ once: true, margin: '-50px' }}
               transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
               className="md:col-span-2 rounded-2xl sm:rounded-[24px] bg-gradient-to-br from-surface to-surface-alt/50 border border-border overflow-hidden relative shadow-sm hover:shadow-md transition-shadow group"
            >
               <div className="grid grid-cols-1 md:grid-cols-[38%_62%] gap-6 sm:gap-8 md:gap-10 p-6 sm:p-8 md:p-10 items-center min-h-0">
                 {/* Left Column: Text & Chips */}
                 <div className="flex flex-col justify-center">
                   <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-accent-subtle text-accent flex items-center justify-center mb-4 sm:mb-5 shadow-sm">
                     <ScanLine className="h-4 w-4 sm:h-5 sm:w-5" />
                   </div>
                   <h3 className="text-lg sm:text-xl lg:text-[22px] font-bold text-text-primary mb-2 sm:mb-3 leading-snug">Understands Your Room</h3>
                   <p className="text-text-secondary mb-6 sm:mb-8 text-sm sm:text-[15px] leading-relaxed">
                     Detects walls, windows, furniture, lighting and room structure before generating a redesign.
                   </p>
                   <div className="flex flex-wrap gap-2 sm:gap-2.5">
                     {['Furniture Identification', 'Color Palette Extraction', 'Lighting Detection'].map((item, idx) => (
                       <div key={idx} className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-[13px] font-medium text-text-primary bg-surface border border-border shadow-sm px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-lg sm:rounded-xl hover:bg-surface-alt hover:border-border-strong transition-all duration-fast">
                         <ShieldCheck className="h-3 w-3 sm:h-4 sm:w-4 text-accent shrink-0" />
                         <span className="whitespace-nowrap">{item}</span>
                       </div>
                     ))}
                   </div>
                 </div>
                 
                 {/* Right Column: AI Analysis Visual */}
                 <div className="flex items-center justify-center">
                    <div className="relative w-full rounded-lg sm:rounded-xl overflow-hidden shadow-xl border border-border bg-black group-hover:shadow-2xl transition-shadow duration-500">
                       {/* Base room image */}
                       <img 
                         src="/originalroom.png" 
                         alt="AI Room Analysis" 
                         className="w-full h-auto object-cover opacity-90 transition-transform duration-[800ms] ease-out group-hover:scale-[1.02]" 
                       />
                       
                       {/* Gradient overlay */}
                       <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />

                       {/* SVG Detection Overlays */}
                       <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
                         <defs>
                           <filter id="glow">
                             <feGaussianBlur stdDeviation="0.5" result="coloredBlur"/>
                             <feMerge>
                               <feMergeNode in="coloredBlur"/>
                               <feMergeNode in="SourceGraphic"/>
                             </feMerge>
                           </filter>
                           
                           <linearGradient id="scanGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                             <stop offset="0%" stopColor="white" stopOpacity="0"/>
                             <stop offset="50%" stopColor="white" stopOpacity="0.8"/>
                             <stop offset="100%" stopColor="white" stopOpacity="0"/>
                           </linearGradient>
                         </defs>
                         
                         <rect x="5" y="8" width="22" height="68" fill="rgba(74, 222, 128, 0.08)" stroke="rgba(74, 222, 128, 0.6)" strokeWidth="0.3" rx="0.5" filter="url(#glow)">
                           <animate attributeName="stroke-opacity" values="0.4;0.7;0.4" dur="3s" repeatCount="indefinite" />
                         </rect>
                         
                         <rect x="55" y="58" width="38" height="32" fill="rgba(91, 155, 213, 0.08)" stroke="rgba(91, 155, 213, 0.6)" strokeWidth="0.3" rx="0.5" filter="url(#glow)">
                           <animate attributeName="stroke-opacity" values="0.4;0.7;0.4" dur="2.5s" repeatCount="indefinite" begin="0.3s" />
                         </rect>
                         
                         <rect x="35" y="70" width="18" height="18" fill="rgba(168, 85, 247, 0.08)" stroke="rgba(168, 85, 247, 0.6)" strokeWidth="0.3" rx="0.5" filter="url(#glow)">
                           <animate attributeName="stroke-opacity" values="0.4;0.7;0.4" dur="2.8s" repeatCount="indefinite" begin="0.5s" />
                         </rect>
                         
                         <path d="M 10 85 L 90 85 M 10 90 L 90 90 M 10 95 L 90 95" stroke="rgba(255, 255, 255, 0.15)" strokeWidth="0.15" strokeDasharray="1,1" />
                         <path d="M 2 2 L 98 2 L 98 98 L 2 98 Z" stroke="rgba(255, 255, 255, 0.2)" strokeWidth="0.2" fill="none" strokeDasharray="2,2" />
                         
                         <motion.rect 
                           x="0" 
                           y="0" 
                           width="100" 
                           height="0.8" 
                           fill="url(#scanGradient)" 
                           opacity="0.6"
                           animate={{ y: [0, 100, 0] }}
                           transition={{ duration: 6, ease: "linear", repeat: Infinity }}
                         />
                       </svg>

                       <motion.div 
                         initial={{ opacity: 0, y: -4 }}
                         animate={{ opacity: 1, y: 0 }}
                         transition={{ delay: 0.5, duration: 0.4 }}
                         className="absolute top-[8%] left-[6%] bg-[rgba(74,222,128,0.95)] backdrop-blur-sm text-white text-[8px] sm:text-[9px] md:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded shadow-lg uppercase tracking-wider"
                       >
                         Window <span className="text-[7px] sm:text-[8px] md:text-[9px] opacity-90 ml-0.5 sm:ml-1">99%</span>
                       </motion.div>

                       <motion.div 
                         initial={{ opacity: 0, y: -4 }}
                         animate={{ opacity: 1, y: 0 }}
                         transition={{ delay: 0.7, duration: 0.4 }}
                         className="absolute top-[57%] left-[56%] bg-[rgba(91,155,213,0.95)] backdrop-blur-sm text-white text-[8px] sm:text-[9px] md:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded shadow-lg uppercase tracking-wider"
                       >
                         Sofa <span className="text-[7px] sm:text-[8px] md:text-[9px] opacity-90 ml-0.5 sm:ml-1">98%</span>
                       </motion.div>

                       <motion.div 
                         initial={{ opacity: 0, y: -4 }}
                         animate={{ opacity: 1, y: 0 }}
                         transition={{ delay: 0.9, duration: 0.4 }}
                         className="absolute top-[69%] left-[36%] bg-[rgba(168,85,247,0.95)] backdrop-blur-sm text-white text-[8px] sm:text-[9px] md:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded shadow-lg uppercase tracking-wider"
                       >
                         Table <span className="text-[7px] sm:text-[8px] md:text-[9px] opacity-90 ml-0.5 sm:ml-1">97%</span>
                       </motion.div>

                       <div className="absolute top-2 left-2 w-3 h-3 sm:w-4 sm:h-4 border-t-2 border-l-2 border-white/40" />
                       <div className="absolute top-2 right-2 w-3 h-3 sm:w-4 sm:h-4 border-t-2 border-r-2 border-white/40" />
                       <div className="absolute bottom-2 left-2 w-3 h-3 sm:w-4 sm:h-4 border-b-2 border-l-2 border-white/40" />
                       <div className="absolute bottom-2 right-2 w-3 h-3 sm:w-4 sm:h-4 border-b-2 border-r-2 border-white/40" />
                    </div>
                 </div>
               </div>
            </motion.div>

            {/* 2. Lightning Fast Generation */}
            <div className="rounded-2xl sm:rounded-[24px] bg-surface border border-border p-6 sm:p-8 flex flex-col overflow-hidden shadow-sm hover:shadow-md transition-shadow group min-h-[240px] sm:min-h-[280px]">
               <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-accent-subtle text-accent flex items-center justify-center mb-3 sm:mb-4 z-10">
                 <Zap className="h-4 w-4 sm:h-5 sm:w-5" />
               </div>
               <h3 className="text-lg sm:text-xl font-bold text-text-primary mb-1.5 sm:mb-2 z-10">Fast Photorealistic Generation</h3>
               <p className="text-text-secondary text-sm sm:text-[15px] leading-relaxed z-10">
                 Generate high-quality redesigns while preserving your room's structure and perspective.
               </p>
               <div className="mt-auto pt-4 sm:pt-6 z-10">
                  <div className="h-12 sm:h-14 w-full bg-surface-alt border border-border rounded-xl flex items-center px-4 sm:px-5 shadow-inner">
                    <div className="w-full h-2 sm:h-2.5 bg-border rounded-full overflow-hidden">
                       <div className="w-[85%] h-full bg-accent rounded-full relative overflow-hidden">
                          <div className="absolute inset-0 bg-white/20 w-1/2 animate-[skeleton-shimmer_1s_infinite]" />
                       </div>
                    </div>
                  </div>
               </div>
            </div>

            {/* 3. Iterative Refinement */}
            <div className="rounded-2xl sm:rounded-[24px] bg-surface border border-border p-6 sm:p-8 flex flex-col overflow-hidden shadow-sm hover:shadow-md transition-shadow group min-h-[240px] sm:min-h-[280px]">
               <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-accent-subtle text-accent flex items-center justify-center mb-3 sm:mb-4 z-10">
                 <Layers className="h-4 w-4 sm:h-5 sm:w-5" />
               </div>
               <h3 className="text-lg sm:text-xl font-bold text-text-primary mb-1.5 sm:mb-2 z-10">Refine with Natural Language</h3>
               <p className="text-text-secondary text-sm sm:text-[15px] leading-relaxed z-10">
                 Chat with the AI. Say "make it brighter" and keep the bones of the design.
               </p>
               <div className="mt-auto pt-4 sm:pt-6 flex justify-end z-10">
                  <div className="bg-accent text-white px-3 sm:px-4 py-2 sm:py-3 rounded-xl sm:rounded-2xl rounded-br-sm shadow-md text-xs sm:text-sm font-medium w-fit max-w-[90%] relative">
                     "Add a few indoor plants and make it feel warmer."
                  </div>
               </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── SOCIAL PROOF STRIP ─────────────────────────────────── */}
      <section className="py-8 sm:py-10 border-y border-border bg-surface-alt overflow-hidden">
         <div className="flex flex-col items-center justify-center gap-4 sm:gap-6 px-4 sm:px-6">
            <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-widest text-text-tertiary">Trusted by designers and homeowners</span>
            <div className="flex flex-col md:flex-row gap-4 sm:gap-6 w-full max-w-[1024px] overflow-x-auto pb-2 snap-x">
               {[
                 { name: "Beta Tester", role: "Interior Designer", quote: "RoomCanvas cuts my concept phase from days to literally minutes." },
                 { name: "Beta Tester", role: "Homeowner", quote: "Finally, I can actually see what my living room looks like before buying furniture." },
                 { name: "Beta Tester", role: "Architect", quote: "The structural awareness is incredible. It keeps the walls and windows where they belong." }
               ].map((t, i) => (
                 <div key={i} className="flex-1 min-w-[260px] sm:min-w-[280px] p-4 sm:p-5 bg-surface border border-border rounded-xl shadow-sm snap-center">
                    <p className="text-xs sm:text-sm text-text-secondary italic mb-3 sm:mb-4">"{t.quote}"</p>
                    <div className="flex items-center gap-2 sm:gap-3">
                       <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-accent-subtle text-accent flex items-center justify-center font-bold text-xs"><User className="h-3 w-3 sm:h-4 sm:w-4" /></div>
                       <div className="flex flex-col">
                         <span className="text-xs font-bold text-text-primary">{t.name}</span>
                         <span className="text-[10px] sm:text-[11px] text-text-tertiary">{t.role}</span>
                       </div>
                    </div>
                 </div>
               ))}
            </div>
         </div>
      </section>

      {/* ── STATS BAR ────────────────────────────────────────── */}
      <section className="py-12 sm:py-16 lg:py-20 border-b border-border">
         <div className="mx-auto max-w-[1024px] px-4 sm:px-6">
            <div className="grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-4 md:gap-8 text-center">
               {STATS.map(s => (
                 <div key={s.label} className="flex flex-col gap-1 sm:gap-1.5 items-center justify-center py-2 sm:py-3">
                    <span className="text-2xl sm:text-3xl lg:text-4xl font-bold text-text-primary tracking-tight">{s.value}</span>
                    <span className="text-[10px] sm:text-xs font-medium text-text-tertiary uppercase tracking-wider whitespace-nowrap">{s.label}</span>
                 </div>
               ))}
            </div>
         </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────── */}
      <section className="py-12 sm:py-16 lg:py-24" aria-labelledby="faq-heading">
        <div className="mx-auto max-w-[800px] px-4 sm:px-6">
          <div className="text-center mb-8 sm:mb-10 lg:mb-12">
            <h2 id="faq-heading" className="text-2xl sm:text-3xl font-bold tracking-tight text-text-primary">
              Frequently asked questions
            </h2>
          </div>

          <div className="divide-y divide-border border border-border bg-surface rounded-2xl sm:rounded-[24px] overflow-hidden shadow-sm">
            {FAQ.map((item, i) => (
              <div key={i}>
                <button
                  className="w-full flex items-center justify-between px-4 sm:px-6 py-4 sm:py-5 text-left hover:bg-surface-alt transition-colors duration-[180ms] focus-visible:outline-none focus-visible:bg-surface-alt cursor-pointer touch-manipulation active:scale-[0.99]"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  aria-expanded={openFaq === i}
                >
                  <span className="text-sm sm:text-[15px] font-medium text-text-primary pr-3 sm:pr-4">{item.q}</span>
                  {openFaq === i ? <ChevronUp className="h-4 w-4 text-text-tertiary shrink-0" /> : <ChevronDown className="h-4 w-4 text-text-tertiary shrink-0" />}
                </button>
                <AnimatePresence>
                  {openFaq === i && (
                    <motion.div
                      initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
                      transition={{ duration: 0.22, ease: [0, 0, 0.2, 1] }}
                      className="overflow-hidden"
                    >
                      <p className="px-4 sm:px-6 pb-4 sm:pb-5 text-sm sm:text-[15px] text-text-secondary leading-relaxed bg-surface">
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
      <section className="py-12 sm:py-16 lg:py-24 bg-gradient-to-b from-bg to-accent/5">
        <div className="mx-auto max-w-content px-4 sm:px-6 text-center flex flex-col items-center">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-text-primary mb-3 sm:mb-4">
            Transform your room with AI.
          </h2>
          <p className="text-text-secondary mb-6 sm:mb-8 text-sm sm:text-base lg:text-[17px] max-w-md mx-auto leading-relaxed">
            Upload a photo and redesign your room in minutes.
          </p>
          <Link to="/upload">
            <Button size="lg" className="h-11 sm:h-12 lg:h-14 px-6 sm:px-8 text-sm sm:text-base shadow-xl shadow-accent/20 touch-manipulation active:scale-95">
              Start designing — it's free
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
