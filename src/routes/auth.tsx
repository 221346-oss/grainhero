import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { Wheat, Eye, EyeOff, AlertCircle, CheckCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { supabase } from '@/integrations/supabase/client'

export const Route = createFileRoute('/auth')({
  head: () => ({
    meta: [
      { title: 'Sign in — GrainHero' },
      { name: 'description', content: 'Sign in or create your GrainHero account.' },
    ],
  }),
  component: AuthPage,
})

type Msg = { type: 'success' | 'error' | 'info'; text: string } | null

function AuthPage() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<'login' | 'signup' | 'forgot'>('login')

  // Redirect if already logged in
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: '/dashboard' })
    })
  }, [navigate])

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-12"
      style={{
        background: 'linear-gradient(135deg, #f0fdf4 0%, #e0f2fe 100%)',
      }}
    >
      <div className="w-full max-w-md">
        <Link
          to="/"
          className="flex items-center justify-center gap-2 mb-6 text-gray-700 hover:text-[#00a63e] transition-colors"
        >
          <Wheat className="w-8 h-8 text-[#00a63e]" />
          <span className="text-2xl font-bold tracking-wide">GrainHero</span>
        </Link>

        <Card className="shadow-xl border-gray-200">
          <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
            <CardHeader className="pb-4">
              <TabsList className="grid grid-cols-3 w-full">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="signup">Sign up</TabsTrigger>
                <TabsTrigger value="forgot">Reset</TabsTrigger>
              </TabsList>
            </CardHeader>

            <CardContent>
              <TabsContent value="login" className="mt-0">
                <LoginForm />
              </TabsContent>
              <TabsContent value="signup" className="mt-0">
                <SignupForm onDone={() => setTab('login')} />
              </TabsContent>
              <TabsContent value="forgot" className="mt-0">
                <ForgotForm />
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>
      </div>
    </div>
  )
}

function Message({ msg }: { msg: Msg }) {
  if (!msg) return null
  const styles =
    msg.type === 'error'
      ? 'bg-red-50 text-red-700 border-red-200'
      : msg.type === 'success'
        ? 'bg-green-50 text-green-700 border-green-200'
        : 'bg-blue-50 text-blue-700 border-blue-200'
  const Icon = msg.type === 'error' ? AlertCircle : CheckCircle
  return (
    <div className={`flex items-start gap-2 text-sm border rounded-md p-3 ${styles}`}>
      <Icon className="w-4 h-4 mt-0.5 flex-shrink-0" />
      <span>{msg.text}</span>
    </div>
  )
}

function LoginForm() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<Msg>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMsg(null)
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    })
    if (error) {
      setMsg({ type: 'error', text: error.message })
    } else {
      setMsg({ type: 'success', text: 'Signed in! Redirecting…' })
      setTimeout(() => navigate({ to: '/dashboard' }), 600)
    }
    setLoading(false)
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <CardTitle className="text-2xl">Welcome back</CardTitle>
        <CardDescription>Sign in to your GrainHero account</CardDescription>
      </div>
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="li-email">Email</Label>
          <Input
            id="li-email"
            type="email"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="li-password">Password</Label>
          <div className="relative">
            <Input
              id="li-password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
        <Message msg={msg} />
        <Button
          type="submit"
          disabled={loading}
          className="w-full bg-[#00a63e] hover:bg-[#029238] text-white"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Sign in'}
        </Button>
      </form>
    </div>
  )
}

function SignupForm({ onDone }: { onDone: () => void }) {
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirm: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<Msg>(null)

  const update = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMsg(null)
    if (form.password.length < 8) {
      setMsg({ type: 'error', text: 'Password must be at least 8 characters.' })
      return
    }
    if (form.password !== form.confirm) {
      setMsg({ type: 'error', text: 'Passwords do not match.' })
      return
    }
    setLoading(true)
    const { data, error } = await supabase.auth.signUp({
      email: form.email.trim().toLowerCase(),
      password: form.password,
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          name: form.name.trim(),
          phone: form.phone.trim(),
          business_type: 'farm',
        },
      },
    })
    setLoading(false)
    if (error) {
      setMsg({ type: 'error', text: error.message })
      return
    }
    if (data.user && !data.session) {
      setMsg({
        type: 'success',
        text: 'Check your inbox to confirm your email, then sign in.',
      })
      setTimeout(onDone, 1800)
    } else {
      setMsg({ type: 'success', text: 'Account created! Redirecting…' })
      setTimeout(() => (window.location.href = '/dashboard'), 800)
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <CardTitle className="text-2xl">Create your account</CardTitle>
        <CardDescription>Start monitoring your grain in minutes</CardDescription>
      </div>
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="su-name">Full name</Label>
          <Input
            id="su-name"
            value={form.name}
            onChange={(e) => update('name', e.target.value)}
            placeholder="Jane Doe"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="su-email">Email</Label>
          <Input
            id="su-email"
            type="email"
            value={form.email}
            onChange={(e) => update('email', e.target.value)}
            placeholder="you@company.com"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="su-phone">Phone (optional)</Label>
          <Input
            id="su-phone"
            value={form.phone}
            onChange={(e) => update('phone', e.target.value)}
            placeholder="+92 300 0000000"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="su-password">Password</Label>
          <div className="relative">
            <Input
              id="su-password"
              type={showPassword ? 'text' : 'password'}
              value={form.password}
              onChange={(e) => update('password', e.target.value)}
              required
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="su-confirm">Confirm password</Label>
          <Input
            id="su-confirm"
            type={showPassword ? 'text' : 'password'}
            value={form.confirm}
            onChange={(e) => update('confirm', e.target.value)}
            required
          />
        </div>
        <Message msg={msg} />
        <Button
          type="submit"
          disabled={loading}
          className="w-full bg-[#00a63e] hover:bg-[#029238] text-white"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create account'}
        </Button>
      </form>
    </div>
  )
}

function ForgotForm() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<Msg>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMsg(null)
    setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    })
    setLoading(false)
    if (error) setMsg({ type: 'error', text: error.message })
    else setMsg({ type: 'success', text: 'Check your inbox for a reset link.' })
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <CardTitle className="text-2xl">Reset password</CardTitle>
        <CardDescription>We'll email you a secure reset link</CardDescription>
      </div>
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="fp-email">Email</Label>
          <Input
            id="fp-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <Message msg={msg} />
        <Button
          type="submit"
          disabled={loading}
          className="w-full bg-[#00a63e] hover:bg-[#029238] text-white"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send reset link'}
        </Button>
      </form>
    </div>
  )
}
