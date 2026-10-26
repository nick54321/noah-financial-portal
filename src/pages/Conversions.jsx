import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  ArrowLeftRight,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  TrendingUp,
  RefreshCw,
  Wallet,
} from 'lucide-react';

export const Conversions = () => {
  const { user, token } = useAuth();
  const [prices, setPrices] = useState([]);
  const [mode, setMode] = useState('onramp'); // 'onramp' or 'offramp'
  const [fiatCurrency, setFiatCurrency] = useState('EUR');
  const [cryptoCurrency, setCryptoCurrency] = useState('USDC');
  const [destinationAddress, setDestinationAddress] = useState(user?.wallet_address || '');
  const [loadingSession, setLoadingSession] = useState(false);
  const [sessionResult, setSessionResult] = useState(null);
  const [error, setError] = useState('');
  const [conversionsHistory, setConversionsHistory] = useState([]);

  useEffect(() => {
    if (token) {
      loadPrices();
      loadHistory();
    }
  }, [token]);

  const loadPrices = async () => {
    try {
      const res = await fetch('/api/conversions/prices');
      if (res.ok) {
        const data = await res.json();
        setPrices(data.Items || []);
      }
    } catch (err) {
      console.error('Error loading prices:', err);
    }
  };

  const loadHistory = async () => {
    try {
      const res = await fetch('/api/conversions/history', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setConversionsHistory(data.transactions || []);
      }
    } catch (err) {
      console.error('Error loading conversion history:', err);
    }
  };

  const handleCreateSession = async (e) => {
    e.preventDefault();
    setLoadingSession(true);
    setError('');
    setSessionResult(null);

    const endpoint = mode === 'onramp' ? '/api/conversions/onramp/session' : '/api/conversions/offramp/session';

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          fiat_currency: fiatCurrency,
          crypto_currency: cryptoCurrency,
          destination_address: destinationAddress,
          return_url: `${window.location.origin}/conversions?status=complete`,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create conversion session');

      setSessionResult(data);
      await loadHistory();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingSession(false);
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">
            Fiat-to-Crypto On-Ramp & Off-Ramp
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Noah hosted checkout sessions for direct bank deposit conversions
          </p>
        </div>

        <button
          onClick={loadPrices}
          className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-all flex items-center space-x-1"
        >
          <RefreshCw className="w-3.5 h-3.5 mr-1" />
          <span>Refresh Live Rates</span>
        </button>
      </div>

      {/* Live Market Exchange Rates Carousel */}
      <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-xl space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center">
            <TrendingUp className="w-3.5 h-3.5 mr-1.5 text-blue-400" /> Live Exchange Quotes
          </span>
          <span className="text-[11px] text-slate-500">Updated Real-Time</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          {prices.map((p, idx) => (
            <div key={idx} className="p-3 bg-slate-800/80 rounded-xl border border-slate-700 text-center">
              <span className="text-[10px] font-bold text-slate-400 block">
                {p.CryptoCurrency} / {p.FiatCurrency}
              </span>
              <span className="text-sm font-extrabold text-emerald-400 font-mono mt-1 block">
                {p.Price}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Main Conversion Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          {/* Mode Switcher */}
          <div className="flex p-1 bg-slate-100 rounded-xl text-xs font-bold">
            <button
              onClick={() => { setMode('onramp'); setSessionResult(null); }}
              className={`flex-1 py-2.5 rounded-lg transition-all ${
                mode === 'onramp' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              On-Ramp (Bank EUR/USD &rarr; Crypto)
            </button>
            <button
              onClick={() => { setMode('offramp'); setSessionResult(null); }}
              className={`flex-1 py-2.5 rounded-lg transition-all ${
                mode === 'offramp' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Off-Ramp (Crypto &rarr; Bank EUR/USD)
            </button>
          </div>

          {error && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center">
              <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleCreateSession} className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Fiat Currency
                </label>
                <select
                  value={fiatCurrency}
                  onChange={(e) => setFiatCurrency(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                >
                  <option value="EUR">EUR (€)</option>
                  <option value="USD">USD ($)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Crypto Currency
                </label>
                <select
                  value={cryptoCurrency}
                  onChange={(e) => setCryptoCurrency(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                >
                  <option value="USDC">USDC (USD Coin)</option>
                  <option value="USDT">USDT (Tether)</option>
                  <option value="BTC">BTC (Bitcoin)</option>
                </select>
              </div>
            </div>

            {mode === 'onramp' && (
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Destination Crypto Address
                </label>
                <input
                  type="text"
                  required
                  value={destinationAddress}
                  onChange={(e) => setDestinationAddress(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                  placeholder="0x..."
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loadingSession}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md text-sm flex items-center justify-center space-x-2"
            >
              <ArrowLeftRight className="w-4 h-4" />
              <span>{loadingSession ? 'Generating Session...' : `Create ${mode === 'onramp' ? 'On-Ramp' : 'Off-Ramp'} Checkout Session`}</span>
            </button>
          </form>

          {/* Session Result Redirect Card */}
          {sessionResult && (
            <div className="p-5 rounded-2xl bg-blue-50 border border-blue-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-blue-900 text-sm">
                  Hosted Checkout Session Ready
                </span>
                <span className="text-xs text-blue-700 font-semibold">
                  Session ID: {sessionResult.session_id}
                </span>
              </div>

              {sessionResult.deposit_address && (
                <div className="p-3 bg-white rounded-xl border border-blue-200 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-500">Deposit Address:</span>
                  <p className="font-mono font-bold text-xs text-slate-900 break-all">{sessionResult.deposit_address}</p>
                </div>
              )}

              <a
                href={sessionResult.checkout_url || '#'}
                target="_blank"
                rel="noreferrer"
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center justify-center space-x-2 shadow"
              >
                <span>Launch Noah Hosted Checkout</span>
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          )}
        </div>

        {/* History Table */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-base font-bold text-slate-900">
            Conversion History
          </h3>

          <div className="space-y-3">
            {conversionsHistory.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">
                No past conversion sessions recorded.
              </p>
            ) : (
              conversionsHistory.map((tx) => (
                <div key={tx.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-900 uppercase">{tx.type}</span>
                    <span className="capitalize text-emerald-600 font-semibold">{tx.status}</span>
                  </div>
                  <p className="text-slate-500 font-mono">
                    {tx.from_currency} &rarr; {tx.to_currency}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
