import { Link } from 'react-router-dom';
import { RoomCanvasLogoMark } from './TopNav';

function FooterLink({ to, href, children }: { to?: string; href?: string; children: React.ReactNode }) {
  const className = "text-sm text-text-tertiary hover:text-text-primary transition-colors duration-fast w-fit focus-visible:outline-none focus-visible:underline decoration-accent";
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
      <div className="mx-auto max-w-content px-6 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
          {/* Brand column */}
          <div className="col-span-2 md:col-span-1">
            <Link to="/" className="flex items-center gap-2 mb-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-md w-fit">
              <RoomCanvasLogoMark size={24} />
              <span className="font-bold text-text-primary">RoomCanvas</span>
            </Link>
            <p className="text-sm text-text-tertiary leading-relaxed max-w-[200px]">
              AI-powered interior redesign for architects, designers, and homeowners.
            </p>
          </div>
          
          {/* Product column */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-text-tertiary mb-4 select-none">Product</h4>
            <nav className="flex flex-col gap-3">
              <FooterLink to="/upload">Design a Room</FooterLink>
              <FooterLink to="/history">My Designs</FooterLink>
              <FooterLink to="/profile">Profile</FooterLink>
              <FooterLink to="/settings">Settings</FooterLink>
            </nav>
          </div>
          
          {/* Styles column */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-text-tertiary mb-4 select-none">Styles</h4>
            <nav className="flex flex-col gap-3">
              {['Modern Minimalist', 'Scandinavian', 'Industrial', 'Bohemian', 'Japandi'].map(s => (
                <FooterLink key={s} to={`/upload?style=${s.toLowerCase().replace(' ','_')}`}>{s}</FooterLink>
              ))}
            </nav>
          </div>
          
          {/* Legal / About column */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-text-tertiary mb-4 select-none">More</h4>
            <nav className="flex flex-col gap-3">
              <FooterLink to="/about">About</FooterLink>
              <FooterLink href="mailto:support@roomcanvasai.com">Contact</FooterLink>
            </nav>
          </div>
        </div>
        
        {/* Bottom bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-border">
          <span className="text-sm text-text-tertiary">© {year} RoomCanvas. Built with Gemini + Flux.</span>
          <div className="flex items-center gap-1.5 text-sm text-text-tertiary">
            <span>Powered by</span>
            <span className="font-semibold text-text-secondary">Flux Kontext Pro</span>
            <span>·</span>
            <span className="font-semibold text-text-secondary">Gemini 2.5 Flash</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
