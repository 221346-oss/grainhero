import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Sun, Moon, Shield, Sparkles, Check, Info, AlertTriangle, Loader2,
  Trash2, Send, Cpu, Smartphone, Database, Thermometer, Droplets,
  Wind, Clock
} from 'lucide-react'
import { NewGlassNav } from '@/components/landing/NewGlassNav'
import { NewFooter } from '@/components/landing/NewFooter'
import { getStoredThemeMode, toggleThemeMode, applyThemeMode, ThemeMode } from '@/lib/theme'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import {
  StatsSkeleton,
  ListSkeleton,
  TableSkeleton,
  CardsSkeleton,
  FormSkeleton
} from '@/components/app/skeletons'

export const Route = createFileRoute('/theme-test')({
  head: () => ({
    meta: [
      { title: 'Theme Sandbox — GrainHero' },
      { name: 'description', content: 'Sandbox to test light and dark themes on GrainHero UI components.' },
    ],
  }),
  component: ThemeSandboxPage,
})

function ThemeSandboxPage() {
  const [themeMode, setThemeMode] = useState<ThemeMode>('light')
  const [isFormSubmitted, setIsFormSubmitted] = useState(false)
  const [formLoading, setFormLoading] = useState(false)
  const [emailAlerts, setEmailAlerts] = useState(true)
  const [agreeTerms, setAgreeTerms] = useState(false)

  // Sync with current stored theme mode on mount
  useEffect(() => {
    setThemeMode(getStoredThemeMode())
  }, [])

  const handleThemeToggle = () => {
    const nextMode = toggleThemeMode()
    setThemeMode(nextMode)
  }

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setFormLoading(true)
    setTimeout(() => {
      setFormLoading(false)
      setIsFormSubmitted(true)
      setTimeout(() => setIsFormSubmitted(false), 3000)
    }, 1500)
  }

  const sampleTableData = [
    { id: 'GH-201', type: 'Premium Basmati', capacity: '1,200 Tons', humidity: '11.8%', temp: '22.4°C', status: 'Optimal' },
    { id: 'GH-202', type: 'Super Kernel Rice', capacity: '850 Tons', humidity: '14.2%', temp: '28.1°C', status: 'Warning' },
    { id: 'GH-203', type: 'Desi Wheat', capacity: '2,100 Tons', humidity: '10.5%', temp: '21.0°C', status: 'Optimal' },
    { id: 'GH-204', type: 'Hybrid Maize', capacity: '500 Tons', humidity: '16.5%', temp: '32.4°C', status: 'Critical' },
  ]

  return (
    <main className="min-h-screen bg-background text-foreground transition-colors duration-300">
      <NewGlassNav />

      {/* Hero Section */}
      <section className="relative pt-32 pb-16 sm:pt-40 sm:pb-24 px-4 sm:px-6 lg:px-8 border-b border-border bg-card">
        <div className="max-w-4xl mx-auto text-center relative z-10 space-y-6">
          <div className="inline-block bg-[--fusion-mint]/20 border border-[--fusion-mint] px-4 py-2 rounded-full mb-2">
            <span className="text-foreground text-sm font-semibold uppercase tracking-wider flex items-center gap-2 justify-center">
              <Sparkles className="w-4 h-4 text-[--fusion-grape]" />
              Visual Styling Catalog & Sandbox
            </span>
          </div>
          
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-foreground">
            Light & Dark <span className="text-[--fusion-grape] dark:text-[--fusion-mint]">Theme Sandbox</span>
          </h1>
          
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Test and verify all custom UI tokens, cards, alerts, forms, skeletons, and layouts. 
            Toggle the switch below to preview the website's dark mode look.
          </p>

          {/* Core Theme Switch Controls */}
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
            <div className="flex items-center gap-3 bg-muted/50 p-2.5 rounded-full border border-border">
              <button
                onClick={() => {
                  applyThemeMode('light')
                  setThemeMode('light')
                }}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-bold transition duration-300 text-sm ${
                  themeMode === 'light'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Sun className="w-4 h-4 text-amber-500" />
                Light Mode
              </button>
              
              <button
                onClick={() => {
                  applyThemeMode('dark')
                  setThemeMode('dark')
                }}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-bold transition duration-300 text-sm ${
                  themeMode === 'dark'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Moon className="w-4 h-4 text-indigo-400" />
                Dark Mode
              </button>
            </div>

            {/* Floating Interactive Toggle Button */}
            <button
              onClick={handleThemeToggle}
              className="flex items-center justify-center gap-2 bg-[--fusion-grape] text-white font-bold px-6 py-3 rounded-full hover:bg-[--fusion-grape]/90 shadow-lg hover:scale-105 transition duration-300"
            >
              {themeMode === 'light' ? (
                <>
                  <Moon className="w-5 h-5" />
                  Toggle Dark Mode
                </>
              ) : (
                <>
                  <Sun className="w-5 h-5" />
                  Toggle Light Mode
                </>
              )}
            </button>
          </div>
        </div>
      </section>

      {/* Components Grid */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-16">
        
        {/* Row 1: Typography and Alert Boxes */}
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Typography */}
          <Card>
            <CardHeader>
              <CardTitle>Typography System</CardTitle>
              <CardDescription>Visual text hierarchy and weight tokens.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <span className="text-xs text-muted-foreground block mb-1">Heading 1 (.text-3xl .font-black)</span>
                <h3 className="text-3xl font-black text-foreground">Silo Temperature Warning</h3>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block mb-1">Heading 2 (.text-xl .font-semibold)</span>
                <h4 className="text-xl font-semibold text-foreground">Grain Batches Under Analysis</h4>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block mb-1">Standard Paragraph (.text-sm .text-foreground)</span>
                <p className="text-sm text-foreground">
                  Our sensors continuously check temperature, humidity, and CO2 inside the silo nodes 
                  to calculate the exact spoilage hazard level.
                </p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block mb-1">Muted Description (.text-xs .text-muted-foreground)</span>
                <p className="text-xs text-muted-foreground">
                  Last sync timestamp: July 16, 2026 11:23 AM (Device ID: node_sensor_20)
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Alert Callouts */}
          <Card>
            <CardHeader>
              <CardTitle>Semantic Status Banners</CardTitle>
              <CardDescription>Used for notifications, warnings, and alerts.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-3 bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl text-emerald-700 dark:text-emerald-300">
                <Check className="w-5 h-5 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-sm">Optimal Storage Level</h4>
                  <p className="text-xs opacity-90">Silo 04 is currently maintaining constant aeration. Grain condition is rated excellent.</p>
                </div>
              </div>

              <div className="flex gap-3 bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl text-amber-700 dark:text-amber-300">
                <Info className="w-5 h-5 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-sm">Aeration Recommended</h4>
                  <p className="text-xs opacity-90">Relative humidity on Batch GH-202 has risen above 14%. Activate fan node 02.</p>
                </div>
              </div>

              <div className="flex gap-3 bg-red-500/10 border border-red-500/20 p-4 rounded-xl text-red-700 dark:text-red-300">
                <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-sm">Critical Temperature Alert</h4>
                  <p className="text-xs opacity-90">Silo 02 has exceeded 32°C. Critical danger of mold growth detected by AI prediction models.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Row 2: Buttons and Badges */}
        <Card>
          <CardHeader>
            <CardTitle>Buttons & Badges</CardTitle>
            <CardDescription>Different standard interactive components and badge styles.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            {/* Buttons row */}
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-muted-foreground mb-3">Button Variants</h4>
              <div className="flex flex-wrap gap-3">
                <Button variant="default">Primary Action</Button>
                <Button variant="secondary">Secondary Action</Button>
                <Button variant="outline">Outline Border</Button>
                <Button variant="destructive" className="flex items-center gap-2">
                  <Trash2 className="w-4 h-4" /> Delete Item
                </Button>
                <Button variant="ghost">Ghost Button</Button>
                <Button disabled className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Please wait
                </Button>
              </div>
            </div>

            {/* Badges row */}
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-muted-foreground mb-3">Status Badges</h4>
              <div className="flex flex-wrap gap-3">
                <Badge variant="default" className="bg-[#2FAC0C] text-white hover:bg-[#2FAC0C]/90">Optimal</Badge>
                <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">Warning</Badge>
                <Badge variant="destructive" className="bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">Critical</Badge>
                <Badge variant="outline">Offline Node</Badge>
                <Badge className="bg-[--fusion-grape] text-white">AI Prediction</Badge>
                <Badge className="bg-[--fusion-mint] text-[--fusion-ink]">Active Sync</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Row 3: Stats Cards Grid */}
        <div className="space-y-4">
          <h3 className="text-2xl font-bold text-foreground">Sensor Metric Tiles</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="hover:scale-105 transition duration-300">
              <CardContent className="p-6 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Average Temp</span>
                  <Thermometer className="w-5 h-5 text-red-500" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-3xl font-black text-foreground">24.5 °C</h4>
                  <p className="text-xs text-emerald-600 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Stable across 14 nodes
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:scale-105 transition duration-300">
              <CardContent className="p-6 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">RH Humidity</span>
                  <Droplets className="w-5 h-5 text-blue-500" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-3xl font-black text-foreground">11.4 %</h4>
                  <p className="text-xs text-emerald-600 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Within target boundaries
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:scale-105 transition duration-300">
              <CardContent className="p-6 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Fan Status</span>
                  <Wind className="w-5 h-5 text-[--fusion-grape]" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-3xl font-black text-foreground">3 Active</h4>
                  <p className="text-xs text-amber-500 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    Aerating Silo 02
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:scale-105 transition duration-300">
              <CardContent className="p-6 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Spoilage Risk</span>
                  <Cpu className="w-5 h-5 text-amber-500" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-3xl font-black text-foreground">Low</h4>
                  <p className="text-xs text-emerald-600 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    AI model score 98%
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Row 4: Data Table */}
        <Card>
          <CardHeader>
            <CardTitle>Storage Node Database</CardTitle>
            <CardDescription>Tabular overview of active grain batches and environment metrics.</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr className="border-b border-border text-muted-foreground text-sm font-semibold">
                  <th className="py-3 px-4">Batch ID</th>
                  <th className="py-3 px-4">Grain Type</th>
                  <th className="py-3 px-4">Net Capacity</th>
                  <th className="py-3 px-4">Humidity</th>
                  <th className="py-3 px-4">Temperature</th>
                  <th className="py-3 px-4">AI Safety Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 text-sm">
                {sampleTableData.map((row) => (
                  <tr key={row.id} className="hover:bg-muted/40 transition">
                    <td className="py-3.5 px-4 font-bold">{row.id}</td>
                    <td className="py-3.5 px-4 text-muted-foreground">{row.type}</td>
                    <td className="py-3.5 px-4">{row.capacity}</td>
                    <td className="py-3.5 px-4">{row.humidity}</td>
                    <td className="py-3.5 px-4">{row.temp}</td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        row.status === 'Optimal'
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          : row.status === 'Warning'
                            ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                            : 'bg-red-500/10 text-red-600 dark:text-red-400'
                      }`}>
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* Row 5: Form Elements */}
        <div className="grid lg:grid-cols-3 gap-8">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Grain Node Configuration Form</CardTitle>
              <CardDescription>Setup threshold metrics and automation configurations.</CardDescription>
            </CardHeader>
            <form onSubmit={handleFormSubmit}>
              <CardContent className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="node-name">Operator Name</Label>
                    <Input id="node-name" placeholder="e.g. Tariq Mahmood" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="node-email">Contact Email</Label>
                    <Input id="node-email" type="email" placeholder="tariq@farmops.pk" required />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="grain-select">Primary Grain Stock</Label>
                  <Select defaultValue="basmati">
                    <SelectTrigger id="grain-select">
                      <SelectValue placeholder="Select grain class" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="basmati">Super Basmati Rice</SelectItem>
                      <SelectItem value="irri">IRRI-6 Rice</SelectItem>
                      <SelectItem value="wheat">Punjab Desi Wheat</SelectItem>
                      <SelectItem value="maize">High-Yield Maize</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg border border-border/80 bg-muted/30">
                  <div className="space-y-0.5">
                    <Label htmlFor="email-notifications" className="font-bold">Email Spoilage Alerting</Label>
                    <p className="text-xs text-muted-foreground">Receive instant warning logs when critical mold thresholds are breached.</p>
                  </div>
                  <Switch
                    id="email-notifications"
                    checked={emailAlerts}
                    onCheckedChange={setEmailAlerts}
                  />
                </div>

                <div className="space-y-3">
                  <Label className="text-sm font-semibold">Weekly Diagnostic Reporting Channel</Label>
                  <RadioGroup defaultValue="email" className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="email" id="rep-email" />
                      <Label htmlFor="rep-email" className="font-normal cursor-pointer">Direct Email Report (PDF)</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="whatsapp" id="rep-whatsapp" />
                      <Label htmlFor="rep-whatsapp" className="font-normal cursor-pointer">WhatsApp Dashboard digest</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="disabled" id="rep-disabled" />
                      <Label htmlFor="rep-disabled" className="font-normal cursor-pointer">Disable diagnostic reporting</Label>
                    </div>
                  </RadioGroup>
                </div>

                <div className="flex items-start gap-2.5 pt-2">
                  <Checkbox
                    id="agree-rules"
                    checked={agreeTerms}
                    onCheckedChange={(checked) => setAgreeTerms(Boolean(checked))}
                  />
                  <Label htmlFor="agree-rules" className="text-xs text-muted-foreground font-normal leading-none cursor-pointer">
                    I confirm that sensor thresholds comply with national grain preservation standards.
                  </Label>
                </div>
              </CardContent>

              <CardFooter className="flex justify-between border-t border-border/50 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsFormSubmitted(false)}>Reset</Button>
                <Button type="submit" className="bg-[--fusion-grape] text-white" disabled={formLoading}>
                  {formLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Saving Thresholds
                    </>
                  ) : isFormSubmitted ? (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Saved Successfully
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Save Node Config
                    </>
                  )}
                </Button>
              </CardFooter>
            </form>
          </Card>

          {/* Mini Device Panel */}
          <div className="space-y-4">
            <Card className="bg-[--gradient-fusion-soft] dark:bg-[--gradient-fusion-soft]/5 border border-[--fusion-mint]/30">
              <CardHeader>
                <CardTitle className="text-[--fusion-ink] dark:text-[#EDE9D4] flex items-center gap-2">
                  <Cpu className="w-5 h-5 text-[--fusion-grape]" />
                  IoT Aeration Fan Control
                </CardTitle>
                <CardDescription className="text-[--fusion-ink]/70 dark:text-muted-foreground">Manual fan activation controls</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-[--fusion-ink] dark:text-[#EDE9D4]">
                <div className="space-y-1">
                  <span className="text-xs font-semibold uppercase tracking-wider opacity-85">Primary Silo Fan</span>
                  <div className="flex items-center justify-between">
                    <span className="font-black text-xl">Silo 02 - Fan #1</span>
                    <Badge className="bg-emerald-500 text-white">Online</Badge>
                  </div>
                </div>
                <div className="pt-2 flex gap-2">
                  <Button size="sm" className="w-full bg-[--fusion-grape] text-white hover:bg-[--fusion-grape]/90">
                    Turn On Fan
                  </Button>
                  <Button size="sm" variant="outline" className="w-full border-[--fusion-grape]/30 text-[--fusion-ink] dark:text-[#EDE9D4] hover:bg-[--fusion-grape]/10">
                    Cycle Fan
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 space-y-4">
                <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[--fusion-grape]" />
                  Aeration Duty Cycle
                </h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Progress</span>
                    <span>45 min remaining</span>
                  </div>
                  <div className="w-full bg-muted h-2.5 rounded-full overflow-hidden">
                    <div className="bg-[--fusion-grape] h-full" style={{ width: '60%' }} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Row 6: Skeletons Showcase (Crucial Task 1 Check) */}
        <div className="space-y-6 border-t border-border pt-12">
          <div className="space-y-2">
            <h3 className="text-2xl font-bold text-foreground">Theme-Aware Loading Skeletons</h3>
            <p className="text-muted-foreground text-sm">
              Verify that the loading skeleton components react properly to Light/Dark styling adjustments.
              They now use semantic variables (like <code className="bg-muted px-1.5 py-0.5 rounded text-xs">bg-card</code> and <code className="bg-muted px-1.5 py-0.5 rounded text-xs">border-border</code>) to match the theme background automatically.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-muted-foreground">Dashboard Skeleton Preview</h4>
              <div className="border border-border rounded-2xl p-4 bg-muted/10">
                <StatsSkeleton count={2} className="mb-4" />
                <CardsSkeleton count={1} />
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-muted-foreground">Table & Form Skeletons Preview</h4>
              <div className="border border-border rounded-2xl p-4 bg-muted/10 space-y-4">
                <FormSkeleton fields={2} className="mb-4" />
                <TableSkeleton rows={2} cols={3} />
              </div>
            </div>
          </div>
        </div>

      </section>

      <NewFooter />
    </main>
  )
}
