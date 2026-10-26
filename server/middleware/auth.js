const jwt = require('jsonwebtoken');
const db = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'v7NA@zDg9!Xs6Wm^BTJ2pKfwqE7UYLzGhd1osR4k';

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Authentication token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }

    // Verify user exists in database
    const dbUser = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id);
    if (!dbUser) {
      return res.status(401).json({ error: 'User no longer exists' });
    }

    req.user = dbUser;
    next();
  });
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

/**
 * Entitlement Check Middleware
 * Required Currency can be 'USD', 'EUR', or 'ANY'
 */
function checkEntitlement(requiredCurrency) {
  return (req, res, next) => {
    const userId = req.user.id;
    const now = new Date().toISOString();

    const activeSubs = db.prepare(`
      SELECT * FROM subscriptions 
      WHERE user_id = ? AND status = 'active' AND expiration_date > ?
    `).all(userId, now);

    if (!activeSubs || activeSubs.length === 0) {
      return res.status(402).json({
        error: 'Subscription required',
        message: 'An active subscription is required to access IBAN financial services.',
        requiredPlan: requiredCurrency,
      });
    }

    const hasCombo = activeSubs.some((s) => s.plan_type === 'COMBO');
    const hasUSD = activeSubs.some((s) => s.plan_type === 'USD');
    const hasEUR = activeSubs.some((s) => s.plan_type === 'EUR');

    let isEntitled = false;
    if (hasCombo) {
      isEntitled = true;
    } else if (requiredCurrency === 'USD' && hasUSD) {
      isEntitled = true;
    } else if (requiredCurrency === 'EUR' && hasEUR) {
      isEntitled = true;
    } else if (requiredCurrency === 'ANY' && (hasUSD || hasEUR)) {
      isEntitled = true;
    }

    if (!isEntitled) {
      return res.status(403).json({
        error: 'Entitlement missing',
        message: `Your current subscription does not cover ${requiredCurrency} IBAN services. Please upgrade your plan.`,
        requiredPlan: requiredCurrency,
      });
    }

    req.entitlements = {
      usd: hasCombo || hasUSD,
      eur: hasCombo || hasEUR,
    };

    next();
  };
}

module.exports = {
  authenticateToken,
  requireAdmin,
  checkEntitlement,
  JWT_SECRET,
};
