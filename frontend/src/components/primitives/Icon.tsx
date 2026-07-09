import { type LucideIcon } from 'lucide-react';
import { cn } from '../../lib/utils';

interface IconProps {
  icon: LucideIcon;
  size?: 14 | 16 | 18 | 20 | 24 | 32 | 48;
  className?: string;
  'aria-hidden'?: boolean;
  'aria-label'?: string;
}

export function Icon({ icon: LucideIconComp, size = 18, className, ...rest }: IconProps) {
  return (
    <LucideIconComp
      size={size}
      strokeWidth={1.75}
      className={cn('text-current', className)}
      {...rest}
    />
  );
}
