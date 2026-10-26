import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Wallet,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';

export const WalletSettings = () => {
  const { user, connectMetaMask, connectPrivy } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleConnectMetaMask = async () => {
    setLoading(true);
    setError('');
    setSuccessMsg('');
    try {
      await connectMetaMask();
      setSuccessMsg('MetaMask wallet successfully linked to your account!');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleConnectPrivy = async () => {
    setLoading(true);
    setError('');
    setSuccessMsg('');
    try {
      await connectPrivy();
      setSuccessMsg('In-app Privy embedded wallet successfully created & linked!');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <h1 className="text-2xl font-extrabold text-slate-900">
          Wallet Connection & Authentication
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Link a Web3 wallet (MetaMask or In-App Privy) to your Noah customer account
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
          <CheckCircle2 className="w-4 h-4 mr-2 flex-shrink-0 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Active Wallet Overview */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <h3 className="text-base font-bold text-slate-900">
          Currently Linked Wallet
        </h3>

        {user?.wallet_address ? (
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase text-slate-500">
                Wallet Type: <span className="text-blue-600">{user.wallet_type}</span>
              </span>
              <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold flex items-center">
                <CheckCircle2 className="w-3 h-3 mr-1" /> Verified Address
              </span>
            </div>
            <div className="p-3 bg-white rounded-xl border border-slate-200">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Address</span>
              <span className="font-mono text-sm font-bold text-slate-900 break-all">{user.wallet_address}</span>
            </div>
          </div>
        ) : (
          <div className="p-5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs">
            No Web3 wallet linked yet. Choose an option below to connect a wallet.
          </div>
        )}
      </div>

      {/* Wallet Options Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Option 1: MetaMask */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <Wallet className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-900 text-lg">Option 1: Connect MetaMask</h3>
            <p className="text-slate-500 text-xs leading-relaxed">
              For users with an existing browser or mobile MetaMask wallet. Connects via cryptographic EIP-191 message signature verification.
            </p>
          </div>

          <button
            onClick={handleConnectMetaMask}
            disabled={loading}
            className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-xs shadow transition-all"
          >
            {loading ? 'Connecting...' : 'Connect MetaMask Wallet'}
          </button>
        </div>

        {/* Option 2: Privy In-App Wallet */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-900 text-lg">Option 2: In-App Privy Wallet</h3>
            <p className="text-slate-500 text-xs leading-relaxed">
              Integrated embedded wallet powered by Privy infrastructure. Automatically provisions an in-app non-custodial wallet.
            </p>
          </div>

          <button
            onClick={handleConnectPrivy}
            disabled={loading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow transition-all"
          >
            {loading ? 'Creating...' : 'Create / Connect Privy Wallet'}
          </button>
        </div>
      </div>
    </div>
  );
};
