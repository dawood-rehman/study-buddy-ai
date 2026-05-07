"use client";

import { useEffect, useState } from "react";
import { CreditCard, Landmark, Sparkles, WalletCards } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { subscriptionPlans } from "@/lib/subscriptions";

type UpgradeEventDetail = {
  code?: string;
  message?: string;
  detail?: string;
  upgrade?: {
    reason?: string;
    cooldownUntil?: string;
    plan?: string;
  };
};

function formatCooldown(cooldownUntil?: string) {
  if (!cooldownUntil) return null;
  const date = new Date(cooldownUntil);
  if (!Number.isFinite(date.getTime())) return null;
  return date.toLocaleString();
}

export function SubscriptionUpgradeDialog() {
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<UpgradeEventDetail | null>(null);

  useEffect(() => {
    const handler = (event: Event) => {
      const customEvent = event as CustomEvent<UpgradeEventDetail>;
      setDetail(customEvent.detail || null);
      setOpen(true);
    };

    window.addEventListener("study-buddy-upgrade", handler);
    return () => window.removeEventListener("study-buddy-upgrade", handler);
  }, []);

  const cooldown = formatCooldown(detail?.upgrade?.cooldownUntil);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Upgrade Study Buddy AI
          </DialogTitle>
          <DialogDescription>
            {detail?.message || "Choose a plan to unlock higher AI limits and premium tools."}
          </DialogDescription>
        </DialogHeader>

        {cooldown ? (
          <div className="rounded-md border border-border bg-muted p-3 text-sm text-muted-foreground">
            Free AI cooldown ends at <span className="font-medium text-foreground">{cooldown}</span>.
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {Object.entries(subscriptionPlans).map(([id, plan]) => (
            <article key={id} className="rounded-md border border-border bg-background p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="font-display text-lg font-semibold text-foreground">{plan.label}</h3>
                <span className="rounded bg-secondary px-2 py-1 text-xs font-medium text-secondary-foreground">{plan.price}</span>
              </div>
              <p className="min-h-[48px] text-sm leading-6 text-muted-foreground">{plan.description}</p>
              <ul className="mt-3 space-y-2 text-sm text-foreground">
                {id === "free" ? (
                  <>
                    <li>Basic AI quota</li>
                    <li>Simple resume builder</li>
                    <li>5-hour cooldown after limit</li>
                  </>
                ) : id === "standard" ? (
                  <>
                    <li>Higher AI limits</li>
                    <li>Standard priority</li>
                    <li>Professional resume builder</li>
                  </>
                ) : (
                  <>
                    <li>Priority AI processing</li>
                    <li>ATS templates and scoring</li>
                    <li>Full premium access</li>
                  </>
                )}
              </ul>
            </article>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <section className="rounded-md border border-border bg-background p-4">
            <div className="mb-3 flex items-center gap-2">
              <WalletCards className="h-5 w-5 text-primary" />
              <h3 className="font-display font-semibold text-foreground">Pakistan Payments</h3>
            </div>
            <div className="space-y-2 text-sm leading-6 text-muted-foreground">
              <p>Easypaisa, JazzCash, and direct bank transfer are supported through manual verification.</p>
              <p>After payment, send screenshot/transaction ID to admin for approval.</p>
            </div>
          </section>

          <section className="rounded-md border border-border bg-background p-4">
            <div className="mb-3 flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              <h3 className="font-display font-semibold text-foreground">International Payments</h3>
            </div>
            <div className="space-y-2 text-sm leading-6 text-muted-foreground">
              <p>Stripe, PayPal, Paddle, or Lemon Squeezy can be connected for recurring subscriptions.</p>
              <p>Admins can also activate plans manually from the dashboard.</p>
            </div>
          </section>
        </div>

        <div className="rounded-md border border-border bg-muted p-4">
          <div className="mb-2 flex items-center gap-2">
            <Landmark className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">Admin verification flow</span>
          </div>
          <p className="text-sm leading-6 text-muted-foreground">
            The dashboard now supports plan changes and payment verification status, so local payments can be approved manually while global payment gateway keys are added later.
          </p>
        </div>

        <div className="flex justify-end">
          <Button className="gradient-primary border-0" onClick={() => setOpen(false)}>
            Got it
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
