"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, CreditCard, Crown, Landmark, Loader2, ShieldCheck, Sparkles, WalletCards } from "lucide-react";
import { AuthGate } from "@/components/AuthGate";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/sonner";
import { useAuth } from "@/lib/auth-context";
import { defaultLocalPaymentMethods, localPaymentMethodOrder, type LocalPaymentMethod, type LocalPaymentMethodDetails } from "@/lib/payment-methods";
import { getSubscriptionProfile, subscriptionPlans, type SubscriptionPlan } from "@/lib/subscriptions";

type PaidPlan = "standard" | "advanced";
type LocalMethod = LocalPaymentMethod;
type CheckoutProvider = "stripe" | "lemon-squeezy";

const paidPlans: Array<{
  id: PaidPlan;
  icon: typeof Sparkles;
  features: string[];
  unavailable?: string[];
}> = [
  {
    id: "standard",
    icon: Sparkles,
    features: [
      "Increased AI request limits",
      "Standard priority AI processing",
      "Professional resume builder",
      "Premium study tools access",
    ],
    unavailable: ["ATS templates", "ATS score analysis"],
  },
  {
    id: "advanced",
    icon: Crown,
    features: [
      "High AI limits and priority processing",
      "ATS-friendly resume templates",
      "ATS score and optimization analysis",
      "Full premium tool access",
    ],
  },
];

function planAmount(plan: PaidPlan) {
  return plan === "advanced" ? "5" : "3";
}

export default function UpgradePage() {
  const { user, refreshSession } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState<PaidPlan>("standard");
  const [method, setMethod] = useState<LocalMethod>("easypaisa");
  const [amount, setAmount] = useState(planAmount("standard"));
  const [currency, setCurrency] = useState("PKR");
  const [transactionId, setTransactionId] = useState("");
  const [note, setNote] = useState("");
  const [checkoutProvider, setCheckoutProvider] = useState<CheckoutProvider | null>(null);
  const [isSubmittingLocal, setIsSubmittingLocal] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<Record<LocalMethod, LocalPaymentMethodDetails>>(defaultLocalPaymentMethods);

  const profile = useMemo(() => getSubscriptionProfile({
    role: user?.role || "user",
    subscriptionPlan: user?.subscriptionPlan,
    subscriptionStatus: user?.subscriptionStatus,
    subscriptionExpiresAt: user?.subscriptionExpiresAt,
  }), [user]);

  const handleSelectPlan = (plan: PaidPlan) => {
    setSelectedPlan(plan);
    setAmount(planAmount(plan));
  };

  useEffect(() => {
    let active = true;

    fetch("/api/payment-methods", { cache: "no-store" })
      .then((response) => response.json())
      .then((payload) => {
        if (active && payload?.methods) setPaymentMethods(payload.methods);
      })
      .catch(() => {
        if (active) setPaymentMethods(defaultLocalPaymentMethods);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (paymentMethods[method]?.enabled) return;

    const firstEnabled = localPaymentMethodOrder.find((item) => paymentMethods[item]?.enabled);
    if (firstEnabled) setMethod(firstEnabled);
  }, [method, paymentMethods]);

  const handleCheckout = async (provider: CheckoutProvider) => {
    setCheckoutProvider(provider);
    try {
      const response = await fetch("/api/subscriptions/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: selectedPlan, provider }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error?.message || "Checkout could not be started.");
      }

      if (!payload?.url) {
        throw new Error("Checkout URL was not returned.");
      }

      window.location.href = payload.url;
    } catch (error) {
      toast.error("Checkout unavailable", {
        description: error instanceof Error ? error.message : "Please try local payment or contact admin.",
      });
    } finally {
      setCheckoutProvider(null);
    }
  };

  const handleLocalPayment = async () => {
    if (!transactionId.trim()) {
      toast.error("Transaction ID is required.");
      return;
    }

    if (!paymentMethods[method]?.enabled) {
      toast.error("Selected payment method is currently unavailable.");
      return;
    }

    setIsSubmittingLocal(true);
    try {
      const response = await fetch("/api/subscriptions/local-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan: selectedPlan,
          method,
          amount: Number(amount),
          currency,
          transactionId,
          note,
        }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error?.message || "Payment proof could not be submitted.");
      }

      toast.success("Payment submitted", {
        description: "Admin will verify and activate your subscription.",
      });
      setTransactionId("");
      setNote("");
      await refreshSession();
    } catch (error) {
      toast.error("Payment submission failed", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setIsSubmittingLocal(false);
    }
  };

  const selectedPaymentMethod = paymentMethods[method];

  return (
    <AuthGate title="Login required for upgrade" description="Login to buy or manage your Study Buddy AI subscription.">
      <div className="mx-auto w-full max-w-6xl">
        <PageHeader icon={CreditCard} title="Upgrade Subscription" description="Choose Standard or Advanced to unlock higher AI limits and premium features" />

        {profile.isAdmin ? (
          <section className="glass-card mb-6 p-5">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-1 h-5 w-5 text-primary" />
              <div>
                <h2 className="font-display text-lg font-semibold text-foreground">Admin Unlimited Access</h2>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">Admin accounts already bypass all subscription limits and premium locks.</p>
              </div>
            </div>
          </section>
        ) : (
          <section className="glass-card mb-6 p-4 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-normal text-muted-foreground">Current plan</p>
                <h2 className="mt-1 font-display text-xl font-semibold text-foreground">{profile.label}</h2>
                <p className="mt-1 text-sm text-muted-foreground">Status: {profile.status}</p>
              </div>
              <Badge variant={profile.plan === "free" ? "secondary" : "default"}>{profile.price}</Badge>
            </div>
          </section>
        )}

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_420px]">
          <section className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {paidPlans.map((plan) => {
                const meta = subscriptionPlans[plan.id];
                const Icon = plan.icon;
                const active = selectedPlan === plan.id;

                return (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => handleSelectPlan(plan.id)}
                    className={`glass-card p-5 text-left transition-all hover:-translate-y-0.5 ${active ? "ring-2 ring-primary" : ""}`}
                  >
                    <div className="mb-4 flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="feature-icon gradient-primary">
                          <Icon className="h-5 w-5 text-primary-foreground" />
                        </div>
                        <div>
                          <h3 className="font-display text-lg font-semibold text-foreground">{meta.label}</h3>
                          <p className="text-sm text-muted-foreground">{meta.price}</p>
                        </div>
                      </div>
                      {active ? <CheckCircle2 className="h-5 w-5 text-primary" /> : null}
                    </div>
                    <p className="mb-4 text-sm leading-6 text-muted-foreground">{meta.description}</p>
                    <ul className="space-y-2 text-sm text-foreground">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex gap-2">
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                    {plan.unavailable ? (
                      <p className="mt-4 text-xs leading-5 text-muted-foreground">Not included: {plan.unavailable.join(", ")}</p>
                    ) : null}
                  </button>
                );
              })}
            </div>

            <section className="glass-card p-4 sm:p-5">
              <div className="mb-4 flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                <h2 className="font-display text-lg font-semibold text-foreground">International Payment</h2>
              </div>
              <p className="mb-4 text-sm leading-6 text-muted-foreground">
                Use Lemon Squeezy or Stripe for secure monthly subscription checkout. Lemon Squeezy is the recommended global provider for Pakistan-based setup.
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Button className="gradient-primary w-full border-0" onClick={() => handleCheckout("lemon-squeezy")} disabled={Boolean(checkoutProvider) || profile.isAdmin}>
                  {checkoutProvider === "lemon-squeezy" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <WalletCards className="mr-2 h-4 w-4" />}
                  Pay with Lemon Squeezy
                </Button>
                <Button className="w-full" variant="outline" onClick={() => handleCheckout("stripe")} disabled={Boolean(checkoutProvider) || profile.isAdmin}>
                  {checkoutProvider === "stripe" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CreditCard className="mr-2 h-4 w-4" />}
                  Pay with Stripe
                </Button>
              </div>
            </section>
          </section>

          <aside className="space-y-4">
            <section className="glass-card p-4 sm:p-5">
              <div className="mb-4 flex items-center gap-2">
                <WalletCards className="h-5 w-5 text-primary" />
                <h2 className="font-display text-lg font-semibold text-foreground">Pakistan Payment</h2>
              </div>
              <div className="space-y-3">
                <Select value={method} onValueChange={(value) => setMethod(value as LocalMethod)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {localPaymentMethodOrder.map((item) => (
                      <SelectItem key={item} value={item} disabled={!paymentMethods[item]?.enabled}>
                        {paymentMethods[item]?.label || defaultLocalPaymentMethods[item].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedPaymentMethod ? (
                  <div className="rounded-md border border-border bg-background p-4">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <h3 className="font-display font-semibold text-foreground">{selectedPaymentMethod.label}</h3>
                      <span className={`rounded px-2 py-1 text-xs font-medium ${selectedPaymentMethod.enabled ? "bg-secondary text-secondary-foreground" : "bg-muted text-muted-foreground"}`}>
                        {selectedPaymentMethod.enabled ? "Available" : "Unavailable"}
                      </span>
                    </div>
                    <dl className="space-y-2 text-sm">
                      <div className="flex flex-col gap-1 sm:flex-row sm:justify-between">
                        <dt className="text-muted-foreground">Account No.</dt>
                        <dd className="font-medium text-foreground">{selectedPaymentMethod.accountNumber}</dd>
                      </div>
                      <div className="flex flex-col gap-1 sm:flex-row sm:justify-between">
                        <dt className="text-muted-foreground">Account Title</dt>
                        <dd className="font-medium text-foreground">{selectedPaymentMethod.accountTitle}</dd>
                      </div>
                      {selectedPaymentMethod.iban ? (
                        <div className="flex flex-col gap-1 sm:flex-row sm:justify-between">
                          <dt className="text-muted-foreground">IBAN</dt>
                          <dd className="font-medium text-foreground">{selectedPaymentMethod.iban}</dd>
                        </div>
                      ) : null}
                    </dl>
                    {selectedPaymentMethod.instructions ? (
                      <p className="mt-3 text-sm leading-6 text-muted-foreground">{selectedPaymentMethod.instructions}</p>
                    ) : null}
                  </div>
                ) : null}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Input value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="Amount" type="number" min="0" />
                  <Input value={currency} onChange={(event) => setCurrency(event.target.value.toUpperCase())} placeholder="Currency" />
                </div>
                <Input value={transactionId} onChange={(event) => setTransactionId(event.target.value)} placeholder="Transaction ID / reference number" />
                <Textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Optional note: sender name, phone number, screenshot reference, bank details..." className="min-h-[110px]" />
                <Button className="w-full" variant="outline" onClick={handleLocalPayment} disabled={isSubmittingLocal || profile.isAdmin || !selectedPaymentMethod?.enabled}>
                  {isSubmittingLocal ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Landmark className="mr-2 h-4 w-4" />}
                  Submit for Admin Approval
                </Button>
              </div>
            </section>

            <section className="glass-card p-4 sm:p-5">
              <h2 className="mb-3 font-display text-lg font-semibold text-foreground">Payment Instructions</h2>
              <div className="space-y-3 text-sm leading-6 text-muted-foreground">
                <p>Select your plan, pay through Easypaisa, JazzCash, or bank transfer, then submit transaction ID here.</p>
                <p>Admin will verify the payment and activate your subscription for one month.</p>
                <p>For Lemon Squeezy or Stripe, checkout activates automatically once webhook keys are configured.</p>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </AuthGate>
  );
}
