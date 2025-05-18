'use client'

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { GEMINI_API_KEY } from '@/config/geminiConfig';

interface GeminiConfigFormProps {
  onApiKeySet: (key: string) => void;
  error?: string | null;
}

/**
 * Komponen informasi tentang konfigurasi Gemini API
 * Memanfaatkan API key dari environment variables
 */
const GeminiConfigForm: React.FC<GeminiConfigFormProps> = ({ onApiKeySet, error }) => {
  const [apiKeyStatus, setApiKeyStatus] = useState<'available' | 'unavailable'>('unavailable');
  
  useEffect(() => {
    // Periksa apakah API key tersedia dari environment variables
    if (GEMINI_API_KEY) {
      setApiKeyStatus('available');
      onApiKeySet(GEMINI_API_KEY);
    } else {
      setApiKeyStatus('unavailable');
    }
  }, [onApiKeySet]);
  
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Konfigurasi Google Gemini API</CardTitle>
        <CardDescription>
          Status konfigurasi API key untuk fitur ekstraksi ayat dari gambar
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {apiKeyStatus === 'available' ? (
          <Alert variant="success" className="bg-green-50 text-green-700 border-green-200">
            <AlertDescription>
              Gemini API key telah dikonfigurasi dan siap digunakan. API key diambil dari variabel lingkungan NEXT_PUBLIC_GEMINI_API_KEY di file .env.
            </AlertDescription>
          </Alert>
        ) : (
          <Alert variant="warning" className="bg-amber-50 text-amber-700 border-amber-200">
            <AlertDescription>
              Gemini API key belum dikonfigurasi. Harap tambahkan NEXT_PUBLIC_GEMINI_API_KEY ke file .env Anda untuk mengaktifkan fitur ekstraksi ayat dari gambar.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

export default GeminiConfigForm; 