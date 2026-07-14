"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { User, Bell, DollarSign, Shield } from "lucide-react"

function SettingsSection({
  icon: Icon,
  title,
  description,
  iconTone,
  children,
}: {
  icon: typeof User
  title: string
  description: string
  iconTone: string
  children: React.ReactNode
}) {
  return (
    <section className="surface-panel rounded-[1.8rem] p-6">
      <div className="mb-6 flex items-center gap-4">
        <div className={`flex h-11 w-11 items-center justify-center rounded-2xl border border-white/8 ${iconTone}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-foreground">{title}</h3>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      {children}
    </section>
  )
}

export default function SettingsPage() {
  return (
    <DashboardLayout title="Settings" requireAuth>
      <div className="mx-auto max-w-3xl space-y-6">
        <section className="surface-panel rounded-[2rem] p-6">
          <div className="space-y-2">
            <p className="section-heading">Preferences</p>
            <h1 className="text-3xl font-semibold tracking-[-0.05em] text-white">
              Configure your workspace
            </h1>
            <p className="max-w-[62ch] text-sm text-muted-foreground">
              Manage account defaults, trading preferences, and notifications from one consistent settings view.
            </p>
          </div>
        </section>

        <SettingsSection
          icon={User}
          title="Profile"
          description="Identity and connected account details"
          iconTone="bg-white/4 text-foreground"
        >
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-muted-foreground">
                Display Name
              </label>
              <Input defaultValue="SteamUser" className="h-12 rounded-2xl border-white/10 bg-white/4" />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-muted-foreground">
                Steam ID
              </label>
              <Input defaultValue="76561198012345678" disabled className="h-12 rounded-2xl border-white/10 bg-white/4" />
            </div>
          </div>
        </SettingsSection>

        <SettingsSection
          icon={DollarSign}
          title="Trading Preferences"
          description="Default assumptions used in your trading workspace"
          iconTone="bg-primary/10 text-primary"
        >
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-muted-foreground">
                Default Currency
              </label>
              <Select defaultValue="usd">
                <SelectTrigger className="h-12 rounded-2xl border-white/10 bg-white/4">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="usd">USD ($)</SelectItem>
                  <SelectItem value="eur">EUR (euro)</SelectItem>
                  <SelectItem value="gbp">GBP (pound)</SelectItem>
                  <SelectItem value="cny">CNY (yuan)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-muted-foreground">
                Default Marketplace Fee (%)
              </label>
              <Input type="number" defaultValue="13" className="h-12 rounded-2xl border-white/10 bg-white/4" />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-muted-foreground">
                Default Trade Hold (days)
              </label>
              <Input type="number" defaultValue="7" className="h-12 rounded-2xl border-white/10 bg-white/4" />
            </div>
          </div>
        </SettingsSection>

        <SettingsSection
          icon={Bell}
          title="Notifications"
          description="Control reminders and activity summaries"
          iconTone="bg-white/4 text-chart-3"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4 rounded-[1.4rem] border border-white/8 bg-white/4 p-4">
              <div>
                <p className="text-sm font-medium text-foreground">Price Alerts</p>
                <p className="text-xs text-muted-foreground">
                  Get notified when skin prices change
                </p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between gap-4 rounded-[1.4rem] border border-white/8 bg-white/4 p-4">
              <div>
                <p className="text-sm font-medium text-foreground">Trade Hold Reminders</p>
                <p className="text-xs text-muted-foreground">
                  Reminder when trade hold ends
                </p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between gap-4 rounded-[1.4rem] border border-white/8 bg-white/4 p-4">
              <div>
                <p className="text-sm font-medium text-foreground">Weekly Summary</p>
                <p className="text-xs text-muted-foreground">
                  Weekly report of your trading performance
                </p>
              </div>
              <Switch />
            </div>
          </div>
        </SettingsSection>

        <SettingsSection
          icon={Shield}
          title="Danger Zone"
          description="Irreversible actions"
          iconTone="bg-destructive/10 text-destructive"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4 rounded-[1.4rem] border border-destructive/30 bg-destructive/5 p-4">
              <div>
                <p className="text-sm font-medium text-foreground">Delete All Flip History</p>
                <p className="text-xs text-muted-foreground">
                  Permanently delete all your recorded flips
                </p>
              </div>
              <Button variant="destructive" size="sm" className="rounded-full">
                Delete
              </Button>
            </div>
            <div className="flex items-center justify-between gap-4 rounded-[1.4rem] border border-destructive/30 bg-destructive/5 p-4">
              <div>
                <p className="text-sm font-medium text-foreground">Delete Account</p>
                <p className="text-xs text-muted-foreground">
                  Permanently delete your account and all data
                </p>
              </div>
              <Button variant="destructive" size="sm" className="rounded-full">
                Delete
              </Button>
            </div>
          </div>
        </SettingsSection>

        <section className="surface-panel rounded-[1.8rem] p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Review and save your defaults</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Preference changes only affect how the workspace presents and defaults data.
              </p>
            </div>
            <Button className="h-12 rounded-2xl bg-primary px-6 text-base font-semibold text-primary-foreground hover:bg-primary/90">
              Save Changes
            </Button>
          </div>
        </section>
      </div>
    </DashboardLayout>
  )
}
