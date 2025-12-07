import { Hand } from "lucide-react";

import { Toast } from "@/components/ui/toast";

interface TouchWarningToastProps {
  onDismiss: (dontShowAgain: boolean) => void;
}

export function TouchWarningToast({ onDismiss }: TouchWarningToastProps) {
  return (
    <Toast
      tone="warning"
      icon={<Hand className="h-6 w-6" />}
      title="Touch isn’t supported yet"
      description="Please use a mouse or trackpad"
      onClose={() => onDismiss(false)}
    >
      <button
        type="button"
        onClick={() => onDismiss(true)}
        className="self-start text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--color-foreground)] underline-offset-2 hover:underline active:translate-y-[1px] transition-transform"
      >
        Don’t show again
      </button>
    </Toast>
  );
}
