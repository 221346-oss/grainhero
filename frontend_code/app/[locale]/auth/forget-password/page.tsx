"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { WheatIcon as Sheep, AlertCircle, CheckCircle } from "lucide-react"
import { config } from "@/config"
import { useTranslations } from "next-intl"
import { validateEmail, createFieldValidation, type FieldValidation } from "@/lib/validation"

export default function ForgetPasswordPage({ params: _params }: { params: Promise<{ locale: string }> }) {
  const t = useTranslations('AuthPage');
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [emailValidation, setEmailValidation] = useState<FieldValidation>(createFieldValidation())

  const handleEmailChange = (value: string) => {
    setEmail(value)
    const validation = validateEmail(value)
    setEmailValidation({
      value,
      touched: true,
      isValid: validation.isValid,
      message: validation.message
    })
  }

  const isFormValid = emailValidation.isValid && email.trim()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate email before submission
    if (!emailValidation.isValid) {
      setMessage("Please enter a valid email address")
      return
    }

    setIsLoading(true)
    setMessage(null)
    try {
      const res = await fetch(`${config.backendUrl}/auth/forget-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setMessage(data?.error || "Request failed. Please try again.")
      } else {
        setMessage(data?.message || "If this email exists, a reset link has been sent.")
      }
    } catch {
      setMessage("Network error. Please try again.")
    }
    setIsLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Sheep className="h-12 w-12 text-green-600" />
          </div>
          <CardTitle className="text-2xl">{t('forgotPassword')}</CardTitle>
          <CardDescription>{t('forgotPasswordDescription') || "Enter your email to receive a password reset link."}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">{t('email')}</Label>
              <div className="relative">
                <Input
                  id="email"
                  type="email"
                  placeholder="john.doe@example.com"
                  value={email}
                  onChange={(e) => handleEmailChange(e.target.value)}
                  className={`pr-10 ${emailValidation.touched && !emailValidation.isValid ? 'border-red-500 focus:border-red-500' : emailValidation.touched && emailValidation.isValid ? 'border-green-500 focus:border-green-500' : ''}`}
                  required
                />
                {emailValidation.touched && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    {emailValidation.isValid ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-red-500" />
                    )}
                  </div>
                )}
              </div>
              {emailValidation.touched && !emailValidation.isValid && (
                <p className="text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {emailValidation.message}
                </p>
              )}
            </div>

            {message && (
              <div className={`text-sm p-3 rounded-md flex items-center gap-2 ${message.includes('sent') || message.includes('success')
                ? 'text-green-700 bg-green-50 border border-green-200'
                : 'text-red-600 bg-red-50 border border-red-200'
                }`}>
                {message.includes('sent') || message.includes('success') ? (
                  <CheckCircle className="h-4 w-4 flex-shrink-0" />
                ) : (
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                )}
                {message}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={isLoading || !isFormValid}>
              {isLoading ? t('sending') || "Sending..." : t('continue') || "Continue"}
            </Button>
          </form>

          <div className="mt-6 text-center space-y-2">
            <Link href="/auth/login" className="text-sm text-blue-600 hover:underline">
              {t('backToLogin') || "Back to Login"}
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 