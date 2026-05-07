"use client";

import { useEffect, useState } from "react";
import { Save, Settings } from "lucide-react";
import { AuthForm } from "@/components/AuthForm";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/sonner";
import { useAuth } from "@/lib/auth-context";

type AppSettings = {
  defaultLanguage: "english" | "urdu" | "roman-urdu";
  offlineMode: boolean;
  stepByStep: boolean;
  detail: "simple" | "medium" | "detailed";
};

const defaultSettings: AppSettings = {
  defaultLanguage: "english",
  offlineMode: false,
  stepByStep: true,
  detail: "medium",
};

async function settingsRequest(nextSettings?: AppSettings) {
  const response = await fetch("/api/settings", {
    method: nextSettings ? "PATCH" : "GET",
    headers: {
      "Content-Type": "application/json",
    },
    body: nextSettings ? JSON.stringify(nextSettings) : undefined,
  });
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const message = payload?.error?.message || response.statusText || "Settings request failed.";
    throw new Error(message);
  }

  return payload.settings as AppSettings;
}

export default function SettingsPage() {
  const { user, updateProfile, changePassword } = useAuth();
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [profile, setProfile] = useState({ name: "", email: "" });
  const [passwords, setPasswords] = useState({ currentPassword: "", newPassword: "" });

  useEffect(() => {
    if (user) setProfile({ name: user.name, email: user.email });
  }, [user]);

  useEffect(() => {
    if (!user) {
      setSettings(defaultSettings);
      return;
    }

    settingsRequest()
      .then((savedSettings) => setSettings({ ...defaultSettings, ...savedSettings }))
      .catch((error) => {
        toast.error("Settings load failed", {
          description: error instanceof Error ? error.message : "Could not load settings.",
        });
      });
  }, [user]);

  const saveSettings = async (nextSettings: AppSettings) => {
    const previousSettings = settings;
    setSettings(nextSettings);

    try {
      const savedSettings = await settingsRequest(nextSettings);
      setSettings({ ...defaultSettings, ...savedSettings });
      toast.success("Settings saved");
    } catch (error) {
      setSettings(previousSettings);
      toast.error("Settings save failed", {
        description: error instanceof Error ? error.message : "Could not save settings.",
      });
    }
  };

  const handleProfileSave = async () => {
    try {
      await updateProfile(profile);
      toast.success("Profile updated");
    } catch (error) {
      toast.error("Profile update failed", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    }
  };

  const handlePasswordSave = async () => {
    try {
      await changePassword(passwords);
      setPasswords({ currentPassword: "", newPassword: "" });
      toast.success("Password updated");
    } catch (error) {
      toast.error("Password update failed", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    }
  };

  return (
    <div className="mx-auto w-full max-w-3xl">
      <PageHeader icon={Settings} title="Settings" description="Persist preferences and manage your account" />

      <div className="space-y-4">
        <div className="glass-card flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-medium text-foreground">Default Language</h3>
            <p className="text-sm text-muted-foreground">Applies to new AI workflows where supported</p>
          </div>
          <Select value={settings.defaultLanguage} onValueChange={(value) => void saveSettings({ ...settings, defaultLanguage: value as AppSettings["defaultLanguage"] })}>
            <SelectTrigger className="w-full sm:w-[170px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="english">English</SelectItem>
              <SelectItem value="urdu">Urdu</SelectItem>
              <SelectItem value="roman-urdu">Roman Urdu</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="glass-card flex items-center justify-between gap-4 p-5">
          <div>
            <h3 className="font-medium text-foreground">Offline Mode</h3>
            <p className="text-sm text-muted-foreground">Prefer saving generated content for later access</p>
          </div>
          <Switch checked={settings.offlineMode} onCheckedChange={(checked) => void saveSettings({ ...settings, offlineMode: checked })} />
        </div>

        <div className="glass-card flex items-center justify-between gap-4 p-5">
          <div>
            <h3 className="font-medium text-foreground">Step-by-Step Mode</h3>
            <p className="text-sm text-muted-foreground">Ask AI tools to favor structured explanations</p>
          </div>
          <Switch checked={settings.stepByStep} onCheckedChange={(checked) => void saveSettings({ ...settings, stepByStep: checked })} />
        </div>

        <div className="glass-card flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-medium text-foreground">AI Response Detail</h3>
            <p className="text-sm text-muted-foreground">Control response depth for future prompts</p>
          </div>
          <Select value={settings.detail} onValueChange={(value) => void saveSettings({ ...settings, detail: value as AppSettings["detail"] })}>
            <SelectTrigger className="w-full sm:w-[170px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="simple">Simple</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="detailed">Detailed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {user ? (
          <>
            <div className="glass-card p-5">
              <h3 className="mb-4 font-display font-semibold text-foreground">Profile</h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Input value={profile.name} onChange={(event) => setProfile({ ...profile, name: event.target.value })} placeholder="Name" />
                <Input value={profile.email} onChange={(event) => setProfile({ ...profile, email: event.target.value })} placeholder="Email" type="email" />
              </div>
              <Button className="mt-4 gap-2" variant="outline" onClick={handleProfileSave}>
                <Save className="h-4 w-4" /> Save Profile
              </Button>
            </div>

            <div className="glass-card p-5">
              <h3 className="mb-4 font-display font-semibold text-foreground">Password</h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Input value={passwords.currentPassword} onChange={(event) => setPasswords({ ...passwords, currentPassword: event.target.value })} placeholder="Current password" type="password" />
                <Input value={passwords.newPassword} onChange={(event) => setPasswords({ ...passwords, newPassword: event.target.value })} placeholder="New password" type="password" />
              </div>
              <Button className="mt-4 gap-2" variant="outline" onClick={handlePasswordSave}>
                <Save className="h-4 w-4" /> Change Password
              </Button>
            </div>
          </>
        ) : (
          <div>
            <h3 className="mb-3 font-display font-semibold text-foreground">Login to edit name, email, and password</h3>
            <AuthForm />
          </div>
        )}
      </div>
    </div>
  );
}
