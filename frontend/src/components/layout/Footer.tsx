import { Link } from 'react-router-dom';
import { Github, Linkedin, Twitter, Mail } from 'lucide-react';
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
                <Github size={18} />
              </a>
              <a
                href="https://www.linkedin.com/in/ashwin-a-943114320"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="LinkedIn Profile"
                className="p-2 rounded-lg text-text-tertiary hover:text-accent hover:-translate-y-0.5 transition-all duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <Linkedin size={18} />
              </a>
              <a
                href="https://x.com/superduash"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="X/Twitter Profile"
                className="p-2 rounded-lg text-text-tertiary hover:text-accent hover:-translate-y-0.5 transition-all duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <Twitter size={18} />
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
