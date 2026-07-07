"use client";
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

export default function NotAllowedPage() {
  const router = useRouter();
  const t = useTranslations('PricingPage');
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-green-50 to-blue-50 px-4">
      <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
        <h1 className="text-2xl font-bold mb-4 text-red-600">{t('notAllowedTitle', { defaultMessage: 'Access Restricted' })}</h1>
        <p className="mb-6 text-gray-700">{t('notAllowedMessage', { defaultMessage: 'Your current plan does not allow access to this page. Please upgrade your plan to unlock more features.' })}</p>
        <Button className="w-full mb-2" onClick={() => router.push('/plans')}>
          {t('choosePlan', { defaultMessage: 'Choose Plan' })}
        </Button>
        <Button variant="outline" className="w-full" onClick={() => router.push('/dashboard')}>
          {t('goToDashboard', { defaultMessage: 'Go to Dashboard' })}
        </Button>
      </div>
    </div>
  );
} 