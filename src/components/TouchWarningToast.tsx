import { Hand } from "lucide-react";

import { Toast } from "@/components/ui/toast";

interface TouchWarningToastProps {
  onDismiss: (dontShowAgain: boolean) => void;
}

export function TouchWarningToast({ onDismiss }: TouchWarningToastProps) {
  return (
    <Toast
      tone="default"
      icon={<Hand className="h-6 w-6" />}
      title="Use desktop for the full experience"
      description="Touch support is experimental."
      onClose={() => onDismiss(false)}
    >
      <button
        type="button"
        onClick={() => onDismiss(true)}
        className="self-start text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--color-foreground)] underline-offset-2 hover:underline active:translate-y-[1px] transition-transform"
      >
        Got it
      </button>
    </Toast>
  );
}
