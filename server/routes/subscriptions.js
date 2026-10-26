const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// 1. Get available pricing plans
router.get('/plans', (req, res) => {
  const plans = db.prepare('SELECT * FROM pricing_config WHERE is_active = 1').all();
  res.json({ plans });
});

// 2. Get user's current subscription & entitlement status
router.get('/my-subscription', authenticateToken, (req, res) => {
  const userId = req.user.id;
  const now = new Date().toISOString();

  const subscriptions = db.prepare(`
    SELECT * FROM subscriptions 
    WHERE user_id = ? 
    ORDER BY created_at DESC
  `).all(userId);

  const activeSubs = subscriptions.filter(
    (s) => s.status === 'active' && s.expiration_date > now
  );

  const hasCombo = activeSubs.some((s) => s.plan_type === 'COMBO');
  const hasUSD = activeSubs.some((s) => s.plan_type === 'USD');
  const hasEUR = activeSubs.some((s) => s.plan_type === 'EUR');

  res.json({
    activeSubscriptions: activeSubs,
    allSubscriptions: subscriptions,
    entitlements: {
      usd: hasCombo || hasUSD,
      eur: hasCombo || hasEUR,
      combo: hasCombo,
    },
  });
});

// 3. Purchase or Upgrade Subscription
router.post('/checkout', authenticateToken, (req, res) => {
  const { plan_type, payment_method, card_details } = req.body;
  const userId = req.user.id;

  if (!plan_type || !['USD', 'EUR', 'COMBO'].includes(plan_type)) {
    return res.status(400).json({ error: 'Valid plan_type (USD, EUR, COMBO) is required' });
  }

  // Fetch plan pricing from config
  const plan = db.prepare('SELECT * FROM pricing_config WHERE plan_type = ? AND is_active = 1').get(plan_type);
  if (!plan) {
    return res.status(404).json({ error: 'Plan not found or inactive' });
  }

  const now = new Date();
  const nowIso = now.toISOString();

  // Check for existing active subscriptions
  const activeSubs = db.prepare(`
    SELECT * FROM subscriptions 
    WHERE user_id = ? AND status = 'active' AND expiration_date > ?
  `).all(userId, nowIso);

  const hasUSD = activeSubs.some((s) => s.plan_type === 'USD');
  const hasEUR = activeSubs.some((s) => s.plan_type === 'EUR');
  const hasCombo = activeSubs.some((s) => s.plan_type === 'COMBO');

  if (hasCombo) {
    return res.status(400).json({ error: 'You already have an active USD + EUR Combo subscription' });
  }

  if (plan_type === 'USD' && hasUSD) {
    return res.status(400).json({ error: 'You already have an active USD IBAN subscription' });
  }

  if (plan_type === 'EUR' && hasEUR) {
    return res.status(400).json({ error: 'You already have an active EUR IBAN subscription' });
  }

  // Calculate price taking upgrade into account if user already has 1 currency plan and upgrades to COMBO
  let chargedAmount = plan.price_usd;
  let upgradeNote = null;

  if (plan_type === 'COMBO') {
    if (hasUSD || hasEUR) {
      // User already paid $75 for one plan, charge only $75 difference for upgrade
      chargedAmount = 75.00;
      upgradeNote = 'Upgrade discount applied ($75 credit from existing single currency subscription)';
    }
  }

  // Simulate payment processing (Server-side authoritative check)
  const transactionRef = `TX-SUB-${uuidv4().slice(0, 8).toUpperCase()}`;

  // Set expiration 1 year from now
  const expiry = new Date(now);
  expiry.setFullYear(expiry.getFullYear() + 1);
  const expiryIso = expiry.toISOString();

  const subId = uuidv4();

  db.prepare(`
    INSERT INTO subscriptions (id, user_id, plan_type, price_usd, status, start_date, expiration_date, payment_method, transaction_ref, created_at)
    VALUES (?, ?, ?, ?, 'active', ?, ?, ?, ?, ?)
  `).run(subId, userId, plan_type, chargedAmount, nowIso, expiryIso, payment_method || 'card', transactionRef, nowIso);

  // Record audit log
  db.prepare(`
    INSERT INTO audit_logs (id, user_id, action, details_json, created_at)
    VALUES (?, ?, 'subscription_purchased', ?, ?)
  `).run(uuidv4(), userId, JSON.stringify({ subId, plan_type, chargedAmount, transactionRef, upgradeNote }), nowIso);

  res.json({
    message: 'Subscription successfully activated!',
    subscription: {
      id: subId,
      plan_type,
      price_usd: chargedAmount,
      status: 'active',
      start_date: nowIso,
      expiration_date: expiryIso,
      transaction_ref: transactionRef,
      upgradeNote,
    },
    entitlements: {
      usd: plan_type === 'COMBO' || plan_type === 'USD' || hasUSD,
      eur: plan_type === 'COMBO' || plan_type === 'EUR' || hasEUR,
      combo: plan_type === 'COMBO' || (hasUSD && plan_type === 'EUR') || (hasEUR && plan_type === 'USD'),
    },
  });
});

// Admin API: Admin Subscription Overview and Revenue
router.get('/admin/overview', authenticateToken, requireAdmin, (req, res) => {
  const subscriptions = db.prepare(`
    SELECT s.*, u.email, u.full_name 
    FROM subscriptions s
    JOIN users u ON s.user_id = u.id
    ORDER BY s.created_at DESC
  `).all();

  const totalRevenue = db.prepare(`
    SELECT SUM(price_usd) as total FROM subscriptions WHERE status = 'active'
  `).get().total || 0;

  const activeSubCount = db.prepare(`
    SELECT COUNT(*) as count FROM subscriptions WHERE status = 'active' AND expiration_date > ?
  `).get(new Date().toISOString()).count;

  const plansConfig = db.prepare('SELECT * FROM pricing_config').all();

  res.json({
    totalRevenue,
    activeSubCount,
    plansConfig,
    subscriptions,
  });
});

// Admin API: Update Plan Prices
router.put('/admin/pricing', authenticateToken, requireAdmin, (req, res) => {
  const { plan_type, price_usd, name, description, is_active } = req.body;

  if (!plan_type || price_usd === undefined) {
    return res.status(400).json({ error: 'plan_type and price_usd are required' });
  }

  const now = new Date().toISOString();

  db.prepare(`
    UPDATE pricing_config
    SET price_usd = ?, name = COALESCE(?, name), description = COALESCE(?, description), is_active = COALESCE(?, is_active), updated_at = ?
    WHERE plan_type = ?
  `).run(price_usd, name, description, is_active, now, plan_type);

  const updated = db.prepare('SELECT * FROM pricing_config WHERE plan_type = ?').get(plan_type);

  // Record audit
  db.prepare(`
    INSERT INTO audit_logs (id, user_id, action, details_json, created_at)
    VALUES (?, ?, 'admin_updated_pricing', ?, ?)
  `).run(uuidv4(), req.user.id, JSON.stringify({ plan_type, price_usd }), now);

  res.json({ message: 'Pricing updated successfully', plan: updated });
});

module.exports = router;
