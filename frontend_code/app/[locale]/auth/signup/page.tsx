"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { WheatIcon as Sheep, Eye, EyeOff, AlertCircle, CheckCircle } from "lucide-react"
import { config } from "@/config"
import { useTranslations } from 'next-intl';
import { useRouter } from "@/i18n/navigation"
import {
  validateSignupForm,
  validateField,
  validatePassword,
  createFieldValidation,
  type PasswordStrength
} from "@/lib/validation";
import { PasswordStrengthIndicator } from "@/components/PasswordStrengthIndicator";

export default function SignUpPage({ params: _params }: { params: Promise<{ locale: string }> }) {
  const t = useTranslations('AuthPage');
  const router = useRouter();
  const searchParams = useSearchParams();

  // Form data state
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  })

  // Invitation state
  const [invitationData, setInvitationData] = useState<{
    valid: boolean;
    email?: string;
    role?: string;
    name?: string;
  } | null>(null);
  const [invitationToken, setInvitationToken] = useState<string | null>(null);

  // Validation state for each field
  const [fieldValidations, setFieldValidations] = useState({
    name: createFieldValidation(),
    email: createFieldValidation(),
    phone: createFieldValidation(),
    password: createFieldValidation(),
    confirmPassword: createFieldValidation(),
  })

  // UI state
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  // Removed selectedPlanId since plan selection moved to checkout
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrength>({ score: 0, feedback: [], isValid: false })

  const handlePostSignupRedirect = (email: string) => {
    const normalizedEmail = email.trim().toLowerCase()
    if (typeof window !== 'undefined') {
      localStorage.setItem('pendingSignupEmail', normalizedEmail)
    }
    setMessage("Account created successfully! Redirecting you to login.")
    setTimeout(() => {
      router.push(`/auth/login?prefill=${encodeURIComponent(normalizedEmail)}`)
    }, 1500)
  }

  // Verify invitation token and handle payment success on component mount
  useEffect(() => {
    const token = searchParams.get('token');
    const paymentSuccess = searchParams.get('payment');
    const email = searchParams.get('email');

    if (token) {
      setInvitationToken(token);
      verifyInvitation(token);
    }

    // Handle payment success redirect
    if (paymentSuccess === 'success' && email) {
      setFormData(prev => ({
        ...prev,
        email: email
      }));
      
      const isRecovery = searchParams.get('recovery');
      if (isRecovery) {
        setMessage("🎉 Payment successful! Please complete your account setup below to activate your access.");
      } else {
        setMessage("🎉 Payment successful! Your account is being activated. Redirecting you to login...");
        // Delay to allow webhook to process and to show the message
        setTimeout(() => {
          router.push(`/auth/login?prefill=${encodeURIComponent(email)}&status=activated`);
        }, 3000);
      }
    }
  }, [searchParams, router]);

  const verifyInvitation = async (token: string) => {
    try {
      const res = await fetch(`${config.backendUrl}/auth/verify-invitation?token=${token}`);
      const data = await res.json();

      if (res.ok && data.valid) {
        setInvitationData(data);
        // Pre-fill form with invitation data
        setFormData(prev => ({
          ...prev,
          email: data.email,
          name: data.name || ''
        }));
      } else {
        setMessage(data.error || 'Invalid invitation token');
      }
    } catch {
      setMessage('Failed to verify invitation token');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setMessage(null)

    // Validate entire form
    const validation = validateSignupForm(formData)

    if (!validation.isValid) {
      // Mark all fields as touched and update validation state
      const updatedValidations = { ...fieldValidations }
      Object.keys(validation.errors).forEach(fieldName => {
        if (fieldName in updatedValidations) {
          updatedValidations[fieldName as keyof typeof updatedValidations] = {
            ...updatedValidations[fieldName as keyof typeof updatedValidations],
            touched: true,
            isValid: false,
            message: validation.errors[fieldName]
          }
        }
      })
      setFieldValidations(updatedValidations)
      setMessage("Please fix the errors below before submitting.")
      setIsLoading(false)
      return
    }

    try {
      // Check if this is an invited user
      if (invitationData) {
        // Invited users can signup directly (no payment needed)
        const signupData: {
          name: string;
          email: string;
          phone?: string;
          password: string;
          confirm_password: string;
          invitation_token?: string;
        } = {
          name: formData.name.trim(),
          email: formData.email.trim().toLowerCase(),
          phone: formData.phone.trim() || undefined,
          password: formData.password,
          confirm_password: formData.confirmPassword,
          invitation_token: invitationToken || undefined,
        };

        const res = await fetch(`${config.backendUrl}/auth/signup`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(signupData),
        })

        if (!res.ok) {
          const error = await res.json().catch(() => ({}))
          setMessage(error?.message || "Signup failed. Please try again.")
        } else {
          handlePostSignupRedirect(formData.email)
        }
      } else {
        // First-time users need to verify payment first
        const paymentVerification = await fetch(`${config.backendUrl}/api/payment-verification`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: formData.email.trim().toLowerCase() }),
        })

        if (!paymentVerification.ok) {
          setMessage("Please complete payment first to create your account. You'll be redirected to checkout.")
          setTimeout(() => {
            localStorage.setItem('signupEmail', formData.email)
            router.push(`/checkout?email=${encodeURIComponent(formData.email)}`)
          }, 2000)
          return
        }

        const paymentData = await paymentVerification.json()
        console.log("Payment verification response:", paymentData)

        if (!paymentData.hasPayment) {
          setMessage("Please complete payment first to create your account. You'll be redirected to checkout.")
          setTimeout(() => {
            localStorage.setItem('signupEmail', formData.email)
            router.push(`/checkout?email=${encodeURIComponent(formData.email)}`)
          }, 2000)
          return
        }

        // Check if user already exists as admin (completed signup)
        if (paymentData.user && paymentData.user.role === 'admin') {
          setMessage("Account already exists! Redirecting you to login.")
          setTimeout(() => {
            router.push(`/auth/login?prefill=${encodeURIComponent(formData.email)}`)
          }, 1500)
          return
        }

        // User has payment and is not yet an admin, proceed with signup
        const signupData = {
          name: formData.name.trim(),
          email: formData.email.trim().toLowerCase(),
          phone: formData.phone.trim() || undefined,
          password: formData.password,
          confirm_password: formData.confirmPassword,
        };

        const res = await fetch(`${config.backendUrl}/auth/signup`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(signupData),
        })

        const result = await res.json()
        
        if (!res.ok) {
          setMessage(result?.message || result?.error || "Signup failed. Please try again.")
        } else {
          // Check if this is an existing user message
          if (result?.message?.includes("already exists")) {
            setMessage("Account already exists! Redirecting you to login.")
            setTimeout(() => {
              router.push(`/auth/login?prefill=${encodeURIComponent(formData.email)}`)
            }, 1500)
          } else {
            handlePostSignupRedirect(formData.email)
          }
        }
      }
    } catch {
      setMessage("Network error. Please try again.")
    }
    setIsLoading(false)
  }

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))

    // Real-time validation
    const validation = validateField(field, value)

    // Special handling for password confirmation
    if (field === 'confirmPassword') {
      if (formData.password && value) {
        const passwordsMatch = formData.password === value
        setFieldValidations(prev => ({
          ...prev,
          confirmPassword: {
            ...prev.confirmPassword,
            value,
            touched: true,
            isValid: passwordsMatch,
            message: passwordsMatch ? "" : "Passwords do not match"
          }
        }))
      } else {
        setFieldValidations(prev => ({
          ...prev,
          confirmPassword: {
            ...prev.confirmPassword,
            value,
            touched: true,
            isValid: validation.isValid,
            message: validation.message
          }
        }))
      }
    } else {
      setFieldValidations(prev => ({
        ...prev,
        [field]: {
          ...prev[field as keyof typeof prev],
          value,
          touched: true,
          isValid: validation.isValid,
          message: validation.message
        }
      }))
    }

    // Update password strength for password field
    if (field === 'password') {
      const passwordValidation = validatePassword(value)
      setPasswordStrength(passwordValidation.strength)
    }
  }

  // Check if form is valid for submit button
  const isFormValid = Object.values(fieldValidations).every(field => field.isValid) &&
    formData.name && formData.email && formData.password && formData.confirmPassword

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50 px-4">
      <div className="w-full max-w-md">
        {/* Left: Signup Form */}
        <Card className="w-full">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Sheep className="h-10 w-10 text-green-600" />
              <div>
                <CardTitle className="text-2xl">
                  {invitationData ? `Accept Invitation - ${invitationData.role}` : t('createAccount')}
                </CardTitle>
                <CardDescription>
                  {invitationData
                    ? `You've been invited to join GrainHero as a ${invitationData.role}. Complete your account setup below.`
                    : t('signUpForFarmHome')
                  }
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Name Field */}
              <div className="space-y-2">
                <Label htmlFor="name">{t('fullName')}</Label>
                <div className="relative">
                  <Input
                    id="name"
                    type="text"
                    placeholder="Enter your full name"
                    value={formData.name}
                    onChange={(e) => handleChange("name", e.target.value)}
                    className={`pr-10 ${fieldValidations.name.touched && !fieldValidations.name.isValid ? 'border-red-500 focus:border-red-500' : fieldValidations.name.touched && fieldValidations.name.isValid ? 'border-green-500 focus:border-green-500' : ''}`}
                    required
                  />
                  {fieldValidations.name.touched && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      {fieldValidations.name.isValid ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-red-500" />
                      )}
                    </div>
                  )}
                </div>
                {fieldValidations.name.touched && !fieldValidations.name.isValid && (
                  <p className="text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {fieldValidations.name.message}
                  </p>
                )}
              </div>

              {/* Email Field */}
              <div className="space-y-2">
                <Label htmlFor="email">{t('email')}</Label>
                <div className="relative">
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email address"
                    value={formData.email}
                    onChange={(e) => handleChange("email", e.target.value)}
                    className={`pr-10 ${fieldValidations.email.touched && !fieldValidations.email.isValid ? 'border-red-500 focus:border-red-500' : fieldValidations.email.touched && fieldValidations.email.isValid ? 'border-green-500 focus:border-green-500' : ''} ${invitationData || searchParams.get('payment') === 'success' ? 'bg-gray-50' : ''}`}
                    readOnly={!!invitationData || searchParams.get('payment') === 'success'}
                    required
                  />
                  {fieldValidations.email.touched && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      {fieldValidations.email.isValid ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-red-500" />
                      )}
                    </div>
                  )}
                </div>
                {fieldValidations.email.touched && !fieldValidations.email.isValid && (
                  <p className="text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {fieldValidations.email.message}
                  </p>
                )}
              </div>

              {/* Phone Field */}
              <div className="space-y-2">
                <Label htmlFor="phone">{t('phoneNumber')} <span className="text-gray-400 text-sm">{t('optional')}</span></Label>
                <div className="relative">
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="Enter your phone number"
                    value={formData.phone}
                    onChange={(e) => handleChange("phone", e.target.value)}
                    className={`pr-10 ${fieldValidations.phone.touched && !fieldValidations.phone.isValid ? 'border-red-500 focus:border-red-500' : fieldValidations.phone.touched && fieldValidations.phone.isValid ? 'border-green-500 focus:border-green-500' : ''}`}
                  />
                  {fieldValidations.phone.touched && fieldValidations.phone.value && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      {fieldValidations.phone.isValid ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-red-500" />
                      )}
                    </div>
                  )}
                </div>
                {fieldValidations.phone.touched && !fieldValidations.phone.isValid && (
                  <p className="text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {fieldValidations.phone.message}
                  </p>
                )}
              </div>

              {/* Password Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="password">{t('password')}</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={(e) => handleChange("password", e.target.value)}
                      className={`pr-10 ${fieldValidations.password.touched && !fieldValidations.password.isValid ? 'border-red-500 focus:border-red-500' : fieldValidations.password.touched && fieldValidations.password.isValid ? 'border-green-500 focus:border-green-500' : ''}`}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {fieldValidations.password.touched && !fieldValidations.password.isValid && (
                    <p className="text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {fieldValidations.password.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">{t('confirmPassword')}</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      value={formData.confirmPassword}
                      onChange={(e) => handleChange("confirmPassword", e.target.value)}
                      className={`pr-10 ${fieldValidations.confirmPassword.touched && !fieldValidations.confirmPassword.isValid ? 'border-red-500 focus:border-red-500' : fieldValidations.confirmPassword.touched && fieldValidations.confirmPassword.isValid ? 'border-green-500 focus:border-green-500' : ''}`}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {fieldValidations.confirmPassword.touched && !fieldValidations.confirmPassword.isValid && (
                    <p className="text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {fieldValidations.confirmPassword.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Password Strength Indicator */}
              {formData.password && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Password Strength</Label>
                  <PasswordStrengthIndicator strength={passwordStrength} />
                </div>
              )}

              {/* Message Display */}
              {message && (
                <div className={`text-sm rounded-md p-3 flex items-center gap-2 ${message.includes('successfully') || message.includes('success')
                  ? 'text-green-600 bg-green-50 border border-green-200'
                  : 'text-red-600 bg-red-50 border border-red-200'
                  }`}>
                  {message.includes('successfully') || message.includes('success') ? (
                    <CheckCircle className="h-4 w-4 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  )}
                  {message}
                </div>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2.5"
                disabled={isLoading || !isFormValid}
                aria-label="Create account and continue to payment"
              >
                {isLoading ? 'Creating Account...' : 'Create Account'}
              </Button>
            </form>
          </CardContent>
        </Card>

      </div>
    </div>
  )
}
