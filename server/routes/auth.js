const express = require('express');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { ethers } = require('ethers');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { authenticateToken, JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

// Helper to hash passwords simply using SHA-256 with salt
function hashPassword(password) {
  return crypto.createHash('sha256').update(password + 'noah_portal_salt_2026').digest('hex');
}

// Helper to generate JWT
function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// 1. Email/Password Signup
router.post('/register', (req, res) => {
  const { email, password, full_name } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase().trim());
  if (existing) {
    return res.status(400).json({ error: 'User with this email already exists' });
  }

  const userId = uuidv4();
  const passwordHash = hashPassword(password);
  const now = new Date().toISOString();

  // Make first registered user an admin for setup, otherwise user
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  const role = userCount === 0 ? 'admin' : 'user';

  db.prepare(`
    INSERT INTO users (id, email, password_hash, full_name, role, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(userId, email.toLowerCase().trim(), passwordHash, full_name || '', role, now, now);

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  const token = generateToken(user);

  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      wallet_address: user.wallet_address,
      wallet_type: user.wallet_type,
      noah_customer_id: user.noah_customer_id,
      noah_onboarding_status: user.noah_onboarding_status,
      role: user.role,
    },
  });
});

// 2. Email/Password Login
router.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase().trim());
  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const passwordHash = hashPassword(password);
  if (user.password_hash !== passwordHash) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const token = generateToken(user);

  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      wallet_address: user.wallet_address,
      wallet_type: user.wallet_type,
      noah_customer_id: user.noah_customer_id,
      noah_onboarding_status: user.noah_onboarding_status,
      role: user.role,
    },
  });
});

// 3. Get Nonce for MetaMask Wallet Signature
router.get('/wallet-nonce', (req, res) => {
  const walletAddress = req.query.address;
  if (!walletAddress) {
    return res.status(400).json({ error: 'Wallet address required' });
  }

  const normalizedAddress = walletAddress.toLowerCase();
  const nonce = `Sign in to Noah Financial Services Portal.\nNonce: ${uuidv4()}`;

  // Store nonce on existing user or temporary session table/record
  let user = db.prepare('SELECT * FROM users WHERE wallet_address = ?').get(normalizedAddress);
  if (user) {
    db.prepare('UPDATE users SET auth_nonce = ? WHERE id = ?').run(nonce, user.id);
  }

  res.json({ nonce, address: normalizedAddress });
});

// 4. Wallet Login (MetaMask with Nonce Verification)
router.post('/wallet-login', (req, res) => {
  const { wallet_address, signature, nonce } = req.body;

  if (!wallet_address || !signature || !nonce) {
    return res.status(400).json({ error: 'Wallet address, signature and nonce are required' });
  }

  const normalizedAddress = wallet_address.toLowerCase();

  try {
    const recoveredAddress = ethers.verifyMessage(nonce, signature).toLowerCase();
    if (recoveredAddress !== normalizedAddress) {
      return res.status(401).json({ error: 'Invalid signature verification failed' });
    }
  } catch (err) {
    return res.status(400).json({ error: 'Error verifying signature: ' + err.message });
  }

  let user = db.prepare('SELECT * FROM users WHERE wallet_address = ?').get(normalizedAddress);
  const now = new Date().toISOString();

  if (!user) {
    // Create new account for wallet user
    const userId = uuidv4();
    const generatedEmail = `${normalizedAddress.slice(0, 8)}@wallet.noahportal.com`;
    
    db.prepare(`
      INSERT INTO users (id, email, wallet_address, wallet_type, created_at, updated_at)
      VALUES (?, ?, ?, 'metamask', ?, ?)
    `).run(userId, generatedEmail, normalizedAddress, now, now);

    user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  } else {
    // Clear used nonce
    db.prepare('UPDATE users SET auth_nonce = NULL, updated_at = ? WHERE id = ?').run(now, user.id);
  }

  const token = generateToken(user);

  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      wallet_address: user.wallet_address,
      wallet_type: user.wallet_type,
      noah_customer_id: user.noah_customer_id,
      noah_onboarding_status: user.noah_onboarding_status,
      role: user.role,
    },
  });
});

// 5. Link Wallet to Authenticated Account (MetaMask or Privy)
router.post('/link-wallet', authenticateToken, (req, res) => {
  const { wallet_address, wallet_type, signature, nonce } = req.body;

  if (!wallet_address || !wallet_type) {
    return res.status(400).json({ error: 'Wallet address and wallet_type are required' });
  }

  const normalizedAddress = wallet_address.toLowerCase();

  // If MetaMask, require signature verification
  if (wallet_type === 'metamask') {
    if (!signature || !nonce) {
      return res.status(400).json({ error: 'Signature and nonce are required for MetaMask' });
    }
    try {
      const recoveredAddress = ethers.verifyMessage(nonce, signature).toLowerCase();
      if (recoveredAddress !== normalizedAddress) {
        return res.status(401).json({ error: 'Invalid wallet signature' });
      }
    } catch (err) {
      return res.status(400).json({ error: 'Error verifying wallet signature: ' + err.message });
    }
  }

  // Check if wallet is already linked to another user
  const existingUser = db.prepare('SELECT id FROM users WHERE wallet_address = ? AND id != ?').get(normalizedAddress, req.user.id);
  if (existingUser) {
    return res.status(400).json({ error: 'Wallet address is already linked to another account' });
  }

  const now = new Date().toISOString();
  db.prepare(`
    UPDATE users 
    SET wallet_address = ?, wallet_type = ?, updated_at = ?
    WHERE id = ?
  `).run(normalizedAddress, wallet_type, now, req.user.id);

  const updatedUser = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);

  res.json({
    message: 'Wallet successfully linked',
    wallet_address: updatedUser.wallet_address,
    wallet_type: updatedUser.wallet_type,
  });
});

// 6. Get current logged in user details + active subscription status
router.get('/me', authenticateToken, (req, res) => {
  const userId = req.user.id;
  const now = new Date().toISOString();

  const activeSubscriptions = db.prepare(`
    SELECT * FROM subscriptions 
    WHERE user_id = ? AND status = 'active' AND expiration_date > ?
  `).all(userId, now);

  const hasCombo = activeSubscriptions.some((s) => s.plan_type === 'COMBO');
  const hasUSD = activeSubscriptions.some((s) => s.plan_type === 'USD');
  const hasEUR = activeSubscriptions.some((s) => s.plan_type === 'EUR');

  res.json({
    user: {
      id: req.user.id,
      email: req.user.email,
      full_name: req.user.full_name,
      wallet_address: req.user.wallet_address,
      wallet_type: req.user.wallet_type,
      noah_customer_id: req.user.noah_customer_id,
      noah_onboarding_status: req.user.noah_onboarding_status,
      role: req.user.role,
    },
    entitlements: {
      usd: hasCombo || hasUSD,
      eur: hasCombo || hasEUR,
      combo: hasCombo,
    },
    activeSubscriptions,
  });
});

module.exports = router;
