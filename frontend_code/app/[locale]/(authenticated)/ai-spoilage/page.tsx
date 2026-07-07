import { redirect } from 'next/navigation'

export default async function AISpoilagePage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params
    redirect(`/${locale}/ai-predictions`)
}
