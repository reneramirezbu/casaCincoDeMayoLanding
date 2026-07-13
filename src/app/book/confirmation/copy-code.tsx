"use client";

import * as React from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Confirmation code with a one-tap copy button. The copied state reverts
 * after a moment; feedback is an icon swap (no motion required).
 */
export function CopyCode({ code }: { code: string }) {
  const [copied, setCopied] = React.useState(false);
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable (permissions/insecure context) — the code is
      // selectable text, so the guest can still copy manually.
    }
  }

  return (
    <div className="inline-flex items-center gap-2 rounded-field border border-edge-strong bg-surface-raised py-2 pl-4 pr-2 shadow-card">
      <span className="select-all font-mono text-lg font-medium tracking-[0.08em] text-ink">
        {code}
      </span>
      <Button
        variant="ghost"
        size="icon"
        onClick={copy}
        aria-label={copied ? "Copied" : "Copy confirmation code"}
      >
        {copied ? (
          <Check aria-hidden className="text-success" />
        ) : (
          <Copy aria-hidden />
        )}
      </Button>
      <span aria-live="polite" className="sr-only">
        {copied ? "Confirmation code copied" : ""}
      </span>
    </div>
  );
}
