"use client";

import { Settings } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/sonner";

export default function SettingsPage() {
  const notifySetting = (label: string) => {
    toast.success("Setting updated", {
      description: label,
    });
  };

  return (
    <div className="mx-auto w-full max-w-2xl">
      <PageHeader icon={Settings} title="Settings" description="Customize your study experience" />

      <div className="space-y-4">
        <div className="glass-card flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-medium text-foreground">Default Language</h3>
            <p className="text-sm text-muted-foreground">Set your preferred explanation language</p>
          </div>
          <Select defaultValue="english" onValueChange={(value) => notifySetting(`Default language: ${value}`)}>
            <SelectTrigger className="w-full sm:w-[150px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="english">English</SelectItem>
              <SelectItem value="urdu">اردو</SelectItem>
              <SelectItem value="roman-urdu">Roman Urdu</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="glass-card flex items-center justify-between gap-4 p-5">
          <div>
            <h3 className="font-medium text-foreground">Offline Mode</h3>
            <p className="text-sm text-muted-foreground">Save content for offline access automatically</p>
          </div>
          <Switch onCheckedChange={(checked) => notifySetting(`Offline mode ${checked ? "enabled" : "disabled"}`)} />
        </div>

        <div className="glass-card flex items-center justify-between gap-4 p-5">
          <div>
            <h3 className="font-medium text-foreground">Step-by-Step Mode</h3>
            <p className="text-sm text-muted-foreground">Always show explanations step by step</p>
          </div>
          <Switch onCheckedChange={(checked) => notifySetting(`Step-by-step mode ${checked ? "enabled" : "disabled"}`)} />
        </div>

        <div className="glass-card flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-medium text-foreground">AI Response Detail</h3>
            <p className="text-sm text-muted-foreground">Control how detailed AI responses are</p>
          </div>
          <Select defaultValue="medium" onValueChange={(value) => notifySetting(`AI detail: ${value}`)}>
            <SelectTrigger className="w-full sm:w-[150px]"><SelectValue /></SelectTrigger>
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
