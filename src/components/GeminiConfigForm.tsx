'use client'

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { GEMINI_API_KEY } from '@/config/geminiConfig';

interface GeminiConfigFormProps {
  onApiKeySet: (key: string) => void;
  error?: string | null;
}

const GeminiConfigForm: React.FC<GeminiConfigFormProps> = ({ onApiKeySet, error }) => {
  const [apiKey, setApiKey] = useState<string>('');
  
  useEffect(() => {
    // Initialize with any existing key from localStorage
    const savedKey = localStorage.getItem('gemini_api_key');
    if (savedKey) {
      setApiKey(savedKey);
    }
  }, []);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (apiKey.trim()) {
      // Save to localStorage
      localStorage.setItem('gemini_api_key', apiKey.trim());
      
      // Notify parent component
      onApiKeySet(apiKey.trim());
    }
  };
  
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Google Gemini API Configuration</CardTitle>
        <CardDescription>
          To use the image verse extraction feature, you need to provide your Google Gemini API key.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-md mb-4 text-sm">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="apiKey">Google Gemini API Key</Label>
            <Input
              id="apiKey"
              type="text"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter your Google Gemini API key"
              className="font-mono"
            />
            <p className="text-xs text-gray-500">
              You can get a Gemini API key from the{' '}
              <a 
                href="https://ai.google.dev/get-api-key" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                Google AI Studio
              </a>
            </p>
          </div>
          
          <Button type="submit" disabled={!apiKey.trim()}>
            Save API Key
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default GeminiConfigForm; 