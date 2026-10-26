const express = require('express');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');

const router = express.Router();

let NOAH_WEBHOOK_PUBLIC_KEY = process.env.NOAH_WEBHOOK_PUBLIC_KEY || '';
if (NOAH_WEBHOOK_PUBLIC_KEY.includes('\\n')) {
  NOAH_WEBHOOK_PUBLIC_KEY = NOAH_WEBHOOK_PUBLIC_KEY.replace(/\\n/g, '\n');
}

/**
 * Verify Webhook Signature (ECDSA SHA-384)
 */
function verifyWebhookSignature(rawBody, signatureHeader) {
  if (!signatureHeader || !NOAH_WEBHOOK_PUBLIC_KEY) {
    return false;
  }
  try {
    const signature = Buffer.from(signatureHeader, 'base64');
    const verifier = crypto.createVerify('SHA384');
    verifier.update(rawBody);
    return verifier.verify(NOAH_WEBHOOK_PUBLIC_KEY, signature);
  } catch (err) {
    console.error('Webhook signature verification error:', err.message);
    return false;
  }
}

/**
 * Webhook Ingestion Endpoint
 * Express body parser raw buffer is used to verify signature accurately
 */
router.post('/noah', express.raw({ type: 'application/json' }), async (req, res) => {
  const signatureHeader = req.headers['webhook-signature'] || req.headers['x-noah-signature'];
  const rawBody = req.body;

  // 1. Signature Verification
  const isValid = verifyWebhookSignature(rawBody, signatureHeader);
  if (!isValid) {
    console.warn('Webhook signature verification failed or signature header missing');
    // Reject untrusted requests in production
    if (process.env.NODE_ENV === 'production') {
      return res.status(401).json({ error: 'Invalid webhook signature' });
    }
  }

  let payload;
  try {
    payload = JSON.parse(rawBody.toString('utf8'));
  } catch (err) {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }

  const eventId = payload.ID || payload.EventID || uuidv4();
  const eventType = payload.Type || payload.EventType || 'unknown';
  const eventVersion = payload.EventVersion || payload.Occurred || new Date().toISOString();
  const now = new Date().toISOString();

  // 2. Idempotency & Duplicate Event Check
  const existingEvent = db.prepare('SELECT id FROM webhook_events WHERE event_id = ?').get(eventId);
  if (existingEvent) {
    console.log(`Duplicate webhook event [${eventId}] received. Responding 200 OK.`);
    return res.status(200).json({ message: 'Event already processed' });
  }

  // 3. Process Webhook Event based on EventType
  let processingStatus = 'processed';
  let errorMessage = null;

  try {
    const data = payload.Data || payload;

    if (eventType.startsWith('Customer') || payload.CustomerID) {
      // Customer Onboarding / KYC Update
      const custId = data.CustomerID || payload.CustomerID;
      const status = data.Status || payload.Status || 'pending';

      if (custId) {
        db.prepare('UPDATE users SET noah_onboarding_status = ?, updated_at = ? WHERE noah_customer_id = ?').run(
          status.toLowerCase(),
          now,
          custId
        );
        console.log(`Updated customer [${custId}] onboarding status to [${status}]`);
      }
    } else if (eventType.startsWith('FiatDeposit') || payload.PaymentMethodID) {
      // Fiat Deposit Event (Incoming Pay-in)
      const custId = data.CustomerID || payload.CustomerID;
      const amount = data.FiatAmount || data.Amount || 0;
      const currency = data.FiatCurrency || data.Currency || 'EUR';
      const depositStatus = (data.Status || payload.Status || 'pending').toLowerCase();

      // Find user by customer ID
      const user = custId ? db.prepare('SELECT id FROM users WHERE noah_customer_id = ?').get(custId) : null;

      if (user) {
        const txId = uuidv4();
        const idempotencyKey = `deposit_${data.ID || eventId}`;

        // Check if deposit transaction already exists
        const existingTx = db.prepare('SELECT id, status FROM transactions WHERE idempotency_key = ?').get(idempotencyKey);
        if (existingTx) {
          db.prepare('UPDATE transactions SET status = ?, sub_status = ?, updated_at = ? WHERE id = ?').run(
            depositStatus,
            data.SubStatus || null,
            now,
            existingTx.id
          );
        } else {
          db.prepare(`
            INSERT INTO transactions (id, user_id, noah_transaction_id, type, status, sub_status, from_currency, from_amount, to_currency, to_amount, details_json, idempotency_key, created_at, updated_at)
            VALUES (?, ?, ?, 'payin', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            txId,
            user.id,
            data.ID || eventId,
            depositStatus,
            data.SubStatus || null,
            currency,
            parseFloat(amount),
            currency,
            parseFloat(amount),
            JSON.stringify(payload),
            idempotencyKey,
            now,
            now
          );
        }
      }
    } else if (eventType.startsWith('Transaction') || payload.TransactionID || payload.ID) {
      // Transaction Event (Payout / Onramp / Offramp status update)
      const noahTxId = data.ID || data.TransactionID || payload.TransactionID;
      const status = (data.Status || payload.Status || 'pending').toLowerCase();
      const subStatus = data.SubStatus || payload.SubStatus || null;

      if (noahTxId) {
        db.prepare('UPDATE transactions SET status = ?, sub_status = ?, updated_at = ? WHERE noah_transaction_id = ?').run(
          status,
          subStatus,
          now,
          noahTxId
        );
        console.log(`Updated transaction [${noahTxId}] status to [${status}] subStatus [${subStatus}]`);
      }
    }
  } catch (err) {
    console.error('Error processing webhook event:', err);
    processingStatus = 'failed';
    errorMessage = err.message;
  }

  // 4. Persist Webhook Event in Audit Trail
  db.prepare(`
    INSERT INTO webhook_events (id, event_id, event_type, event_version, payload_json, status, error_message, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(uuidv4(), eventId, eventType, String(eventVersion), JSON.stringify(payload), processingStatus, errorMessage, now);

  // Always acknowledge receipt with 200 OK
  res.status(200).json({ status: processingStatus, event_id: eventId });
});

// Domain Migration Checklist API
router.get('/domain-migration-checklist', (req, res) => {
  res.json({
    title: 'Noah Financial Services Portal — Domain Migration Checklist',
    steps: [
      { step: 1, action: 'DNS & TLS Provisioning', details: 'Provision target domain, configure A/CNAME records, and verify HTTPS TLS certificate.' },
      { step: 2, action: 'Noah Dashboard Webhook URL Update', details: 'Log into Noah Business Dashboard -> API Configuration -> Webhooks, and add replacement endpoint URL (e.g. https://newdomain.com/api/webhooks/noah).' },
      { step: 3, action: 'Noah Dashboard Allowed Origins & Callbacks', details: 'Update allowed CORS origins and return/redirect URLs in Noah Dashboard.' },
      { step: 4, action: 'Application Environment Variables', details: 'Update ReturnURL defaults and backend APP_URL environment variables in server config.' },
      { step: 5, action: 'Dual-Webhook Ingestion Verification', details: 'Keep old webhook URL active while testing new domain webhook URL using test events.' },
      { step: 6, action: 'Decommission Legacy Domain', details: 'Verify 0 remaining webhooks on old domain before disabling legacy endpoints.' },
    ],
  });
});

module.exports = router;
