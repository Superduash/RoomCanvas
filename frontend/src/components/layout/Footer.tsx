import { Link } from 'react-router-dom';
import { Mail } from 'lucide-react';
import { RoomCanvasLogoMark } from './TopNav';

function FooterLink({ to, href, children }: { to?: string; href?: string; children: React.ReactNode }) {
  const className = "text-xs sm:text-sm text-text-tertiary hover:text-text-primary transition-colors duration-fast w-fit focus-visible:outline-none focus-visible:underline decoration-accent touch-manipulation";
  if (href) {
    return (
      <a href={href} className={className}>
        {children}
      </a>
    );
  }
  return (
    <Link to={to || '#'} className={className}>
      {children}
    </Link>
  );
}

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-border bg-surface mt-auto">
      <div className="mx-auto max-w-content px-4 sm:px-6 py-8 sm:py-10 lg:py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 mb-6 sm:mb-8 lg:mb-10">
          {/* Brand column */}
          <div className="col-span-2 md:col-span-1">
            <Link to="/" className="flex items-center gap-2 mb-2 sm:mb-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-md w-fit">
              <RoomCanvasLogoMark size={22} />
              <span className="font-bold text-sm sm:text-base text-text-primary">RoomCanvas</span>
            </Link>
            <p className="text-xs sm:text-sm text-text-tertiary leading-relaxed max-w-[200px]">
              AI-powered interior redesign for architects, designers, and homeowners.
            </p>
          </div>
          
          {/* Product column */}
          <div>
            <h4 className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-text-tertiary mb-2.5 sm:mb-4 select-none">Product</h4>
            <nav className="flex flex-col gap-2 sm:gap-3">
              <FooterLink to="/upload">Design a Room</FooterLink>
              <FooterLink to="/history">My Designs</FooterLink>
              <FooterLink to="/profile">Profile</FooterLink>
              <FooterLink to="/settings">Settings</FooterLink>
            </nav>
          </div>
          
          {/* Styles column */}
          <div>
            <h4 className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-text-tertiary mb-2.5 sm:mb-4 select-none">Styles</h4>
            <nav className="flex flex-col gap-2 sm:gap-3">
              {['Modern', 'Minimalist', 'Scandinavian', 'Japandi', 'Industrial', 'Contemporary'].map(s => (
                <FooterLink key={s} to={`/upload?style=${s.toLowerCase().replace(' ','_')}`}>{s}</FooterLink>
              ))}
            </nav>
          </div>
          
          {/* Legal / About column */}
          <div>
            <h4 className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-text-tertiary mb-2.5 sm:mb-4 select-none">More</h4>
            <nav className="flex flex-col gap-2 sm:gap-3">
              <FooterLink to="/about">About</FooterLink>
              <FooterLink href="mailto:helloitsashwin@gmail.com">Contact</FooterLink>
            </nav>
          </div>
        </div>
        
        {/* Bottom bar */}
        <div className="flex flex-col items-center gap-4 pt-4 sm:pt-6 border-t border-border">
          {/* Social Links */}
          <div className="flex flex-col items-center gap-2">
            <span className="text-2xs text-text-tertiary">v1.0.0</span>
            <div className="flex items-center gap-3">
              <a
                href="https://github.com/Superduash"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="GitHub Profile"
                className="p-2 rounded-lg text-text-tertiary hover:text-accent hover:-translate-y-0.5 transition-all duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
              </a>
              <a
                href="https://www.linkedin.com/in/ashwin-a-943114320"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="LinkedIn Profile"
                className="p-2 rounded-lg text-text-tertiary hover:text-accent hover:-translate-y-0.5 transition-all duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
              </a>
              <a
                href="https://x.com/superduash"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="X/Twitter Profile"
                className="p-2 rounded-lg text-text-tertiary hover:text-accent hover:-translate-y-0.5 transition-all duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
              </a>
              <a
                href="mailto:helloitsashwin@gmail.com"
                aria-label="Email Contact"
                className="p-2 rounded-lg text-text-tertiary hover:text-accent hover:-translate-y-0.5 transition-all duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <Mail size={18} />
              </a>
            </div>
          </div>
          
          <span className="text-xs sm:text-sm text-text-tertiary text-center">© {year} RoomCanvas. AI-powered interior redesign.</span>
        </div>
      </div>
    </footer>
  );
}
