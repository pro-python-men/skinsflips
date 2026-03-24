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

export default function SettingsPage() {
  return (
    <DashboardLayout title="Settings" requireAuth>
      <div className="max-w-2xl space-y-6">
        {/* Profile Settings */}
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Profile</h3>
              <p className="text-sm text-muted-foreground">
                Manage your account settings
              </p>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-muted-foreground">
                Display Name
              </label>
              <Input defaultValue="SteamUser" />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-muted-foreground">
                Steam ID
              </label>
              <Input defaultValue="76561198012345678" disabled />
            </div>
          </div>
        </div>

        {/* Trading Preferences */}
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
              <DollarSign className="h-5 w-5 text-accent" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">
                Trading Preferences
              </h3>
              <p className="text-sm text-muted-foreground">
                Configure your default trading settings
              </p>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-muted-foreground">
                Default Currency
              </label>
              <Select defaultValue="usd">
                <SelectTrigger>
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
              <Input type="number" defaultValue="13" />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-muted-foreground">
                Default Trade Hold (days)
              </label>
              <Input type="number" defaultValue="7" />
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-chart-3/10">
              <Bell className="h-5 w-5 text-chart-3" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Notifications</h3>
              <p className="text-sm text-muted-foreground">
                Manage your notification preferences
              </p>
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">
                  Price Alerts
                </p>
                <p className="text-xs text-muted-foreground">
                  Get notified when skin prices change
                </p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">
                  Trade Hold Reminders
                </p>
                <p className="text-xs text-muted-foreground">
                  Reminder when trade hold ends
                </p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">
                  Weekly Summary
                </p>
                <p className="text-xs text-muted-foreground">
                  Weekly report of your trading performance
                </p>
              </div>
              <Switch />
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="rounded-xl border border-destructive/50 bg-card p-6">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10">
              <Shield className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Danger Zone</h3>
              <p className="text-sm text-muted-foreground">
                Irreversible actions
              </p>
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">
                  Delete All Flip History
                </p>
                <p className="text-xs text-muted-foreground">
                  Permanently delete all your recorded flips
                </p>
              </div>
              <Button variant="destructive" size="sm">
                Delete
              </Button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">
                  Delete Account
                </p>
                <p className="text-xs text-muted-foreground">
                  Permanently delete your account and all data
                </p>
              </div>
              <Button variant="destructive" size="sm">
                Delete
              </Button>
            </div>
          </div>
        </div>

        <Button className="w-full">Save Changes</Button>
      </div>
    </DashboardLayout>
  )
}
