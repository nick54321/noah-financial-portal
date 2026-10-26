import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  CreditCard,
  Copy,
  CheckCircle2,
  FileText,
  AlertCircle,
  PlusCircle,
  ExternalLink,
  ShieldCheck,
  Building,
} from 'lucide-react';

export const IBANAccounts = () => {
  const { user, entitlements, token } = useAuth();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [provisioning, setProvisioning] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [copiedField, setCopiedField] = useState('');
  const [accountLetter, setAccountLetter] = useState(null);

  const fetchAccounts = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/accounts', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAccounts(data.accounts || []);
      }
    } catch (err) {
      console.error('Error loading accounts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchAccounts();
  }, [token]);

  const copyToClipboard = (text, field) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(''), 2000);
  };

  const provisionAccount = async (currency) => {
    setProvisioning(true);
    setError('');
    setSuccessMsg('');

    try {
      const res = await fetch('/api/accounts/provision', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ currency }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Provisioning failed');

      setSuccessMsg(data.message || `${currency} virtual IBAN account provisioned successfully!`);
      await fetchAccounts();
    } catch (err) {
      setError(err.message);
    } finally {
      setProvisioning(false);
    }
  };

  const fetchAccountLetter = async (accountId) => {
    try {
      const res = await fetch(`/api/accounts/${accountId}/letter`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAccountLetter(data.letter);
      }
    } catch (err) {
      console.error('Error fetching account letter:', err);
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">
            EUR & USD Virtual IBAN Accounts
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Provisioned bank accounts powered by Noah underlying banking infrastructure
          </p>
        </div>

        <div className="flex space-x-3">
          <button
            onClick={() => provisionAccount('EUR')}
            disabled={provisioning || !entitlements?.eur}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow transition-all disabled:opacity-50 flex items-center space-x-1.5"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Provision EUR IBAN</span>
          </button>

          <button
            onClick={() => provisionAccount('USD')}
            disabled={provisioning || !entitlements?.usd}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow transition-all disabled:opacity-50 flex items-center space-x-1.5"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Provision USD Account</span>
          </button>
        </div>
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

      {/* Account List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {accounts.map((acc) => (
          <div
            key={acc.id}
            className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between"
          >
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                    {acc.currency}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">
                      {acc.currency} Virtual IBAN
                    </h3>
                    <p className="text-xs text-slate-500">{acc.bank_name}</p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                  Active
                </span>
              </div>

              {/* Payment Instructions / Details */}
              <div className="space-y-3 text-xs bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Beneficiary Name</span>
                  <span className="font-semibold text-slate-800">{acc.beneficiary_name}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">
                    {acc.currency === 'EUR' ? 'IBAN Account Number' : 'Account Number'}
                  </span>
                  <div className="flex items-center space-x-1.5">
                    <span className="font-mono font-bold text-slate-900">{acc.account_number}</span>
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
                  <span className="text-slate-500 font-medium">
                    {acc.currency === 'EUR' ? 'BIC / SWIFT' : 'ACH / Routing Number'}
                  </span>
                  <div className="flex items-center space-x-1.5">
                    <span className="font-mono text-slate-800">{acc.routing_number}</span>
                    <button
                      onClick={() => copyToClipboard(acc.routing_number, `rout_${acc.id}`)}
                      className="p-1 text-slate-400 hover:text-blue-600"
                    >
                      {copiedField === `rout_${acc.id}` ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Supported Network</span>
                  <span className="font-semibold text-slate-800">
                    {acc.currency === 'EUR' ? 'SEPA / SEPA Instant' : 'Fedwire / ACH'}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <button
                onClick={() => fetchAccountLetter(acc.id)}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center space-x-1"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>View Bank Verification Letter</span>
              </button>
              <span className="text-[11px] text-slate-400">Auto-settled to Crypto Wallet</span>
            </div>
          </div>
        ))}
      </div>

      {/* Account Verification Modal */}
      {accountLetter && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="font-bold text-slate-900 text-lg flex items-center">
                <Building className="w-5 h-5 text-blue-600 mr-2" />
                Official Bank Verification
              </h3>
              <button
                onClick={() => setAccountLetter(null)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
              <p className="font-bold text-slate-800 text-sm">Account Verification Summary</p>
              <p><span className="text-slate-500">Holder:</span> {accountLetter.account_holder}</p>
              <p><span className="text-slate-500">Bank Name:</span> {accountLetter.bank_name}</p>
              <p><span className="text-slate-500">Account Number:</span> {accountLetter.account_number}</p>
              <p><span className="text-slate-500">Routing/BIC:</span> {accountLetter.routing_number}</p>
              <p><span className="text-slate-500">Issued Date:</span> {new Date(accountLetter.issued_at).toLocaleDateString()}</p>
              <div className="mt-3 p-2 bg-emerald-50 text-emerald-800 font-semibold rounded border border-emerald-200 text-center">
                {accountLetter.verification_status}
              </div>
            </div>

            <button
              onClick={() => setAccountLetter(null)}
              className="w-full py-2.5 bg-slate-800 text-white rounded-xl text-xs font-bold hover:bg-slate-900"
            >
              Close Verification
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
