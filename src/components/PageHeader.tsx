import { LucideIcon } from "lucide-react";

interface PageHeaderProps {
  title: string;
  description: string;
  icon?: LucideIcon;
}

export function PageHeader({ title, description, icon: Icon }: PageHeaderProps) {
  return (
    <div className="mb-8">
      <div className="flex items-center gap-3 mb-2">
        {Icon && (
          <div className="feature-icon gradient-primary">
            <Icon className="h-5 w-5 text-primary-foreground" />
          </div>
        )}
        <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">{title}</h1>
      </div>
      <p className="text-muted-foreground ml-0 md:ml-[52px]">{description}</p>
    </div>
  );
}
