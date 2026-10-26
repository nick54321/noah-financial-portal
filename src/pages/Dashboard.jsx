import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  CreditCard,
  Send,
  ArrowLeftRight,
  ShieldCheck,
  Award,
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  Copy,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';

export const Dashboard = () => {
  const { user, entitlements, token } = useAuth();
  const [balances, setBalances] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copiedField, setCopiedField] = useState('');

  const copyToClipboard = (text, field) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(''), 2000);
  };

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // 1. Fetch live Noah Balances
      const balRes = await fetch('/api/conversions/prices', {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Fetch accounts
      const accRes = await fetch('/api/accounts', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (accRes.ok) {
        const accData = await accRes.json();
        setAccounts(accData.accounts || []);
      }

      // Fetch recent payouts/transactions
      const txRes = await fetch('/api/payouts/history', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (txRes.ok) {
        const txData = await txRes.json();
        setRecentTransactions(txData.transactions || []);
      }
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      loadDashboardData();
    }
  }, [token]);

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner / Onboarding Status */}
      {user?.noah_onboarding_status !== 'approved' && (
        <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/30 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start space-x-3.5">
            <div className="p-2.5 bg-amber-500/20 text-amber-600 rounded-xl mt-0.5">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">
                Identity Verification (KYC) Required
              </h3>
              <p className="text-sm text-slate-600 mt-0.5">
                Complete Noah hosted KYC onboarding to unlock EUR & USD virtual IBAN accounts and financial rails.
              </p>
            </div>
          </div>
          <Link
            to="/onboarding"
            className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-sm rounded-xl shadow-md transition-all whitespace-nowrap"
          >
            Start Verification
          </Link>
        </div>
      )}

      {/* Subscription Status Banner */}
      {!entitlements?.usd && !entitlements?.eur && (
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-2xl p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-1">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-white/20 text-white mb-2">
              <Award className="w-3.5 h-3.5 mr-1" /> IBAN Subscription Paywall
            </span>
            <h2 className="text-xl font-bold">
              Unlock Official USD & EUR IBAN Banking Services
            </h2>
            <p className="text-blue-100 text-sm max-w-2xl">
              Choose an annual IBAN plan starting at $75/year or $150/year combo to get provisioned bank accounts, direct pay-ins, and global payouts.
            </p>
          </div>
          <Link
            to="/subscriptions"
            className="px-6 py-3 bg-white text-blue-700 hover:bg-blue-50 font-bold text-sm rounded-xl shadow-lg transition-all whitespace-nowrap"
          >
            View Subscription Plans
          </Link>
        </div>
      )}

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">
              USD IBAN Status
            </span>
            <CreditCard className="w-5 h-5 text-blue-600" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-900">
              {entitlements?.usd ? 'Active' : 'Locked'}
            </span>
            {entitlements?.usd ? (
              <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                Enabled
              </span>
            ) : (
              <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                $75/year
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500">
            {entitlements?.usd
              ? 'Provisioned USD virtual account available'
              : 'Requires USD or Combo Subscription'}
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">
              EUR IBAN Status
            </span>
            <CreditCard className="w-5 h-5 text-indigo-600" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-900">
              {entitlements?.eur ? 'Active' : 'Locked'}
            </span>
            {entitlements?.eur ? (
              <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                Enabled
              </span>
            ) : (
              <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                $75/year
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500">
            {entitlements?.eur
              ? 'Provisioned SEPA EUR IBAN available'
              : 'Requires EUR or Combo Subscription'}
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Connected Wallet
            </span>
            <Wallet className="w-5 h-5 text-amber-500" />
          </div>
          <div className="text-lg font-bold text-slate-900 truncate">
            {user?.wallet_address
              ? `${user.wallet_address.slice(0, 6)}...${user.wallet_address.slice(-4)}`
              : 'Not Connected'}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 capitalize">
              {user?.wallet_type || 'None'}
            </span>
            <Link
              to="/wallet"
              className="text-xs font-semibold text-blue-600 hover:text-blue-800"
            >
              Manage Wallet &rarr;
            </Link>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">
              KYC Status
            </span>
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="text-lg font-bold text-slate-900 capitalize">
            {user?.noah_onboarding_status || 'Not Started'}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500">Noah Hosted KYC</span>
            <Link
              to="/onboarding"
              className="text-xs font-semibold text-blue-600 hover:text-blue-800"
            >
              Details &rarr;
            </Link>
          </div>
        </div>
      </div>

      {/* Primary Services Quick Actions */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <h3 className="text-base font-bold text-slate-900">
          Financial Services Hub
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Link
            to="/accounts"
            className="flex flex-col items-center justify-center p-4 rounded-xl bg-slate-50 border border-slate-200 hover:bg-blue-50 hover:border-blue-300 transition-all text-center group"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-600/10 text-blue-600 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <CreditCard className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-800">
              Virtual IBANs
            </span>
            <span className="text-[11px] text-slate-500">
              Pay-in Details
            </span>
          </Link>

          <Link
            to="/payouts"
            className="flex flex-col items-center justify-center p-4 rounded-xl bg-slate-50 border border-slate-200 hover:bg-blue-50 hover:border-blue-300 transition-all text-center group"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-600/10 text-emerald-600 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <Send className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-800">
              Global Payouts
            </span>
            <span className="text-[11px] text-slate-500">
              Send Bank Transfers
            </span>
          </Link>

          <Link
            to="/conversions"
            className="flex flex-col items-center justify-center p-4 rounded-xl bg-slate-50 border border-slate-200 hover:bg-blue-50 hover:border-blue-300 transition-all text-center group"
          >
            <div className="w-10 h-10 rounded-xl bg-indigo-600/10 text-indigo-600 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <ArrowLeftRight className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-800">
              On-Ramp / Off-Ramp
            </span>
            <span className="text-[11px] text-slate-500">
              Fiat-Crypto Swaps
            </span>
          </Link>

          <Link
            to="/subscriptions"
            className="flex flex-col items-center justify-center p-4 rounded-xl bg-slate-50 border border-slate-200 hover:bg-blue-50 hover:border-blue-300 transition-all text-center group"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-600/10 text-amber-600 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <Award className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-800">
              Subscription Plans
            </span>
            <span className="text-[11px] text-slate-500">
              Upgrade & Pricing
            </span>
          </Link>
        </div>
      </div>

      {/* Active Accounts Overview */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900">
            Provisioned Banking IBAN Details
          </h3>
          <Link
            to="/accounts"
            className="text-xs font-semibold text-blue-600 hover:text-blue-800"
          >
            Provision / Manage Accounts &rarr;
          </Link>
        </div>

        {accounts.length === 0 ? (
          <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-300">
            <CreditCard className="w-10 h-10 text-slate-400 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">
              No IBAN Accounts Provisioned Yet
            </p>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Purchase an eligible subscription plan and complete KYC verification to provision EUR or USD IBAN virtual bank accounts.
            </p>
            <div className="mt-4 flex justify-center space-x-3">
              <Link
                to="/subscriptions"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700"
              >
                Choose Subscription Plan
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {accounts.map((acc) => (
              <div
                key={acc.id}
                className="p-5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3 relative"
              >
                <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                  <span className="text-sm font-bold text-slate-900 flex items-center">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 mr-2" />
                    {acc.currency} IBAN Account ({acc.bank_name})
                  </span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                    Active
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Beneficiary Name:</span>
                    <span className="font-medium text-slate-800">{acc.beneficiary_name}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Account Number / IBAN:</span>
                    <div className="flex items-center space-x-1">
                      <span className="font-mono text-slate-900 font-semibold">{acc.account_number}</span>
                      <button
                        onClick={() => copyToClipboard(acc.account_number, `acc_${acc.id}`)}
                        className="p-1 text-slate-400 hover:text-blue-600"
                      >
                        {copiedField === `acc_${acc.id}` ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">BIC / Routing:</span>
                    <span className="font-mono text-slate-800">{acc.routing_number}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Activity Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900">
            Recent Activity & Transactions
          </h3>
          <button
            onClick={loadDashboardData}
            className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg border border-slate-200 hover:bg-slate-50"
            title="Refresh Transactions"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-6 py-3">Type</th>
                <th className="px-6 py-3">From</th>
                <th className="px-6 py-3">To</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-700">
              {recentTransactions.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-slate-500">
                    No recent transaction activity recorded.
                  </td>
                </tr>
              ) : (
                recentTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-900 capitalize flex items-center space-x-2">
                      {tx.type === 'payout' ? (
                        <ArrowUpRight className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <ArrowDownLeft className="w-4 h-4 text-blue-600" />
                      )}
                      <span>{tx.type}</span>
                    </td>
                    <td className="px-6 py-4 font-mono font-semibold">
                      {tx.from_amount} {tx.from_currency}
                    </td>
                    <td className="px-6 py-4 font-mono font-semibold">
                      {tx.to_amount} {tx.to_currency}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full font-semibold capitalize ${
                          tx.status === 'settled' || tx.status === 'completed'
                            ? 'bg-emerald-100 text-emerald-800'
                            : tx.status === 'pending'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {tx.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      {new Date(tx.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
