"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type PlatformStatus = {
  payments?: {
    stripeConfigured?: boolean;
    lemonSqueezyConfigured?: boolean;
    automatedPaymentsConfigured?: boolean;
    fullyConfigured?: boolean;
  };
  underConstructionNotice?: boolean;
};

function StatusPill({ ready, label }: { ready: boolean; label: string }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium ${ready ? "bg-primary/10 text-primary" : "bg-amber-500/12 text-amber-700 dark:text-amber-300"}`}>
      {ready ? <CheckCircle2 className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
      {label}: {ready ? "Ready" : "Setup pending"}
    </span>
  );
}

export function PlatformNotice() {
  const [status, setStatus] = useState<PlatformStatus | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let active = true;

    fetch("/api/platform/status", { cache: "no-store" })
      .then((response) => response.json())
      .then((payload) => {
        if (active) setStatus(payload);
      })
      .catch(() => {
        if (active) setStatus(null);
      });

    return () => {
      active = false;
    };
  }, []);

  if (!status?.underConstructionNotice || dismissed) return null;

  const stripeReady = Boolean(status.payments?.stripeConfigured);
  const lemonReady = Boolean(status.payments?.lemonSqueezyConfigured);

  return (
    <section className="border-b border-amber-500/30 bg-amber-50/95 px-3 py-3 text-amber-950 shadow-sm backdrop-blur-sm dark:bg-amber-950/35 dark:text-amber-100 sm:px-4">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-300" />
          <div className="min-w-0">
            <h2 className="font-display text-sm font-semibold">Website under construction</h2>
            <p className="mt-1 text-sm leading-6 text-amber-900/85 dark:text-amber-100/85">
              Online subscription payments are being configured. Some upgrade checkout features may not work yet. Sorry for the disturbance.
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <StatusPill ready={stripeReady} label="Stripe" />
              <StatusPill ready={lemonReady} label="Lemon Squeezy" />
            </div>
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="self-end text-amber-900 hover:bg-amber-200/60 hover:text-amber-950 dark:text-amber-100 dark:hover:bg-amber-900/70 sm:self-center"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss construction notice"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </section>
  );
}
