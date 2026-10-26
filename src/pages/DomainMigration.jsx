import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Server,
  CheckCircle2,
  AlertCircle,
  Copy,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';

export const DomainMigration = () => {
  const { token } = useAuth();
  const [checklist, setChecklist] = useState([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchChecklist();
  }, []);

  const fetchChecklist = async () => {
    try {
      const res = await fetch('/api/webhooks/domain-migration-checklist');
      if (res.ok) {
        const data = await res.json();
        setChecklist(data.steps || []);
      }
    } catch (err) {
      console.error('Error loading domain migration checklist:', err);
    }
  };

  const currentWebhookUrl = `${window.location.origin}/api/webhooks/noah`;

  const copyWebhookUrl = () => {
    navigator.clipboard.writeText(currentWebhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <h1 className="text-2xl font-extrabold text-slate-900">
          Webhooks & Domain Migration Infrastructure
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Cryptographically signed webhook ingestion & domain migration checklist
        </p>
      </div>

      {/* Webhook Configuration Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <h3 className="text-base font-bold text-slate-900">
          Inbound Noah Webhook Endpoint
        </h3>

        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700">Webhook Processing Endpoint URL</span>
            <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">
              ECDSA SHA-384 Verified
            </span>
          </div>

          <div className="flex items-center justify-between bg-white p-3 rounded-lg border border-slate-200">
            <span className="font-mono text-xs text-slate-900 font-bold break-all">
              {currentWebhookUrl}
            </span>
            <button
              onClick={copyWebhookUrl}
              className="p-1.5 text-slate-500 hover:text-blue-600 font-semibold text-xs flex items-center space-x-1 ml-2"
            >
              {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>

          <div className="text-xs text-slate-600 space-y-1">
            <p>• Verified with <strong>NOAH_WEBHOOK_PUBLIC_KEY</strong> (ECDSA SHA-384 signature in `Webhook-Signature` header).</p>
            <p>• Idempotency enforced via <strong>EventVersion</strong> tracking in local SQLite database.</p>
            <p>• Subscribed events: <code>Customer</code>, <code>FiatDeposit</code>, <code>Transaction</code>.</p>
          </div>
        </div>
      </div>

      {/* Migration Checklist */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <h3 className="text-base font-bold text-slate-900">
          Domain Migration Step-by-Step Checklist
        </h3>

        <div className="space-y-3">
          {checklist.map((item) => (
            <div key={item.step} className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-start space-x-4">
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-xs flex-shrink-0 mt-0.5">
                {item.step}
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-sm">{item.action}</h4>
                <p className="text-xs text-slate-600 mt-1">{item.details}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
