import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { Wheat, Loader2, AlertCircle, CheckCircle, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { supabase } from '@/integrations/supabase/client'

export const Route = createFileRoute('/auth/reset-password')({
  head: () => ({
    meta: [
      { title: 'Set a new password — GrainHero' },
      { name: 'description', content: 'Choose a new password for your GrainHero account.' },
      { property: 'og:title', content: 'Set a new password — GrainHero' },
      { property: 'og:description', content: 'Choose a new password for your GrainHero account.' },
      { name: 'robots', content: 'noindex, nofollow' },
    ],
  }),
  component: ResetPasswordPage,
})

function ResetPasswordPage() {
  const navigate = useNavigate()
  const [ready, setReady] = useState(false)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    // Supabase handles the recovery session automatically via the URL hash
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') setReady(true)
    })
    // Also check current session in case listener missed the event
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMsg(null)
    if (password.length < 8) {
      setMsg({ type: 'error', text: 'Password must be at least 8 characters.' })
      return
    }
    if (password !== confirm) {
      setMsg({ type: 'error', text: 'Passwords do not match.' })
      return
    }
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (error) {
      setMsg({ type: 'error', text: error.message })
    } else {
      setMsg({ type: 'success', text: 'Password updated! Redirecting…' })
      setTimeout(() => navigate({ to: '/auth/login' }), 900)
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-12"
      style={{ background: 'linear-gradient(135deg, #f0fdf4 0%, #e0f2fe 100%)' }}
    >
      <div className="w-full max-w-md">
        <Link
          to="/"
          className="flex items-center justify-center gap-2 mb-6 text-gray-700 hover:text-[#00a63e]"
        >
          <Wheat className="w-8 h-8 text-[#00a63e]" />
          <span className="text-2xl font-bold tracking-wide">GrainHero</span>
        </Link>

        <Card className="shadow-xl">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Set a new password</CardTitle>
            <CardDescription>
              {ready
                ? 'Choose a strong password for your account.'
                : 'Verifying reset link…'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!ready ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-[#00a63e]" />
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="rp-password">New password</Label>
                  <div className="relative">
                    <Input
                      id="rp-password"
                      type={show ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShow((s) => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rp-confirm">Confirm password</Label>
                  <Input
                    id="rp-confirm"
                    type={show ? 'text' : 'password'}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                  />
                </div>
                {msg && (
                  <div
                    className={`flex items-start gap-2 text-sm border rounded-md p-3 ${
                      msg.type === 'error'
                        ? 'bg-red-50 text-red-700 border-red-200'
                        : 'bg-green-50 text-green-700 border-green-200'
                    }`}
                  >
                    {msg.type === 'error' ? (
                      <AlertCircle className="w-4 h-4 mt-0.5" />
                    ) : (
                      <CheckCircle className="w-4 h-4 mt-0.5" />
                    )}
                    <span>{msg.text}</span>
                  </div>
                )}
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#00a63e] hover:bg-[#029238] text-white"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Update password'}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
