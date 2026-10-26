import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Send,
  UserPlus,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  DollarSign,
  Building,
  RefreshCw,
  Clock,
} from 'lucide-react';

export const Payouts = () => {
  const { user, token } = useAuth();
  const [channels, setChannels] = useState([]);
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [beneficiaries, setBeneficiaries] = useState([]);
  const [selectedBeneficiary, setSelectedBeneficiary] = useState('');
  const [payoutsHistory, setPayoutsHistory] = useState([]);

  // Form states
  const [currency, setCurrency] = useState('EUR');
  const [amount, setAmount] = useState('100');
  const [quote, setQuote] = useState(null);
  const [loadingChannels, setLoadingChannels] = useState(false);
  const [loadingQuote, setLoadingQuote] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Add beneficiary modal
  const [showAddBeneficiary, setShowAddBeneficiary] = useState(false);
  const [benName, setBenName] = useState('');
  const [benAccount, setBenAccount] = useState('');
  const [benRouting, setBenRouting] = useState('');
  const [benBank, setBenBank] = useState('');

  useEffect(() => {
    if (token) {
      loadChannels();
      loadBeneficiaries();
      loadPayoutHistory();
    }
  }, [token, currency]);

  const loadChannels = async () => {
    setLoadingChannels(true);
    try {
      const res = await fetch(`/api/payouts/channels?fiat_currency=${currency}&crypto_currency=USDC`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setChannels(data.channels || []);
        if (data.channels && data.channels.length > 0) {
          setSelectedChannel(data.channels[0]);
        }
      }
    } catch (err) {
      console.error('Error loading payout channels:', err);
    } finally {
      setLoadingChannels(false);
    }
  };

  const loadBeneficiaries = async () => {
    try {
      const res = await fetch('/api/payouts/beneficiaries', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setBeneficiaries(data.beneficiaries || []);
      }
    } catch (err) {
      console.error('Error loading beneficiaries:', err);
    }
  };

  const loadPayoutHistory = async () => {
    try {
      const res = await fetch('/api/payouts/history', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setPayoutsHistory(data.transactions || []);
      }
    } catch (err) {
      console.error('Error loading payout history:', err);
    }
  };

  const fetchQuote = async () => {
    if (!selectedChannel) return;
    setLoadingQuote(true);
    setError('');
    try {
      const res = await fetch('/api/payouts/quote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          channel_id: selectedChannel.ID,
          fiat_currency: currency,
          fiat_amount: amount,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch quote');
      setQuote(data.quote);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingQuote(false);
    }
  };

  const handleAddBeneficiary = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/payouts/beneficiaries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: benName,
          currency,
          account_identifier: benAccount,
          routing_identifier: benRouting,
          bank_name: benBank,
        }),
      });
      if (res.ok) {
        setShowAddBeneficiary(false);
        setBenName('');
        setBenAccount('');
        setBenRouting('');
        setBenBank('');
        await loadBeneficiaries();
      }
    } catch (err) {
      console.error('Add beneficiary error:', err);
    }
  };

  const handleInitiatePayout = async (e) => {
    e.preventDefault();
    if (!selectedChannel) return;

    setSubmitting(true);
    setError('');
    setSuccessMsg('');

    try {
      const res = await fetch('/api/payouts/initiate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          channel_id: selectedChannel.ID,
          fiat_currency: currency,
          fiat_amount: amount,
          beneficiary_id: selectedBeneficiary,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Payout initiation failed');

      setSuccessMsg(data.message || 'Payout initiated successfully!');
      await loadPayoutHistory();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">
            Global Bank Payouts
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Convert crypto and disburse local bank transfers worldwide
          </p>
        </div>

        <button
          onClick={() => setShowAddBeneficiary(true)}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow transition-all flex items-center space-x-1.5"
        >
          <UserPlus className="w-4 h-4" />
          <span>Add Beneficiary</span>
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center">
          <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center">
          <CheckCircle2 className="w-4 h-4 mr-2 flex-shrink-0 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Form: Initiate Payout */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <h3 className="text-base font-bold text-slate-900">
            Payout Details
          </h3>

          <form onSubmit={handleInitiatePayout} className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Payout Currency
                </label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-bold focus:outline-none"
                >
                  <option value="EUR">EUR (€) - SEPA Transfer</option>
                  <option value="USD">USD ($) - ACH / Wire Transfer</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Payout Amount
                </label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-mono font-bold focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Select Beneficiary
              </label>
              <select
                value={selectedBeneficiary}
                onChange={(e) => setSelectedBeneficiary(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-semibold focus:outline-none"
              >
                <option value="">-- Choose Existing Beneficiary --</option>
                {beneficiaries.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.bank_name || 'Bank'} - {b.account_identifier})
                  </option>
                ))}
              </select>
            </div>

            {/* Payout Channel Info */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-700">Dynamic Payout Channel</span>
                <button
                  type="button"
                  onClick={fetchQuote}
                  disabled={loadingQuote}
                  className="text-blue-600 font-bold text-[11px] hover:underline flex items-center space-x-1"
                >
                  <RefreshCw className="w-3 h-3 mr-1" /> Get Live Quote
                </button>
              </div>
              <p className="text-slate-500 text-[11px]">
                Channels are fetched dynamically at runtime from Noah API endpoints based on destination country and currency.
              </p>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md transition-all text-sm flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>{submitting ? 'Initiating Payout...' : 'Confirm & Execute Payout'}</span>
            </button>
          </form>
        </div>

        {/* Right Panel: Beneficiaries Brief */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-base font-bold text-slate-900">
            Saved Beneficiaries
          </h3>

          <div className="space-y-3">
            {beneficiaries.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">
                No saved beneficiaries. Click "Add Beneficiary" above to create one.
              </p>
            ) : (
              beneficiaries.map((b) => (
                <div key={b.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                  <p className="font-bold text-slate-900">{b.name}</p>
                  <p className="text-slate-500 font-mono">{b.bank_name} • {b.account_identifier}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Add Beneficiary Modal */}
      {showAddBeneficiary && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="font-bold text-slate-900 text-lg">Add New Beneficiary</h3>
            <form onSubmit={handleAddBeneficiary} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Beneficiary Name</label>
                <input
                  type="text"
                  required
                  value={benName}
                  onChange={(e) => setBenName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl"
                  placeholder="Acme Corp / Jane Doe"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Account Identifier (IBAN / Account Number)</label>
                <input
                  type="text"
                  required
                  value={benAccount}
                  onChange={(e) => setBenAccount(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl font-mono"
                  placeholder="DE89370400440532013000"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Routing / BIC Code</label>
                <input
                  type="text"
                  value={benRouting}
                  onChange={(e) => setBenRouting(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl font-mono"
                  placeholder="BYLADEM1001"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Bank Name</label>
                <input
                  type="text"
                  value={benBank}
                  onChange={(e) => setBenBank(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl"
                  placeholder="Deutsche Bank"
                />
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddBeneficiary(false)}
                  className="w-full py-2 bg-slate-100 font-bold text-slate-700 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-full py-2 bg-blue-600 font-bold text-white rounded-xl"
                >
                  Save Beneficiary
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
