"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useTranslations } from 'next-intl';

interface Alert {
  title: string;
  category: string;
  location: string;
  description: string;
}

function AlertForm({ onSubmit, loading }: { onSubmit: (data: Alert) => void, loading: boolean }) {
  const t = useTranslations('AlertsNewPage');
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");

  return (
    <form
      className="space-y-4"
      onSubmit={e => {
        e.preventDefault();
        onSubmit({ title, category, location, description });
      }}
    >
      <div>
        <label className="block font-medium">{t('title')}</label>
        <input className="w-full border rounded px-2 py-1" value={title} onChange={e => setTitle(e.target.value)} required />
      </div>
      <div>
        <label className="block font-medium">{t('category')}</label>
        <input className="w-full border rounded px-2 py-1" value={category} onChange={e => setCategory(e.target.value)} required />
      </div>
      <div>
        <label className="block font-medium">{t('location')}</label>
        <input className="w-full border rounded px-2 py-1" value={location} onChange={e => setLocation(e.target.value)} required />
      </div>
      <div>
        <label className="block font-medium">{t('description')}</label>
        <textarea className="w-full border rounded px-2 py-1" value={description} onChange={e => setDescription(e.target.value)} required />
      </div>
      <Button type="submit" disabled={loading}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t('addAlert')}
      </Button>
    </form>
  );
}

export default function NewAlertPage({ params: _params }: { params: Promise<{ locale: string }> }) {
  const t = useTranslations('AlertsNewPage');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleCreate = (data: Alert) => {
    setLoading(true);
    setError(null);
    const token = typeof window !== 'undefined' ? localStorage.getItem("token") : null;
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';
    fetch(`${backendUrl}/alerts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify(data),
    })
      .then(async (res) => {
        if (!res.ok) {
          await res.json().catch(() => ({}));
          throw new Error(t('errorFailedCreate'));
        }
        return res.json();
      })
      .then(() => {
        router.push("/alerts");
      })
      .catch(() => {
        setError(t('errorCreatingAlert'));
        setLoading(false);
      });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Link href="/alerts">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('backToAlerts')}
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('addNewAlert')}</h1>
          <p className="text-gray-600">{t('createNewAlertRecord')}</p>
        </div>
      </div>
      <Card className="w-full">
        <CardHeader>
          <CardTitle>{t('alertInformation')}</CardTitle>
          <CardDescription>{t('fillRequiredInfo')}</CardDescription>
        </CardHeader>
        <CardContent>
          {error && <div className="text-red-500 mb-2">{error}</div>}
          <AlertForm onSubmit={handleCreate} loading={loading} />
        </CardContent>
      </Card>
    </div>
  );
} 