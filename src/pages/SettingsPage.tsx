import { Settings } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function SettingsPage() {
  return (
    <div className="max-w-2xl mx-auto">
      <PageHeader icon={Settings} title="Settings" description="Customize your study experience" />

      <div className="space-y-4">
        <div className="glass-card p-5 flex items-center justify-between">
          <div>
            <h3 className="font-medium text-foreground">Default Language</h3>
            <p className="text-sm text-muted-foreground">Set your preferred explanation language</p>
          </div>
          <Select defaultValue="english">
            <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="english">English</SelectItem>
              <SelectItem value="urdu">اردو</SelectItem>
              <SelectItem value="roman-urdu">Roman Urdu</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="glass-card p-5 flex items-center justify-between">
          <div>
            <h3 className="font-medium text-foreground">Offline Mode</h3>
            <p className="text-sm text-muted-foreground">Save content for offline access automatically</p>
          </div>
          <Switch />
        </div>

        <div className="glass-card p-5 flex items-center justify-between">
          <div>
            <h3 className="font-medium text-foreground">Step-by-Step Mode</h3>
            <p className="text-sm text-muted-foreground">Always show explanations step by step</p>
          </div>
          <Switch />
        </div>

        <div className="glass-card p-5 flex items-center justify-between">
          <div>
            <h3 className="font-medium text-foreground">AI Response Detail</h3>
            <p className="text-sm text-muted-foreground">Control how detailed AI responses are</p>
          </div>
          <Select defaultValue="medium">
            <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="simple">Simple</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="detailed">Detailed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
