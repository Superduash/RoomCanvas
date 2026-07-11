import hotToast from 'react-hot-toast';
import { logger } from './logger';

interface ToastOptions {
  id?: string;
  duration?: number;
}

// Throttle identical error messages to prevent spam during polling/retries
const errorThrottle = new Map<string, number>();
const THROTTLE_MS = 5000;

export const toast = {
  success: (message: string, options?: ToastOptions) => {
    return hotToast.success(message, {
      id: options?.id,
      duration: options?.duration ?? 4000,
    });
  },

  error: (message: string, options?: ToastOptions) => {
    logger.warn(`UI Error Toast: ${message}`);
    
    // Throttle identical errors to prevent spam
    const now = Date.now();
    const lastSeen = errorThrottle.get(message);
    if (lastSeen && now - lastSeen < THROTTLE_MS) {
      return ''; // Throttled
    }
    errorThrottle.set(message, now);

    return hotToast.error(message, {
      id: options?.id,
      // Critical errors persist until explicitly dismissed by the user navigating or retrying (Infinity),
      // but standard errors auto-dismiss after 6 seconds.
      duration: options?.duration ?? 6000,
    });
  },

  warn: (message: string, options?: ToastOptions) => {
    return hotToast(message, {
      id: options?.id,
      icon: '⚠️',
      duration: options?.duration ?? 5000,
    });
  },

  info: (message: string, options?: ToastOptions) => {
    return hotToast(message, {
      id: options?.id,
      duration: options?.duration ?? 4000,
    });
  },

  dismiss: (id?: string) => {
    hotToast.dismiss(id);
  },
};
