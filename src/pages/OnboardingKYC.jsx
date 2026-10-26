import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  ShieldCheck,
  UserCheck,
  AlertTriangle,
  ExternalLink,
  RefreshCw,
  Clock,
  CheckCircle2,
} from 'lucide-react';

export const OnboardingKYC = () => {
  const { user, token, refreshUser } = useAuth();
  const [kycStatus, setKycStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [onboardingUrl, setOnboardingUrl] = useState(null);

  // Prefill Form Fields
  const [firstName, setFirstName] = useState(user?.full_name?.split(' ')[0] || '');
  const [lastName, setLastName] = useState(user?.full_name?.split(' ')[1] || '');
  const [dob, setDob] = useState('1995-05-15');
  const [street, setStreet] = useState('123 Financial Way');
  const [city, setCity] = useState('Manama');
  const [state, setState] = useState('Capital');
  const [country, setCountry] = useState('BH');
  const [idNumber, setIdNumber] = useState('987654321');

  useEffect(() => {
    if (token) fetchStatus();
  }, [token]);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/onboarding/status', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setKycStatus(data);
      }
    } catch (err) {
      console.error('Error fetching KYC status:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStartOnboarding = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setOnboardingUrl(null);

    try {
      const res = await fetch('/api/onboarding/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          first_name: firstName,
          last_name: lastName,
          date_of_birth: dob,
          street,
          city,
          state,
          country,
          id_number: idNumber,
          return_url: `${window.location.origin}/onboarding?status=returned`,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to start onboarding');

      setOnboardingUrl(data.onboarding_url);
      await refreshUser();
      await fetchStatus();
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
            Identity Verification & Hosted KYC
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Noah Standard Model Hosted Identity Verification & Onboarding Flow
          </p>
        </div>

        <button
          onClick={fetchStatus}
          className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-all flex items-center space-x-1"
        >
          <RefreshCw className="w-3.5 h-3.5 mr-1" />
          <span>Refresh Live Status</span>
        </button>
      </div>

      {/* KYC Status Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <h3 className="text-base font-bold text-slate-900">
          Verification Overview
        </h3>

        {user?.noah_onboarding_status === 'approved' ? (
          <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center space-x-4">
            <div className="p-3 bg-emerald-100 text-emerald-700 rounded-xl">
              <UserCheck className="w-8 h-8" />
            </div>
            <div>
              <h4 className="font-bold text-emerald-900 text-base">Identity Verified & Approved</h4>
              <p className="text-xs text-emerald-700 mt-0.5">
                Noah customer record ID: {user?.noah_customer_id}. You are fully eligible to provision EUR & USD virtual IBAN accounts.
              </p>
            </div>
          </div>
        ) : user?.noah_onboarding_status === 'pending' ? (
          <div className="p-5 rounded-2xl bg-amber-50 border border-amber-200 flex items-center space-x-4">
            <div className="p-3 bg-amber-100 text-amber-700 rounded-xl">
              <Clock className="w-8 h-8" />
            </div>
            <div>
              <h4 className="font-bold text-amber-900 text-base">Verification In Progress</h4>
              <p className="text-xs text-amber-700 mt-0.5">
                Your onboarding submission is currently under review by Noah compliance team.
              </p>
            </div>
          </div>
        ) : (
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center space-x-4">
            <div className="p-3 bg-slate-200 text-slate-700 rounded-xl">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-base">Verification Not Started</h4>
              <p className="text-xs text-slate-600 mt-0.5">
                Fill out the prefill details below and launch the Noah hosted KYC flow.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Onboarding Form */}
      <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm max-w-2xl mx-auto space-y-6">
        <h3 className="text-lg font-bold text-slate-900 border-b pb-3">
          Prefill & Initiate Hosted Onboarding
        </h3>

        {error && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center">
            <AlertTriangle className="w-4 h-4 mr-2 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleStartOnboarding} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">First Name</label>
              <input
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Last Name</label>
              <input
                type="text"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Date of Birth</label>
              <input
                type="date"
                required
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">National ID / Passport #</label>
              <input
                type="text"
                required
                value={idNumber}
                onChange={(e) => setIdNumber(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Street Address</label>
            <input
              type="text"
              required
              value={street}
              onChange={(e) => setStreet(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">City</label>
              <input
                type="text"
                required
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">State</label>
              <input
                type="text"
                required
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Country Code</label>
              <input
                type="text"
                required
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold uppercase"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md text-sm flex items-center justify-center space-x-2"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>{submitting ? 'Generating Session...' : 'Prefill & Launch Noah Hosted KYC'}</span>
          </button>
        </form>

        {onboardingUrl && (
          <div className="p-5 rounded-2xl bg-blue-50 border border-blue-200 space-y-3">
            <span className="font-bold text-blue-900 text-sm block">
              Hosted Session Created
            </span>
            <a
              href={onboardingUrl}
              target="_blank"
              rel="noreferrer"
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center justify-center space-x-2 shadow"
            >
              <span>Proceed to Noah KYC Verification Flow</span>
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        )}
      </div>
    </div>
  );
};
