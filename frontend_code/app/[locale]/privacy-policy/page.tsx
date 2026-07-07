'use client'

import { Wheat as WheatIcon } from 'lucide-react'

export default function PrivacyPolicyPage({ params: _params }: { params: Promise<{ locale: string }> }) {
    const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'noreply.grainhero1@gmail.com'
    return (
        <main className="min-h-screen bg-white text-black">
            <section className="pt-28 pb-10 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-[#effbf7] to-white border-b">
                <div className="max-w-5xl mx-auto text-center">
                    <div className="flex justify-center mb-4">
                        <div className="bg-[#00a63e]/10 rounded-full p-3">
                            <WheatIcon className="h-10 w-10 text-[#00a63e]" />
                        </div>
                    </div>
                    <h1 className="text-4xl md:text-6xl font-bold mb-4">Privacy Policy</h1>
                    <p className="text-lg text-gray-700">Your data privacy matters to us.</p>
                </div>
            </section>
            <section className="py-16 px-4 sm:px-6 lg:px-8">
                <div className="max-w-3xl mx-auto space-y-6 text-gray-700">
                    <p>
                        GrainHero collects account information (name, email, phone), operational data related to grain storage,
                        and telemetry from connected devices to provide our services. We use this information solely to deliver,
                        secure, and improve the platform.
                    </p>
                    <p>
                        Data in transit is protected with TLS and stored encrypted at rest. Access is role-based and auditable.
                        We do not sell personal data. We may share information with service providers strictly to operate the
                        service (e.g., email, payments), under confidentiality agreements.
                    </p>
                    <p>
                        You can request access, correction, export, or deletion of your personal data by contacting
                        {` ${supportEmail} `} or calling 03110851784. We will respond within applicable legal timeframes.
                    </p>
                    <p>
                        We use cookies for authentication and session management. By using GrainHero, you consent to this policy.
                        Changes to this policy will be posted on this page with an updated date.
                    </p>
                    <p className="text-sm text-gray-500 text-center">Last updated: {new Date().toLocaleDateString()}</p>
                </div>
            </section>
        </main>
    )
}


