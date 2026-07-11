import { Link } from 'react-router-dom';
import styles from './AuthLayout.module.css';

const VALUE_PROPS = [
  { title: 'Grounded in your room', desc: 'Every recommendation comes from an AI analysis of your actual photo, not a generic template.' },
  { title: 'Structure stays put', desc: 'Walls, windows, and layout are preserved — only furniture, decor, and lighting change.' },
  { title: 'Real refinement', desc: 'Adjust any design in plain language, as many times as you want, without starting over.' },
  { title: 'Your designs, saved', desc: 'Every generation lives in your private history — searchable, downloadable, deletable, anytime.' },
];

export function AuthLayout({ children, panelTitle, panelSubtitle }: { children: React.ReactNode; panelTitle: string; panelSubtitle: string; }) {
  return (
    <div className={styles.wrap}>
      <div className={styles.panel}>
        <Link to="/" className={styles.brand}>
          <span className={styles.mark} aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M3 11.5 12 4l9 7.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M5.5 10v9a1 1 0 0 0 1 1H10v-5.5h4V20h3.5a1 1 0 0 0 1-1v-9" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
            </svg>
          </span>
          RoomCanvas
        </Link>

        <div className={styles.panelBody}>
          <h1 className={styles.panelTitle}>{panelTitle}</h1>
          <p className={styles.panelSubtitle}>{panelSubtitle}</p>

          <ul className={styles.propsList}>
            {VALUE_PROPS.map((p) => (
              <li key={p.title} className={styles.propItem}>
                <span className={styles.propIcon} aria-hidden="true">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M20 6 9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <div>
                  <p className={styles.propTitle}>{p.title}</p>
                  <p className={styles.propDesc}>{p.desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className={styles.panelFooter}>Powered by Gemini analysis and Flux Kontext rendering.</p>
      </div>

      <div className={styles.formSide}>
        <div className={styles.formCard}>{children}</div>
      </div>
    </div>
  );
}
