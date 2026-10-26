import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Award,
  Check,
  CreditCard,
  ShieldCheck,
  AlertCircle,
  Sparkles,
  Zap,
} from 'lucide-react';

export const Subscriptions = () => {
  const { user, entitlements, activeSubscriptions, token, refreshUser } = useAuth();
  const [plans, setPlans] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState('COMBO');
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Form states for dummy card checkout
  const [cardNumber, setCardNumber] = useState('4242 •••• •••• 4242');
  const [cardExpiry, setCardExpiry] = useState('12/28');
  const [cardCvc, setCardCvc] = useState('123');

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const res = await fetch('/api/subscriptions/plans');
      if (res.ok) {
        const data = await res.json();
        setPlans(data.plans || []);
      }
    } catch (err) {
      console.error('Error fetching plans:', err);
    }
  };

  const handleCheckout = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
      const res = await fetch('/api/subscriptions/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          plan_type: selectedPlan,
          payment_method: paymentMethod,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Checkout failed');
      }

      setSuccessMsg(data.message || 'Subscription successfully activated!');
      await refreshUser();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Top Header */}
      <div className="bg-slate-900 text-white rounded-3xl p-8 shadow-xl relative overflow-hidden">
        <div className="relative z-10 max-w-2xl space-y-3">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
            <Award className="w-3.5 h-3.5 mr-1.5 text-blue-400" /> Subscription Access Management
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight">
            Noah IBAN Subscription Paywall
          </h1>
          <p className="text-slate-300 text-sm leading-relaxed">
            All Noah virtual IBAN banking services are protected by an annual subscription. Purchase an eligible currency plan to unlock provisioned bank accounts, pay-ins, global payouts, and conversions.
          </p>
        </div>
      </div>

      {/* Current Subscription Entitlement Summary */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <h3 className="text-base font-bold text-slate-900">
          Your Current Active Entitlements
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className={`p-4 rounded-xl border ${entitlements?.usd ? 'bg-emerald-50/50 border-emerald-300' : 'bg-slate-50 border-slate-200'}`}>
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-slate-800">USD IBAN Services</span>
              {entitlements?.usd ? (
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 flex items-center">
                  <Check className="w-3 h-3 mr-1" /> Active
                </span>
              ) : (
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-200 text-slate-600">
                  Locked
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-2">
              {entitlements?.usd ? 'Full access to USD virtual bank accounts and ACH/Wire transfers.' : 'Requires $75/year USD Plan or $150 Combo.'}
            </p>
          </div>

          <div className={`p-4 rounded-xl border ${entitlements?.eur ? 'bg-emerald-50/50 border-emerald-300' : 'bg-slate-50 border-slate-200'}`}>
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-slate-800">EUR IBAN Services</span>
              {entitlements?.eur ? (
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 flex items-center">
                  <Check className="w-3 h-3 mr-1" /> Active
                </span>
              ) : (
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-200 text-slate-600">
                  Locked
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-2">
              {entitlements?.eur ? 'Full access to EUR SEPA virtual IBAN accounts and transfers.' : 'Requires $75/year EUR Plan or $150 Combo.'}
            </p>
          </div>

          <div className={`p-4 rounded-xl border ${entitlements?.combo ? 'bg-emerald-50/50 border-emerald-300' : 'bg-slate-50 border-slate-200'}`}>
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-slate-800">USD + EUR Combo Coverage</span>
              {entitlements?.combo ? (
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 flex items-center">
                  <Check className="w-3 h-3 mr-1" /> Active
                </span>
              ) : (
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-200 text-slate-600">
                  Not Upgrade
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-2">
              {entitlements?.combo ? 'Unlimited dual-currency USD and EUR IBAN banking capabilities.' : 'Upgrade to Combo for full coverage.'}
            </p>
          </div>
        </div>
      </div>

      {/* Pricing Cards Grid */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900">
          Select Subscription Plan
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* USD IBAN Plan */}
          <div
            onClick={() => setSelectedPlan('USD')}
            className={`cursor-pointer rounded-2xl p-6 border-2 transition-all relative flex flex-col justify-between ${
              selectedPlan === 'USD'
                ? 'border-blue-600 bg-blue-50/30 shadow-lg'
                : 'border-slate-200 bg-white hover:border-slate-300'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Single Currency</span>
                {selectedPlan === 'USD' && (
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs">✓</span>
                )}
              </div>
              <h3 className="text-xl font-extrabold text-slate-900">USD IBAN</h3>
              <div className="mt-2 flex items-baseline">
                <span className="text-4xl font-black text-slate-900">$75</span>
                <span className="text-slate-500 text-sm font-semibold ml-1">/ year</span>
              </div>
              <p className="text-xs text-slate-600 mt-3">
                Full provisioned USD ACH & Wire virtual bank account details with crypto settlement.
              </p>

              <ul className="mt-6 space-y-2.5 text-xs text-slate-700">
                <li className="flex items-center"><Check className="w-4 h-4 text-emerald-600 mr-2" /> USD Virtual Account Provisioning</li>
                <li className="flex items-center"><Check className="w-4 h-4 text-emerald-600 mr-2" /> Unlimited Incoming ACH / Wire Pay-ins</li>
                <li className="flex items-center"><Check className="w-4 h-4 text-emerald-600 mr-2" /> Automated Fiat-to-Crypto Onramp</li>
                <li className="flex items-center"><Check className="w-4 h-4 text-emerald-600 mr-2" /> USD Payout Rails</li>
              </ul>
            </div>

            <button
              onClick={() => setSelectedPlan('USD')}
              className={`mt-8 w-full py-2.5 rounded-xl font-bold text-xs transition-colors ${
                selectedPlan === 'USD' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {selectedPlan === 'USD' ? 'Selected Plan' : 'Select USD Plan'}
            </button>
          </div>

          {/* EUR IBAN Plan */}
          <div
            onClick={() => setSelectedPlan('EUR')}
            className={`cursor-pointer rounded-2xl p-6 border-2 transition-all relative flex flex-col justify-between ${
              selectedPlan === 'EUR'
                ? 'border-indigo-600 bg-indigo-50/30 shadow-lg'
                : 'border-slate-200 bg-white hover:border-slate-300'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Single Currency</span>
                {selectedPlan === 'EUR' && (
                  <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs">✓</span>
                )}
              </div>
              <h3 className="text-xl font-extrabold text-slate-900">EUR IBAN</h3>
              <div className="mt-2 flex items-baseline">
                <span className="text-4xl font-black text-slate-900">$75</span>
                <span className="text-slate-500 text-sm font-semibold ml-1">/ year</span>
              </div>
              <p className="text-xs text-slate-600 mt-3">
                Dedicated European SEPA virtual IBAN account for European fiat banking and payouts.
              </p>

              <ul className="mt-6 space-y-2.5 text-xs text-slate-700">
                <li className="flex items-center"><Check className="w-4 h-4 text-emerald-600 mr-2" /> EUR SEPA IBAN Provisioning</li>
                <li className="flex items-center"><Check className="w-4 h-4 text-emerald-600 mr-2" /> Unlimited Incoming SEPA Direct Pay-ins</li>
                <li className="flex items-center"><Check className="w-4 h-4 text-emerald-600 mr-2" /> Instant SEPA EUR-to-Crypto Settlement</li>
                <li className="flex items-center"><Check className="w-4 h-4 text-emerald-600 mr-2" /> European Payout Channels</li>
              </ul>
            </div>

            <button
              onClick={() => setSelectedPlan('EUR')}
              className={`mt-8 w-full py-2.5 rounded-xl font-bold text-xs transition-colors ${
                selectedPlan === 'EUR' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {selectedPlan === 'EUR' ? 'Selected Plan' : 'Select EUR Plan'}
            </button>
          </div>

          {/* USD + EUR Combo Plan */}
          <div
            onClick={() => setSelectedPlan('COMBO')}
            className={`cursor-pointer rounded-2xl p-6 border-2 transition-all relative flex flex-col justify-between ${
              selectedPlan === 'COMBO'
                ? 'border-emerald-600 bg-emerald-50/30 shadow-xl ring-2 ring-emerald-500/20'
                : 'border-slate-200 bg-white hover:border-slate-300'
            }`}
          >
            <div className="absolute -top-3.5 right-6 bg-emerald-600 text-white font-extrabold text-[10px] uppercase tracking-wider px-3 py-1 rounded-full shadow-md flex items-center">
              <Sparkles className="w-3 h-3 mr-1" /> Best Value Combo
            </div>

            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">Dual Currency Combo</span>
                {selectedPlan === 'COMBO' && (
                  <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs">✓</span>
                )}
              </div>
              <h3 className="text-xl font-extrabold text-slate-900">USD + EUR Combo</h3>
              <div className="mt-2 flex items-baseline">
                <span className="text-4xl font-black text-slate-900">$150</span>
                <span className="text-slate-500 text-sm font-semibold ml-1">/ year</span>
              </div>
              <p className="text-xs text-slate-600 mt-3">
                Complete dual-currency package unlocking both USD and EUR IBAN virtual accounts simultaneously.
              </p>

              <ul className="mt-6 space-y-2.5 text-xs text-slate-700">
                <li className="flex items-center font-bold text-emerald-800"><Check className="w-4 h-4 text-emerald-600 mr-2" /> Both USD & EUR Virtual Accounts</li>
                <li className="flex items-center"><Check className="w-4 h-4 text-emerald-600 mr-2" /> ACH, Wire & SEPA Payment Rails</li>
                <li className="flex items-center"><Check className="w-4 h-4 text-emerald-600 mr-2" /> Priority Onboarding & Settlement</li>
                <li className="flex items-center"><Check className="w-4 h-4 text-emerald-600 mr-2" /> Upgrade Discount Auto-applied ($75 off if 1 plan already active)</li>
              </ul>
            </div>

            <button
              onClick={() => setSelectedPlan('COMBO')}
              className={`mt-8 w-full py-2.5 rounded-xl font-bold text-xs transition-colors ${
                selectedPlan === 'COMBO' ? 'bg-emerald-600 text-white shadow-md' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {selectedPlan === 'COMBO' ? 'Selected Plan' : 'Select Combo Plan'}
            </button>
          </div>
        </div>
      </div>

      {/* Checkout Form Card */}
      <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm max-w-2xl mx-auto space-y-6">
        <div className="border-b border-slate-200 pb-4">
          <h3 className="text-lg font-bold text-slate-900">
            Checkout — {selectedPlan === 'COMBO' ? 'USD + EUR Combo ($150/yr)' : `${selectedPlan} IBAN Plan ($75/yr)`}
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Authoritative server-side payment verification. Instant entitlement activation upon completion.
          </p>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center">
            <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center">
            <Check className="w-4 h-4 mr-2 flex-shrink-0 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleCheckout} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1.5">
              Cardholder Details
            </label>
            <input
              type="text"
              required
              defaultValue={user?.full_name || 'Valued Customer'}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1.5">
              Card Number
            </label>
            <div className="relative">
              <input
                type="text"
                required
                value={cardNumber}
                onChange={(e) => setCardNumber(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <CreditCard className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1.5">
                Expiry Date
              </label>
              <input
                type="text"
                required
                value={cardExpiry}
                onChange={(e) => setCardExpiry(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1.5">
                CVC / CVV
              </label>
              <input
                type="text"
                required
                value={cardCvc}
                onChange={(e) => setCardCvc(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg transition-all text-sm flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>
              {loading
                ? 'Processing Payment...'
                : `Pay $${selectedPlan === 'COMBO' ? '150.00' : '75.00'} USD & Activate Entitlement`}
            </span>
          </button>
        </form>
      </div>
    </div>
  );
};
