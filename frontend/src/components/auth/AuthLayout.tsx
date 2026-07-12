import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const VALUE_PROPS = [
  { title: 'Grounded in your room', desc: 'Every recommendation comes from an AI analysis of your actual photo, not a generic template.' },
  { title: 'Structure stays put', desc: 'Walls, windows, and layout are preserved — only furniture, decor, and lighting change.' },
  { title: 'Real refinement', desc: 'Adjust any design in plain language, as many times as you want, without starting over.' },
  { title: 'Your designs, saved', desc: 'Every generation lives in your private history — searchable, downloadable, deletable, anytime.' },
];

function BackButton() {
  const navigate = useNavigate();
  const canGoBack = window.history.length > 1 && document.referrer.includes(window.location.host);
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => (canGoBack ? navigate(-1) : navigate('/'))}
        aria-label="Go back"
        className="flex items-center gap-2 w-fit bg-surface p-1.5 rounded-lg shadow-sm border border-border hover:bg-surface-alt transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <ArrowLeft size={20} className="text-text-primary" />
      </button>
      <span className="text-[18px] font-semibold tracking-tight text-text-primary mt-[1px]">RoomCanvas</span>
    </div>
  );
}

export function AuthLayout({ children, panelTitle, panelSubtitle }: { children: React.ReactNode; panelTitle: string; panelSubtitle: string; }) {
  return (
    <div className="min-h-screen flex flex-col md:grid md:grid-cols-[40%_60%] lg:grid-cols-[50%_50%] xl:grid-cols-[55%_45%] bg-bg">
      {/* Left Info Panel (Hidden on Mobile) */}
      <div className="relative hidden md:flex flex-col justify-between p-8 lg:p-12 xl:p-16 bg-surface-alt border-r border-border overflow-hidden">
        {/* Premium Background Effects */}
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_100%_100%_at_0%_0%,rgba(183,110,77,0.06)_0%,transparent_80%)]" aria-hidden="true" />
        <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_100px_rgba(0,0,0,0.02)] dark:shadow-[inset_0_0_100px_rgba(0,0,0,0.2)]" aria-hidden="true" />
        
        {/* Brand */}
        <div className="relative z-10">
          <BackButton />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col gap-8 max-w-[500px]">
          <div className="flex flex-col gap-3">
            <h1 className="text-3xl xl:text-4xl font-semibold text-text-primary leading-[1.15] tracking-tight text-balance">{panelTitle}</h1>
            <p className="text-[16px] text-text-secondary leading-relaxed text-pretty">{panelSubtitle}</p>
          </div>

          <ul className="flex flex-col gap-5">
            {VALUE_PROPS.map((p) => (
              <li key={p.title} className="flex items-start gap-4">
                <div className="shrink-0 w-8 h-8 rounded-full bg-surface shadow-xs border border-border text-accent flex items-center justify-center mt-0.5">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M20 6 9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <div className="flex flex-col pt-1">
                  <p className="font-semibold text-text-primary text-[15px] leading-tight mb-1">{p.title}</p>
                  <p className="text-[14px] text-text-secondary leading-relaxed">{p.desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Footer */}
        <div className="relative z-10">
          <p className="text-[13px] text-text-tertiary font-medium">Powered by Gemini analysis and Flux Kontext rendering.</p>
        </div>
      </div>

      {/* Right Form Panel - Mobile Optimized */}
      <div className="flex flex-1 items-start md:items-center justify-center p-4 sm:p-6 md:p-10 lg:p-12 xl:p-16 pt-6 sm:pt-8 md:pt-10">
        <div className="w-full max-w-[460px]">
          {/* Mobile Back Button */}
          <div className="md:hidden mb-6">
            <BackButton />
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
