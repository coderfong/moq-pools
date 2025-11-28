'use client';

import { useState } from 'react';

export default function AlibabaAuthManualPage() {
  const [authCode, setAuthCode] = useState('');
  const [status, setStatus] = useState('');
  const [tokenData, setTokenData] = useState<any>(null);

  const appKey = process.env.NEXT_PUBLIC_ALIBABA_APP_KEY || '501706';
  const redirectUri = process.env.NEXT_PUBLIC_ALIBABA_REDIRECT_URI || 'https://4e91dbcb57e9.ngrok-free.app/api/alibaba/callback';
  
  const authUrl = `https://auth.alibaba.com/oauth/authorize?client_id=${appKey}&site=alibaba&redirect_uri=${encodeURIComponent(redirectUri)}&state=manual_auth`;

  const exchangeCode = async () => {
    if (!authCode.trim()) {
      setStatus('Please enter an authorization code');
      return;
    }

    setStatus('Exchanging code for token...');
    try {
      const response = await fetch('/api/alibaba/callback?code=' + authCode + '&state=manual_auth');
      const data = await response.json();
      
      if (data.error) {
        setStatus(`Error: ${data.error}`);
      } else {
        setStatus('✅ Success! Token obtained');
        setTokenData(data);
      }
    } catch (error: any) {
      setStatus(`Error: ${error.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Alibaba OAuth - Manual Authorization</h1>
        
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Step 1: Authorize</h2>
          <p className="text-gray-600 mb-4">
            Click this link to authorize with Alibaba. You may need to accept the SSL certificate warning:
          </p>
          <a
            href={authUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block bg-orange-500 text-white px-6 py-3 rounded-lg hover:bg-orange-600 transition"
          >
            Authorize with Alibaba →
          </a>
          <p className="text-sm text-gray-500 mt-4">
            After authorizing, you'll be redirected back. Copy the <code className="bg-gray-100 px-2 py-1 rounded">code</code> parameter from the URL.
          </p>
        </div>

        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Step 2: Enter Authorization Code</h2>
          <p className="text-gray-600 mb-4">
            Paste the authorization code from the callback URL:
          </p>
          <input
            type="text"
            value={authCode}
            onChange={(e) => setAuthCode(e.target.value)}
            placeholder="e.g., abc123def456..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          />
          <button
            onClick={exchangeCode}
            className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition"
          >
            Exchange Code for Token
          </button>
          
          {status && (
            <div className={`mt-4 p-4 rounded-lg ${status.startsWith('✅') ? 'bg-green-100 text-green-800' : status.startsWith('Error') ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}`}>
              {status}
            </div>
          )}
        </div>

        {tokenData && (
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Token Data</h2>
            <pre className="bg-gray-100 p-4 rounded-lg overflow-auto text-sm">
              {JSON.stringify(tokenData, null, 2)}
            </pre>
          </div>
        )}

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h3 className="font-semibold text-yellow-800 mb-2">Troubleshooting SSL Certificate Warning</h3>
          <p className="text-yellow-700 text-sm mb-2">If you see "Your connection is not private":</p>
          <ol className="list-decimal list-inside text-yellow-700 text-sm space-y-1">
            <li>Click "Advanced" or "Show Details"</li>
            <li>Click "Proceed to auth.alibaba.com (unsafe)"</li>
            <li>This is safe - it's Alibaba's official auth server</li>
            <li>The SSL issue is due to regional certificate chains</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
