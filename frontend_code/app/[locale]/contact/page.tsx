"use client"

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Wheat as WheatIcon, Mail, Phone, MapPin, CheckCircle, AlertCircle, ArrowLeft } from "lucide-react"
import { Link } from '@/i18n/navigation'

export default function ContactPage({ params: _params }: { params: Promise<{ locale: string }> }) {
    const searchParams = useSearchParams()
    const planType = searchParams.get('plan')

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        company: '',
        message: ''
    })

    const [isSubmitting, setIsSubmitting] = useState(false)
    const [message, setMessage] = useState<string | null>(null)
    const [redirectCountdown, setRedirectCountdown] = useState<number | null>(null)

    useEffect(() => {
        if (planType === 'custom') {
            setFormData(prev => ({
                ...prev,
                message: 'I am interested in a custom GrainHero solution. Please contact me to discuss my specific requirements and pricing options.'
            }))
        }
    }, [planType])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSubmitting(true)
        setMessage(null)

        try {
            const response = await fetch('/api/contact', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            })

            if (response.ok) {
                setMessage('Thank you for your message! We will get back to you within 24 hours.')
                setFormData({
                    name: '',
                    email: '',
                    phone: '',
                    company: '',
                    message: ''
                })

                // Redirect to thank you page or back to main site after 3 seconds
                setRedirectCountdown(3)
                const countdown = setInterval(() => {
                    setRedirectCountdown(prev => {
                        if (prev && prev > 1) {
                            return prev - 1
                        } else {
                            clearInterval(countdown)
                            window.location.href = '/'
                            return null
                        }
                    })
                }, 1000)
            } else {
                setMessage('Failed to send message. Please try again or contact us directly.')
            }
        } catch {
            setMessage('Network error. Please try again later.')
        }

        setIsSubmitting(false)
    }

    return (
        <div className="min-h-screen bg-white">
            {/* Hero Section */}
            <div className="bg-gradient-to-r from-[#effbf7] to-white text-black py-16 border-b">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative">
                    <div className="flex justify-start mb-6">
                        <Link href="/" className="inline-flex items-center gap-2 text-gray-600 hover:text-[#00a63e] transition-colors font-medium">
                            <ArrowLeft className="h-5 w-5" />
                            <span>Back to Home</span>
                        </Link>
                    </div>
                    <div className="text-center">
                        <div className="flex justify-center mb-6">
                            <div className="bg-[#00a63e]/10 rounded-full p-4">
                                <WheatIcon className="h-12 w-12 text-[#00a63e]" />
                            </div>
                        </div>
                        <h1 className="text-4xl md:text-5xl font-bold mb-6">
                            {planType === 'custom' ? 'Custom Solution Inquiry' : 'Contact Us'}
                        </h1>
                        <p className="text-xl md:text-2xl text-gray-700 max-w-4xl mx-auto leading-relaxed">
                            {planType === 'custom'
                                ? "Let's discuss your custom grain management solution requirements and create the perfect solution for your business"
                                : 'Get in touch with our team for support, questions, or partnership opportunities'
                            }
                        </p>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="py-16 -mt-8 relative z-10">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Contact Form */}
                        <div className="lg:col-span-2">
                            <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
                                <CardHeader className="bg-gradient-to-r from-[#effbf7] to-white border-b">
                                    <CardTitle className="text-2xl font-bold text-gray-900">Send us a message</CardTitle>
                                    <CardDescription className="text-gray-600 text-lg">
                                        Fill out the form below and we&apos;ll get back to you within 24 hours.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <form onSubmit={handleSubmit} className="space-y-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <Label htmlFor="name" className="text-sm font-semibold text-gray-700">Full Name *</Label>
                                                <Input
                                                    id="name"
                                                    value={formData.name}
                                                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                                    placeholder="Your full name"
                                                    className="border-gray-300 focus:border-green-500 focus:ring-green-500 h-12"
                                                    required
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="email" className="text-sm font-semibold text-gray-700">Email Address *</Label>
                                                <Input
                                                    id="email"
                                                    type="email"
                                                    value={formData.email}
                                                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                                                    placeholder="your.email@example.com"
                                                    className="border-gray-300 focus:border-green-500 focus:ring-green-500 h-12"
                                                    required
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <Label htmlFor="phone" className="text-sm font-semibold text-gray-700">Phone Number</Label>
                                                <Input
                                                    id="phone"
                                                    type="tel"
                                                    value={formData.phone}
                                                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                                                    placeholder="+1 (555) 123-4567"
                                                    className="border-gray-300 focus:border-green-500 focus:ring-green-500 h-12"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="company" className="text-sm font-semibold text-gray-700">Company/Farm Name</Label>
                                                <Input
                                                    id="company"
                                                    value={formData.company}
                                                    onChange={(e) => setFormData(prev => ({ ...prev, company: e.target.value }))}
                                                    placeholder="Your company or farm name"
                                                    className="border-gray-300 focus:border-green-500 focus:ring-green-500 h-12"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="message" className="text-sm font-semibold text-gray-700">Message *</Label>
                                            <Textarea
                                                id="message"
                                                value={formData.message}
                                                onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                                                placeholder="Tell us about your requirements, questions, or how we can help you..."
                                                rows={6}
                                                className="border-gray-300 focus:border-green-500 focus:ring-green-500 resize-none"
                                                required
                                            />
                                        </div>

                                        {message && (
                                            <div className={`text-sm rounded-md p-4 flex items-center gap-2 ${message.includes('Thank you')
                                                ? 'text-green-600 bg-green-50 border border-green-200'
                                                : 'text-red-600 bg-red-50 border border-red-200'
                                                }`}>
                                                {message.includes('Thank you') ? (
                                                    <CheckCircle className="h-5 w-5 flex-shrink-0" />
                                                ) : (
                                                    <AlertCircle className="h-5 w-5 flex-shrink-0" />
                                                )}
                                                <div>
                                                    <p className="font-medium">{message}</p>
                                                    {redirectCountdown && (
                                                        <p className="text-xs text-green-500 mt-1">
                                                            Redirecting to homepage in {redirectCountdown} seconds...
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        <Button
                                            type="submit"
                                            disabled={isSubmitting || !formData.name || !formData.email || !formData.message}
                                            className="w-full bg-[#00a63e] hover:bg-[#029238] text-white font-semibold py-3 px-6 text-lg shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {isSubmitting ? (
                                                <div className="flex items-center gap-2">
                                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                    Sending Message...
                                                </div>
                                            ) : (
                                                'Send Message'
                                            )}
                                        </Button>
                                    </form>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Contact Information */}
                        <div className="space-y-6">
                            <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
                                <CardHeader className="bg-gradient-to-r from-blue-50 to-green-50 border-b">
                                    <CardTitle className="text-xl font-bold text-gray-900">Get in Touch</CardTitle>
                                    <CardDescription className="text-gray-600">
                                        We&apos;re here to help with your grain management needs.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6 p-6">
                                    <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                                        <div className="bg-green-100 p-2 rounded-full">
                                            <Mail className="h-5 w-5 text-green-600" />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-gray-900">Email</p>
                                            <p className="text-sm text-gray-600">noreply.grainhero1@gmail.com</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                                        <div className="bg-green-100 p-2 rounded-full">
                                            <Phone className="h-5 w-5 text-green-600" />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-gray-900">Phone</p>
                                            <p className="text-sm text-gray-600">03110851784</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                                        <div className="bg-green-100 p-2 rounded-full">
                                            <MapPin className="h-5 w-5 text-green-600" />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-gray-900">Response Time</p>
                                            <p className="text-sm text-gray-600">Within 24 hours</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {planType === 'custom' && (
                                <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
                                    <CardHeader className="bg-gradient-to-r from-purple-50 to-green-50 border-b">
                                        <CardTitle className="text-xl font-bold text-gray-900">Custom Solutions</CardTitle>
                                        <CardDescription className="text-gray-600">
                                            Tailored grain management solutions for your specific needs.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="p-6">
                                        <div className="grid grid-cols-1 gap-4">
                                            {[
                                                'On-premise deployment options',
                                                'Custom feature development',
                                                'Integration with existing systems',
                                                'Industry-specific modules',
                                                'Dedicated support team',
                                                'Flexible pricing models'
                                            ].map((feature, index) => (
                                                <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                                                    <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0"></div>
                                                    <span className="text-sm font-medium text-gray-700">{feature}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
