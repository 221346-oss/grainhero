'use client'

import { useState } from 'react'
import pricingData from '../pricing-data.js'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/i18n/navigation'
import { Wheat as WheatIcon, Check, Cpu, ArrowLeft } from 'lucide-react'
import { Link } from '@/i18n/navigation'

export default function PricingPage({ params: _params }: { params: Promise<{ locale: string }> }) {
  // We don't strictly need to await params here if we don't use locale, 
  // but it's good practice and satisfies Next.js 15 types.
  const t = useTranslations('PricingPage')
  const router = useRouter()
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(pricingData[1]?.id ?? pricingData[0]?.id ?? null)

  const handleChoosePlan = (planId: string) => {
    if (planId === 'custom') {
      router.push('/contact?plan=custom')
    } else {
      try {
        localStorage.setItem('selectedPlanId', planId)
      } catch (e) {
        console.error('Failed to save plan selection:', e)
      }
      router.push('/checkout')
    }
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section - Matching Contact/About/FAQ pages */}
      <section className="pt-28 pb-14 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-[#effbf7] to-white border-b">
        <div className="max-w-6xl mx-auto text-center relative">
          <div className="flex justify-start mb-6">
            <Link href="/" className="inline-flex items-center gap-2 text-gray-600 hover:text-[#00a63e] transition-colors font-medium">
              <ArrowLeft className="h-5 w-5" />
              <span>Back to Home</span>
            </Link>
          </div>
          <div className="flex justify-center mb-4">
            <div className="bg-[#00a63e]/10 rounded-full p-3">
              <WheatIcon className="h-10 w-10 text-[#00a63e]" />
            </div>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold mb-4">
            {t('title', { defaultMessage: 'Pricing Plans' })}
          </h1>
          <p className="text-lg text-gray-700 max-w-3xl mx-auto">
            {t('subtitle', { defaultMessage: 'Choose the plan that fits your farm best. All prices in PKR.' })}
          </p>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-[#effbf7]">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-wrap justify-center gap-6">
            {pricingData.map((plan) => {
              const priceText = plan.priceFrontend ?? `Rs. ${plan.price?.toLocaleString()}${plan.duration ?? ''}`
              const isSelected = selectedPlanId === plan.id
              return (
                <div
                  key={plan.id}
                  className={`cursor-pointer text-left rounded-2xl bg-white border p-6 shadow-sm transition-all duration-300 transform hover:-translate-y-1 hover:scale-[1.03] w-full max-w-sm ${isSelected
                    ? 'border-[#00a63e] ring-2 ring-[#00a63e]/20'
                    : 'border-gray-200 hover:border-[#00a63e]/60'
                    }`}
                  onClick={() => setSelectedPlanId(plan.id)}
                >
                  {plan.popular && (
                    <div className="mb-3 text-xs font-semibold text-white inline-block bg-[#00a63e] px-3 py-1 rounded-full">
                      Most Popular
                    </div>
                  )}
                  <h4 className="text-xl font-semibold">{plan.name}</h4>
                  <p className="text-3xl font-bold mt-2 text-[#00a63e]">{priceText}</p>
                  <p className="text-sm text-gray-600 mt-2 mb-2">{plan.description}</p>

                  {/* IoT One-Time Charge */}
                  {plan.iotChargeLabel && (
                    <div className="flex items-center gap-1.5 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5 mb-4">
                      <Cpu className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>{plan.iotChargeLabel}</span>
                    </div>
                  )}

                  <ul className="mt-4 space-y-2 text-sm text-gray-700">
                    {plan.features.map((feature: string, idx: number) => (
                      <li key={idx} className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-[#00a63e] flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      if (plan.id === 'custom') {
                        // Use link if present, or push to contact
                        const p = plan as { link?: string };
                        if (p.link && p.link.startsWith('mailto')) {
                          window.location.href = p.link
                        } else {
                          handleChoosePlan(plan.id)
                        }
                      } else {
                        handleChoosePlan(plan.id)
                      }
                    }}
                    className={`mt-6 w-full text-center py-2.5 rounded-full font-semibold transition ${isSelected
                      ? 'bg-[#00a63e] text-white hover:bg-[#029238]'
                      : 'border border-gray-300 hover:border-[#00a63e] hover:text-[#00a63e]'
                      }`}
                  >
                    {plan.id === 'custom'
                      ? t('contactUs', { defaultMessage: 'Contact Us' })
                      : t('choosePlan', { defaultMessage: 'Choose Plan' })}
                  </button>
                </div>
              )
            })}
          </div>

          {/* IoT Note */}
          <div className="mt-10 text-center">
            <div className="inline-flex items-center gap-2 bg-white border border-gray-200 rounded-full px-6 py-3 shadow-sm">
              <Cpu className="w-5 h-5 text-amber-600" />
              <span className="text-sm text-gray-700">
                All plans include a <strong className="text-amber-700">one-time IoT hardware setup fee of Rs. 7,000</strong>
              </span>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
} 