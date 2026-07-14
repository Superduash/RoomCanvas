import { X } from 'lucide-react';
import * as RadixDialog from '@radix-ui/react-dialog';
import { cn } from '../../lib/utils';


interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
}

export function Dialog({ open, onClose, title, description, children, className }: DialogProps) {
  return (
    <RadixDialog.Root open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <div className="fixed inset-0 z-50 flex flex-col justify-end sm:items-center sm:justify-center p-0 sm:p-4">
          <RadixDialog.Content
            className={cn(
              'relative z-50 w-full sm:max-w-md bg-surface shadow-xl flex flex-col',
              'rounded-t-2xl sm:rounded-2xl border-t sm:border border-border p-5 sm:p-6',
              'max-h-[95vh] sm:max-h-[85vh]',
              'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
              'data-[state=closed]:slide-out-to-bottom-[100%] data-[state=open]:slide-in-from-bottom-[100%]',
              'sm:data-[state=closed]:zoom-out-95 sm:data-[state=open]:zoom-in-95 sm:data-[state=closed]:slide-out-to-bottom-0 sm:data-[state=open]:slide-in-from-bottom-0 sm:data-[state=closed]:slide-out-to-top-[10%] sm:data-[state=open]:slide-in-from-top-[10%]',
              className
            )}
          >
            <div className="flex items-start justify-between mb-5 shrink-0">
              <div>
                <RadixDialog.Title className="text-[17px] font-semibold tracking-tight text-text-primary">
                  {title}
                </RadixDialog.Title>
                {description && (
                  <RadixDialog.Description className="mt-1.5 text-[14px] text-text-secondary leading-relaxed">
                    {description}
                  </RadixDialog.Description>
                )}
              </div>
              <RadixDialog.Close asChild>
                <button
                  className="ml-2 flex-shrink-0 -mt-1 -mr-1 h-8 w-8 flex items-center justify-center rounded-lg text-text-tertiary hover:bg-surface-alt hover:text-text-primary transition-colors focus-visible:outline-none focus-visible:shadow-focus"
                  aria-label="Close dialog"
                >
                  <X className="h-[18px] w-[18px]" />
                </button>
              </RadixDialog.Close>
            </div>
            <div className="flex-1 overflow-y-auto -mx-5 px-5 sm:-mx-6 sm:px-6">
              {children}
            </div>
          </RadixDialog.Content>
        </div>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}
