import { LucideIcon } from "lucide-react";

interface PageHeaderProps {
  title: string;
  description: string;
  icon?: LucideIcon;
}

export function PageHeader({ title, description, icon: Icon }: PageHeaderProps) {
  return (
    <div className="mb-6 min-w-0 sm:mb-8">
      <div className="mb-2 flex min-w-0 items-start gap-3">
        {Icon && (
          <div className="feature-icon gradient-primary mt-0.5">
            <Icon className="h-5 w-5 text-primary-foreground" />
          </div>
        )}
        <h1 className="min-w-0 text-balance font-display text-2xl font-bold leading-tight text-foreground md:text-3xl">{title}</h1>
      </div>
      <p className="ml-0 max-w-4xl text-sm leading-6 text-muted-foreground sm:text-base md:ml-[52px]">{description}</p>
    </div>
  );
}
