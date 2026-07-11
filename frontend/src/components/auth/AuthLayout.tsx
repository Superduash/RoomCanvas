import { Link } from 'react-router-dom';

const VALUE_PROPS = [
  { title: 'Grounded in your room', desc: 'Every recommendation comes from an AI analysis of your actual photo, not a generic template.' },
  { title: 'Structure stays put', desc: 'Walls, windows, and layout are preserved — only furniture, decor, and lighting change.' },
  { title: 'Real refinement', desc: 'Adjust any design in plain language, as many times as you want, without starting over.' },
  { title: 'Your designs, saved', desc: 'Every generation lives in your private history — searchable, downloadable, deletable, anytime.' },
];

export function AuthLayout({ children, panelTitle, panelSubtitle }: { children: React.ReactNode; panelTitle: string; panelSubtitle: string; }) {
  return (
    <div className="min-h-screen flex flex-col lg:grid lg:grid-cols-2 bg-bg">
      {/* Left Info Panel (Hidden on Mobile) */}
      <div className="hidden lg:flex flex-col justify-between p-6 xl:p-10 bg-surface-alt border-r border-border">
        {/* Brand */}
        <Link to="/" className="flex items-center gap-3 w-fit focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-lg">
          <div className="bg-surface p-1.5 rounded-lg shadow-sm border border-border">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-accent">
              <path d="M3 11.5 12 4l9 7.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M5.5 10v9a1 1 0 0 0 1 1H10v-5.5h4V20h3.5a1 1 0 0 0 1-1v-9" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
            </svg>
          </div>
          <span className="text-[18px] font-semibold tracking-tight text-text-primary">RoomCanvas</span>
        </Link>

        {/* Content */}
        <div className="flex flex-col gap-5 max-w-[480px]">
          <div className="flex flex-col gap-1.5">
            <h1 className="text-2xl xl:text-3xl font-semibold text-text-primary leading-[1.15] tracking-tight">{panelTitle}</h1>
            <p className="text-[15px] text-text-secondary leading-relaxed">{panelSubtitle}</p>
          </div>

          <ul className="flex flex-col gap-3.5">
            {VALUE_PROPS.map((p) => (
              <li key={p.title} className="flex items-start gap-3">
                <div className="shrink-0 w-7 h-7 rounded-full bg-accent/10 text-accent flex items-center justify-center mt-0.5">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M20 6 9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <div className="flex flex-col">
                  <p className="font-semibold text-text-primary text-[14px]">{p.title}</p>
                  <p className="text-[13px] text-text-secondary leading-snug">{p.desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Footer */}
        <p className="text-[12px] text-text-tertiary font-medium">Powered by Gemini analysis and Flux Kontext rendering.</p>
      </div>

      {/* Right Form Panel */}
      <div className="flex flex-1 items-center justify-center p-6 sm:p-8 lg:px-10 lg:py-2 xl:p-8">
        <div className="w-full max-w-[380px]">
          {children}
        </div>
      </div>
    </div>
  );
}
