import { LucideIcon } from "lucide-react";
import Link from "next/link";

interface FeatureCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  to: string;
  color: string;
}

export function FeatureCard({ title, description, icon: Icon, to, color }: FeatureCardProps) {
  return (
    <Link href={to} className="group glass-card p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
      <div className={`feature-icon ${color} mb-4`}>
        <Icon className="h-5 w-5 text-primary-foreground" />
      </div>
      <h3 className="font-display font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
        {title}
      </h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
    </Link>
  );
}
