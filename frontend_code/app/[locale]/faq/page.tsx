'use client'

import { Wheat as WheatIcon, ArrowLeft } from 'lucide-react'
import { Link } from '@/i18n/navigation'

export default function FAQPage({ params: _params }: { params: Promise<{ locale: string }> }) {
    const faqs = [
        {
            q: 'How does GrainHero prevent grain spoilage?',
            a: 'We continuously track temperature, humidity, CO₂ and other signals from IoT sensors. Our AI models forecast risk windows and trigger proactive alerts and recommended actions before quality is compromised.'
        },
        {
            q: 'Do you work with different storage types?',
            a: 'Yes. GrainHero supports silos, bins, flat warehouses and mixed facilities. Configuration is flexible and scales from small farms to multi-site commercial operations.'
        },
        {
            q: 'What is included in traceability?',
            a: 'Each batch receives a unique QR identity. Movements, treatments, quality checks and dispatches are logged to provide full batch history from intake to delivery.'
        },
        {
            q: 'Is my data secure?',
            a: 'We use TLS encryption in transit and encrypted storage at rest. Access is role-based and audit-logged. We never share your data without explicit consent.'
        },
        {
            q: 'How fast can we get started?',
            a: 'Typical onboarding takes 24–48 hours. You can monitor immediately; AI insights improve continuously as your data grows.'
        }
    ]

    return (
        <main className="min-h-screen bg-white text-black">
            <section className="pt-28 pb-10 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-[#effbf7] to-white border-b">
                <div className="max-w-5xl mx-auto text-center relative">
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
                    <h1 className="text-4xl md:text-6xl font-bold mb-4">Frequently Asked Questions</h1>
                    <p className="text-lg text-gray-700">Everything you need to know about GrainHero&apos;s grain storage management.</p>
                </div>
            </section>
            <section className="py-16 px-4 sm:px-6 lg:px-8">
                <div className="max-w-3xl mx-auto space-y-4">
                    {faqs.map((item, i) => (
                        <details key={i} className="bg-white rounded-2xl border border-[#00a63e]/20 p-6 hover:shadow-md transition-shadow">
                            <summary className="cursor-pointer text-lg font-semibold select-none">{item.q}</summary>
                            <p className="mt-3 text-gray-700 leading-relaxed">{item.a}</p>
                        </details>
                    ))}
                    <div className="text-center pt-6">
                        <Link href="/contact" className="inline-block bg-[#00a63e] text-white px-6 py-3 rounded-full font-semibold hover:bg-[#029238] transition-colors">Still have questions? Contact us</Link>
                    </div>
                </div>
            </section>
        </main>
    )
}


