export type SubscriptionPlan = "free" | "standard" | "advanced";
export type SubscriptionStatus = "active" | "inactive" | "past_due" | "cancelled" | "pending";

export type AccessRole = "admin" | "user";

export type SubscriptionProfile = {
  role: AccessRole;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  label: string;
  price: string;
  isAdmin: boolean;
  isActive: boolean;
  ai: {
    hourlyLimit: number;
    dailyLimit: number;
    monthlyLimit: number;
    cooldownHours: number;
    priority: "normal" | "standard" | "high" | "unlimited";
  };
  resume: {
    canUseBasicBuilder: boolean;
    canUseProfessionalBuilder: boolean;
    canUseAtsTemplates: boolean;
    canUseAtsScore: boolean;
    canUseAiSuggestions: boolean;
  };
  features: {
    basicTools: boolean;
    premiumTools: boolean;
    advancedTools: boolean;
  };
};

export const subscriptionPlans = {
  free: {
    label: "Free",
    price: "$0",
    description: "Basic AI tools with hourly and daily limits.",
  },
  standard: {
    label: "Standard",
    price: "$3/month",
    description: "More AI usage, standard priority, and professional tools.",
  },
  advanced: {
    label: "Advanced",
    price: "$5/month",
    description: "High AI limits, priority processing, ATS resume tools, and full premium access.",
  },
} as const;

export function normalizeSubscriptionPlan(value?: string | null): SubscriptionPlan {
  if (value === "standard" || value === "student") return "standard";
  if (value === "advanced" || value === "premium") return "advanced";
  return "free";
}

export function normalizeSubscriptionStatus(value?: string | null): SubscriptionStatus {
  if (value === "active" || value === "past_due" || value === "cancelled" || value === "pending") return value;
  return "inactive";
}

export function isSubscriptionCurrentlyActive({
  role,
  status,
  expiresAt,
}: {
  role: AccessRole;
  status?: string | null;
  expiresAt?: string | Date | null;
}) {
  if (role === "admin") return true;
  if (status !== "active") return false;
  if (!expiresAt) return true;

  const expiry = expiresAt instanceof Date ? expiresAt : new Date(expiresAt);
  return Number.isFinite(expiry.getTime()) && expiry.getTime() > Date.now();
}

export function getSubscriptionProfile({
  role,
  subscriptionPlan,
  subscription,
  subscriptionStatus,
  subscriptionExpiresAt,
}: {
  role: AccessRole;
  subscriptionPlan?: string | null;
  subscription?: string | null;
  subscriptionStatus?: string | null;
  subscriptionExpiresAt?: string | Date | null;
}): SubscriptionProfile {
  const isAdmin = role === "admin";
  const rawPlan = normalizeSubscriptionPlan(subscriptionPlan || subscription);
  const status = normalizeSubscriptionStatus(subscriptionStatus);
  const isActive = isSubscriptionCurrentlyActive({
    role,
    status,
    expiresAt: subscriptionExpiresAt,
  });
  const plan = isAdmin ? "advanced" : isActive ? rawPlan : "free";

  if (isAdmin) {
    return {
      role,
      plan,
      status: "active",
      label: "Admin Unlimited",
      price: "Unlimited",
      isAdmin: true,
      isActive: true,
      ai: {
        hourlyLimit: Number.POSITIVE_INFINITY,
        dailyLimit: Number.POSITIVE_INFINITY,
        monthlyLimit: Number.POSITIVE_INFINITY,
        cooldownHours: 0,
        priority: "unlimited",
      },
      resume: {
        canUseBasicBuilder: true,
        canUseProfessionalBuilder: true,
        canUseAtsTemplates: true,
        canUseAtsScore: true,
        canUseAiSuggestions: true,
      },
      features: {
        basicTools: true,
        premiumTools: true,
        advancedTools: true,
      },
    };
  }

  if (plan === "advanced") {
    return {
      role,
      plan,
      status,
      label: subscriptionPlans.advanced.label,
      price: subscriptionPlans.advanced.price,
      isAdmin: false,
      isActive,
      ai: {
        hourlyLimit: 120,
        dailyLimit: 1000,
        monthlyLimit: 20000,
        cooldownHours: 0,
        priority: "high",
      },
      resume: {
        canUseBasicBuilder: true,
        canUseProfessionalBuilder: true,
        canUseAtsTemplates: true,
        canUseAtsScore: true,
        canUseAiSuggestions: true,
      },
      features: {
        basicTools: true,
        premiumTools: true,
        advancedTools: true,
      },
    };
  }

  if (plan === "standard") {
    return {
      role,
      plan,
      status,
      label: subscriptionPlans.standard.label,
      price: subscriptionPlans.standard.price,
      isAdmin: false,
      isActive,
      ai: {
        hourlyLimit: 25,
        dailyLimit: 160,
        monthlyLimit: 3000,
        cooldownHours: 0,
        priority: "standard",
      },
      resume: {
        canUseBasicBuilder: true,
        canUseProfessionalBuilder: true,
        canUseAtsTemplates: false,
        canUseAtsScore: false,
        canUseAiSuggestions: true,
      },
      features: {
        basicTools: true,
        premiumTools: true,
        advancedTools: false,
      },
    };
  }

  return {
    role,
    plan: "free",
    status,
    label: subscriptionPlans.free.label,
    price: subscriptionPlans.free.price,
    isAdmin: false,
    isActive: true,
    ai: {
      hourlyLimit: 5,
      dailyLimit: 20,
      monthlyLimit: 300,
      cooldownHours: 5,
      priority: "normal",
    },
    resume: {
      canUseBasicBuilder: true,
      canUseProfessionalBuilder: false,
      canUseAtsTemplates: false,
      canUseAtsScore: false,
      canUseAiSuggestions: false,
    },
    features: {
      basicTools: true,
      premiumTools: false,
      advancedTools: false,
    },
  };
}

export function formatCooldownUntil(value?: string | Date | null) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  return date.toLocaleString();
}
