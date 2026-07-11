type LogLevel = 'Silent' | 'Error' | 'Warn' | 'Info' | 'Debug' | 'Trace';

const LEVEL_MAP: Record<LogLevel, number> = {
  Silent: 0,
  Error: 1,
  Warn: 2,
  Info: 3,
  Debug: 4,
  Trace: 5,
};

const COLORS = {
  Reset: '\x1b[0m',
  FgRed: '\x1b[31m',
  FgYellow: '\x1b[33m',
  FgBlue: '\x1b[34m',
  FgCyan: '\x1b[36m',
  FgGreen: '\x1b[32m',
  Dim: '\x1b[2m',
};

class Logger {
  private level: LogLevel = 'Info';

  setLevel(level: LogLevel) {
    this.level = level;
  }

  private shouldLog(level: LogLevel): boolean {
    return LEVEL_MAP[level] <= LEVEL_MAP[this.level];
  }

  private formatTime(): string {
    const d = new Date();
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;
  }

  // Used for standard formatted API calls: GET    /api/history      200   18ms
  api(method: string, path: string, status: number, ms: number) {
    if (!this.shouldLog('Info')) return;
    const time = `[${this.formatTime()}]`;
    const m = method.padEnd(6, ' ');
    const p = path.padEnd(20, ' ');
    // Use green for 200s, yellow for 400s, red for 500s
    let statusColor = COLORS.FgGreen;
    if (status >= 400 && status < 500) statusColor = COLORS.FgYellow;
    if (status >= 500) statusColor = COLORS.FgRed;
    
    // Modern browser console supports CSS instead of ANSI in the browser, but if running in node/SSR it supports ANSI.
    // For browser:
    const isBrowser = typeof window !== 'undefined';
    if (isBrowser) {
      let color = 'color: #10b981'; // green
      if (status >= 400) color = 'color: #f59e0b'; // yellow
      if (status >= 500) color = 'color: #ef4444'; // red
      
      console.log(
        `%c${time} %c${m} %c${p} %c${status} %c${Math.round(ms)}ms`,
        'color: gray',
        'font-weight: bold',
        'color: inherit',
        `font-weight: bold; ${color}`,
        'color: gray'
      );
    } else {
      console.log(`${COLORS.Dim}${time}${COLORS.Reset} ${m} ${p} ${statusColor}${status}${COLORS.Reset}   ${COLORS.Dim}${Math.round(ms)}ms${COLORS.Reset}`);
    }
  }

  info(...args: any[]) {
    if (this.shouldLog('Info')) console.info(...args);
  }

  warn(...args: any[]) {
    if (this.shouldLog('Warn')) console.warn(...args);
  }

  error(...args: any[]) {
    if (this.shouldLog('Error')) console.error(...args);
  }

  debug(...args: any[]) {
    if (this.shouldLog('Debug')) console.debug(...args);
  }

  trace(...args: any[]) {
    if (this.shouldLog('Trace')) console.trace(...args);
  }
}

export const logger = new Logger();

// Optionally set based on environment
if (import.meta.env?.PROD) {
  logger.setLevel('Warn');
} else {
  logger.setLevel('Info');
}
