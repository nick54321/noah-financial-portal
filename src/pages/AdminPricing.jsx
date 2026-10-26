import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Settings,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  Users,
  Award,
} from 'lucide-react';

export const AdminPricing = () => {
  const { token } = useAuth();
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editingPlan, setEditingPlan] = useState(null);
  const [newPrice, setNewPrice] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    fetchOverview();
  }, []);

  const fetchOverview = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/subscriptions/admin/overview', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setOverview(data);
      }
    } catch (err) {
      console.error('Error fetching admin overview:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePrice = async (e) => {
    e.preventDefault();
    if (!editingPlan) return;
    setError('');
    setSuccessMsg('');

    try {
      const res = await fetch('/api/subscriptions/admin/pricing', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          plan_type: editingPlan.plan_type,
          price_usd: parseFloat(newPrice),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update pricing');

      setSuccessMsg(`Successfully updated price for ${editingPlan.plan_type}`);
      setEditingPlan(null);
      await fetchOverview();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <h1 className="text-2xl font-extrabold text-slate-900">
          Platform Administration & Subscription Pricing
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Manage retail pricing, inspect active subscriber entitlements & revenue reports
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

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <span className="text-xs font-semibold text-slate-500 uppercase">
            Total Active Subscription Revenue
          </span>
          <div className="text-3xl font-black text-slate-900">
            ${overview?.totalRevenue?.toFixed(2) || '0.00'} USD
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <span className="text-xs font-semibold text-slate-500 uppercase">
            Active Paid Subscribers
          </span>
          <div className="text-3xl font-black text-slate-900">
            {overview?.activeSubCount || 0} Users
          </div>
        </div>
      </div>

      {/* Plan Price Management */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <h3 className="text-base font-bold text-slate-900">
          Configure Retail Plan Pricing
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {overview?.plansConfig?.map((plan) => (
            <div key={plan.plan_type} className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-900 text-sm">{plan.name}</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                  {plan.plan_type}
                </span>
              </div>
              <div className="text-2xl font-black text-slate-900">
                ${plan.price_usd} <span className="text-xs font-semibold text-slate-500">/ year</span>
              </div>
              <button
                onClick={() => {
                  setEditingPlan(plan);
                  setNewPrice(String(plan.price_usd));
                }}
                className="w-full py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl"
              >
                Edit Retail Price
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Subscriptions Audit List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-200">
          <h3 className="text-base font-bold text-slate-900">
            All Subscription Transactions & Audit Log
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-6 py-3">User</th>
                <th className="px-6 py-3">Plan</th>
                <th className="px-6 py-3">Price Paid</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Tx Ref</th>
                <th className="px-6 py-3">Expiration</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-700">
              {overview?.subscriptions?.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-slate-500">
                    No active subscriptions recorded yet.
                  </td>
                </tr>
              ) : (
                overview?.subscriptions?.map((sub) => (
                  <tr key={sub.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-bold text-slate-900">
                      {sub.full_name || sub.email}
                    </td>
                    <td className="px-6 py-4 font-semibold text-blue-600">
                      {sub.plan_type}
                    </td>
                    <td className="px-6 py-4 font-mono font-bold">
                      ${sub.price_usd.toFixed(2)}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold capitalize">
                        {sub.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono text-slate-500">
                      {sub.transaction_ref}
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      {new Date(sub.expiration_date).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal */}
      {editingPlan && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="font-bold text-slate-900 text-lg">Edit Plan Pricing — {editingPlan.name}</h3>
            <form onSubmit={handleUpdatePrice} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Price (USD)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={newPrice}
                  onChange={(e) => setNewPrice(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border rounded-xl font-bold font-mono text-sm"
                />
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingPlan(null)}
                  className="w-full py-2.5 bg-slate-100 font-bold text-slate-700 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-full py-2.5 bg-blue-600 font-bold text-white rounded-xl"
                >
                  Save New Price
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
