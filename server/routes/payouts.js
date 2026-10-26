const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const noahClient = require('../noahClient');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// 1. Get available Payout Channels (dynamically retrieved from Noah API at runtime as required by docs)
router.get('/channels', authenticateToken, async (req, res) => {
  const { fiat_currency, country, crypto_currency } = req.query;

  const crypto = crypto_currency || 'USDC';
  const fiat = fiat_currency || 'EUR';

  try {
    const params = {
      CryptoCurrency: crypto,
      FiatCurrency: fiat,
    };
    if (country) params.Country = country;

    const response = await noahClient.get('/channels/sell', params);
    res.json({ channels: response.Items || [] });
  } catch (err) {
    console.error('Error fetching sell channels:', err.message);
    res.status(500).json({ error: 'Failed to retrieve payout channels: ' + err.message });
  }
});

// 2. Get Dynamic Form Schema for a specific Payout Channel ID
router.get('/channels/:channelId/form', authenticateToken, async (req, res) => {
  try {
    const response = await noahClient.get(`/channels/${req.params.channelId}/form`);
    res.json(response);
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve channel dynamic form schema: ' + err.message });
  }
});

// 3. Save or Add Beneficiary
router.post('/beneficiaries', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const { name, currency, bank_name, account_identifier, routing_identifier, type, country, details } = req.body;

  if (!name || !currency || !account_identifier) {
    return res.status(400).json({ error: 'Name, currency, and account identifier are required' });
  }

  const benId = uuidv4();
  const now = new Date().toISOString();

  // Optionally register payment method with Noah if details provided
  let noahPaymentMethodId = null;
  if (details && details.FormInput) {
    try {
      const pmResp = await noahClient.post('/payment-methods', {
        CustomerID: req.user.noah_customer_id,
        ...details,
      });
      noahPaymentMethodId = pmResp.ID || pmResp.PaymentMethodID;
    } catch (err) {
      console.warn('Noah payment method creation warning:', err.message);
    }
  }

  db.prepare(`
    INSERT INTO beneficiaries (id, user_id, noah_payment_method_id, name, currency, bank_name, account_identifier, routing_identifier, type, country, details_json, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    benId,
    userId,
    noahPaymentMethodId,
    name,
    currency.toUpperCase(),
    bank_name || '',
    account_identifier,
    routing_identifier || '',
    type || 'Individual',
    country || 'DE',
    JSON.stringify(details || {}),
    now
  );

  const beneficiary = db.prepare('SELECT * FROM beneficiaries WHERE id = ?').get(benId);
  res.json({ message: 'Beneficiary created successfully', beneficiary });
});

// List User Beneficiaries
router.get('/beneficiaries', authenticateToken, (req, res) => {
  const beneficiaries = db.prepare('SELECT * FROM beneficiaries WHERE user_id = ? ORDER BY created_at DESC').all(req.user.id);
  res.json({ beneficiaries });
});

// 4. Get Payout Quote / Prepare Payout Transaction
router.post('/quote', authenticateToken, async (req, res) => {
  const { channel_id, crypto_currency, fiat_currency, crypto_amount, fiat_amount, payment_method } = req.body;

  if (!channel_id) {
    return res.status(400).json({ error: 'channel_id is required' });
  }

  try {
    const preparePayload = {
      ChannelID: channel_id,
      CryptoCurrency: crypto_currency || 'USDC',
      FiatCurrency: fiat_currency || 'EUR',
      ...(crypto_amount ? { CryptoAmount: String(crypto_amount) } : {}),
      ...(fiat_amount ? { FiatAmount: String(fiat_amount) } : {}),
      ...(payment_method ? { PaymentMethod: payment_method } : {}),
    };

    const quote = await noahClient.post('/transactions/sell/prepare', preparePayload);
    res.json({ quote });
  } catch (err) {
    res.status(500).json({ error: 'Failed to prepare payout quote: ' + err.message, details: err.details });
  }
});

// 5. Initiate Payout (Execute Sell Transaction)
router.post('/initiate', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const {
    idempotency_key,
    channel_id,
    crypto_currency,
    fiat_currency,
    crypto_amount,
    fiat_amount,
    payment_method,
    beneficiary_id,
  } = req.body;

  if (!channel_id) {
    return res.status(400).json({ error: 'channel_id is required' });
  }

  // Idempotency check
  const idKey = idempotency_key || `payout_${uuidv4()}`;
  const existingTx = db.prepare('SELECT * FROM transactions WHERE idempotency_key = ?').get(idKey);
  if (existingTx) {
    return res.json({ message: 'Duplicate payout request ignored (idempotent response)', transaction: existingTx });
  }

  const now = new Date().toISOString();
  const txId = uuidv4();

  try {
    const sellPayload = {
      ChannelID: channel_id,
      CryptoCurrency: crypto_currency || 'USDC',
      FiatCurrency: fiat_currency || 'EUR',
      ...(crypto_amount ? { CryptoAmount: String(crypto_amount) } : {}),
      ...(fiat_amount ? { FiatAmount: String(fiat_amount) } : {}),
      PaymentMethod: payment_method,
      Nonce: `nonce_${uuidv4().replace(/-/g, '')}`,
    };

    const sellResponse = await noahClient.post('/transactions/sell', sellPayload);

    const transactionRecord = {
      id: txId,
      user_id: userId,
      noah_transaction_id: sellResponse.ID || sellResponse.TransactionID || `tx_${uuidv4().slice(0, 8)}`,
      type: 'payout',
      status: sellResponse.Status ? sellResponse.Status.toLowerCase() : 'pending',
      sub_status: sellResponse.SubStatus || null,
      from_currency: crypto_currency || 'USDC',
      from_amount: parseFloat(crypto_amount || sellResponse.CryptoAmount || 0),
      to_currency: fiat_currency || 'EUR',
      to_amount: parseFloat(fiat_amount || sellResponse.FiatAmount || 0),
      fee_amount: parseFloat(sellResponse.Fee || sellResponse.NetworkFee || 0),
      exchange_rate: parseFloat(sellResponse.Rate || 1.0),
      beneficiary_id: beneficiary_id || null,
      details_json: JSON.stringify(sellResponse),
      idempotency_key: idKey,
      created_at: now,
      updated_at: now,
    };

    db.prepare(`
      INSERT INTO transactions (id, user_id, noah_transaction_id, type, status, sub_status, from_currency, from_amount, to_currency, to_amount, fee_amount, exchange_rate, beneficiary_id, details_json, idempotency_key, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      transactionRecord.id,
      transactionRecord.user_id,
      transactionRecord.noah_transaction_id,
      transactionRecord.type,
      transactionRecord.status,
      transactionRecord.sub_status,
      transactionRecord.from_currency,
      transactionRecord.from_amount,
      transactionRecord.to_currency,
      transactionRecord.to_amount,
      transactionRecord.fee_amount,
      transactionRecord.exchange_rate,
      transactionRecord.beneficiary_id,
      transactionRecord.details_json,
      transactionRecord.idempotency_key,
      transactionRecord.created_at,
      transactionRecord.updated_at
    );

    // Audit log
    db.prepare(`
      INSERT INTO audit_logs (id, user_id, action, details_json, created_at)
      VALUES (?, ?, 'payout_initiated', ?, ?)
    `).run(uuidv4(), userId, JSON.stringify({ txId, noahTxId: transactionRecord.noah_transaction_id }), now);

    res.json({
      message: 'Payout initiated successfully!',
      transaction: transactionRecord,
      noah_response: sellResponse,
    });
  } catch (err) {
    console.error('Payout initiation error:', err);

    // Provide detailed error response
    res.status(500).json({
      error: 'Failed to initiate payout: ' + err.message,
      details: err.details,
    });
  }
});

// 6. List User Payout Transactions and Status
router.get('/history', authenticateToken, (req, res) => {
  const transactions = db.prepare(`
    SELECT * FROM transactions 
    WHERE user_id = ? AND type = 'payout'
    ORDER BY created_at DESC
  `).all(req.user.id);

  res.json({ transactions });
});

module.exports = router;
