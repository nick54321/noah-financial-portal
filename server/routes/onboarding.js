const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const noahClient = require('../noahClient');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// 1. Get Onboarding & KYC Status for current user
router.get('/status', authenticateToken, async (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);

  if (!user.noah_customer_id) {
    return res.json({
      status: 'not_started',
      message: 'No Noah customer profile found. Please start onboarding.',
      customer: null,
    });
  }

  try {
    // Fetch live customer record from Noah API
    const noahCustomer = await noahClient.get(`/customers/${user.noah_customer_id}`);

    // Extract verifications status
    let verificationStatus = user.noah_onboarding_status || 'pending';
    let rejectionReason = null;

    if (noahCustomer && noahCustomer.Verifications && noahCustomer.Verifications.EntityVerifications) {
      const verifs = noahCustomer.Verifications.EntityVerifications;
      if (verifs.length > 0) {
        const latestVerif = verifs[verifs.length - 1];
        if (latestVerif.RejectionData) {
          rejectionReason = latestVerif.RejectionData.PublicComment || 'Verification required additional information.';
        }
      }
    }

    // Update DB with status if changed
    if (noahCustomer.Status && noahCustomer.Status !== user.noah_onboarding_status) {
      db.prepare('UPDATE users SET noah_onboarding_status = ?, updated_at = ? WHERE id = ?').run(
        noahCustomer.Status,
        new Date().toISOString(),
        user.id
      );
      verificationStatus = noahCustomer.Status;
    }

    res.json({
      status: verificationStatus,
      customer_id: user.noah_customer_id,
      noah_details: noahCustomer,
      rejection_reason: rejectionReason,
    });
  } catch (err) {
    // Return saved DB state if Noah API call fails or customer pending
    res.json({
      status: user.noah_onboarding_status || 'pending',
      customer_id: user.noah_customer_id,
      error: 'Could not fetch live Noah status: ' + err.message,
    });
  }
});

// 2. Start / Prefill Onboarding Journey
router.post('/start', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);

  const {
    first_name,
    last_name,
    date_of_birth,
    street,
    city,
    state,
    post_code,
    country,
    id_number,
    id_type,
    return_url,
  } = req.body;

  // Use existing Noah Customer ID or generate a new unique customer ID
  let customerId = user.noah_customer_id;
  if (!customerId) {
    customerId = `cust_${uuidv4().replace(/-/g, '').slice(0, 20)}`;
  }

  const prefillData = {
    DateOfBirth: date_of_birth || '1995-05-15',
    FullName: {
      FirstName: first_name || user.full_name?.split(' ')[0] || 'John',
      LastName: last_name || user.full_name?.split(' ')[1] || 'Doe',
    },
    Identities: [
      {
        ExpiryDate: '2030-01-01',
        IDNumber: id_number || 'ID987654321',
        IDType: id_type || 'NationalIDCard',
        IssuingCountry: country || 'BH',
      },
    ],
    PrimaryResidence: {
      City: city || 'Manama',
      Country: country || 'BH',
      PostCode: post_code || '00000',
      State: state || 'Capital',
      Street: street || '123 Financial Way',
    },
    Type: 'Individual',
  };

  try {
    // 1. Submit prefill details to Noah
    let prefillResponse = null;
    try {
      prefillResponse = await noahClient.post(`/onboarding/${customerId}/prefill`, prefillData);
    } catch (prefillErr) {
      console.warn('Prefill warning (proceeding to onboarding session):', prefillErr.message);
    }

    // 2. Initiate Onboarding Hosted Session with ReturnURL
    const redirectUrl = return_url && return_url.startsWith('https://') ? return_url : 'https://app.noahportal.com/dashboard?onboarding=complete';
    const onboardingResponse = await noahClient.post(`/onboarding/${customerId}`, {
      ReturnURL: redirectUrl,
    });

    const now = new Date().toISOString();

    // Update user in database
    db.prepare(`
      UPDATE users 
      SET noah_customer_id = ?, noah_onboarding_status = 'pending', full_name = ?, updated_at = ?
      WHERE id = ?
    `).run(
      customerId,
      `${prefillData.FullName.FirstName} ${prefillData.FullName.LastName}`,
      now,
      userId
    );

    // Record Audit Log
    db.prepare(`
      INSERT INTO audit_logs (id, user_id, action, details_json, created_at)
      VALUES (?, ?, 'onboarding_initiated', ?, ?)
    `).run(uuidv4(), userId, JSON.stringify({ customerId, onboardingResponse }), now);

    res.json({
      message: 'Onboarding session created successfully',
      customer_id: customerId,
      onboarding_url: onboardingResponse.URL || onboardingResponse.Url || onboardingResponse.RedirectURL,
      status: 'pending',
      details: onboardingResponse,
    });
  } catch (err) {
    console.error('Onboarding start error:', err);
    res.status(500).json({
      error: 'Failed to initiate Noah onboarding session: ' + err.message,
      details: err.details,
    });
  }
});

// 3. Resume Incomplete Onboarding Session
router.post('/resume', authenticateToken, async (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);

  if (!user.noah_customer_id) {
    return res.status(400).json({ error: 'No onboarding session exists to resume. Please start onboarding first.' });
  }

  const { return_url } = req.body;
  const redirectUrl = return_url && return_url.startsWith('https://') ? return_url : 'https://app.noahportal.com/dashboard?onboarding=complete';

  try {
    const onboardingResponse = await noahClient.post(`/onboarding/${user.noah_customer_id}`, {
      ReturnURL: redirectUrl,
    });

    res.json({
      message: 'Onboarding session resumed successfully',
      customer_id: user.noah_customer_id,
      onboarding_url: onboardingResponse.URL || onboardingResponse.Url || onboardingResponse.RedirectURL,
      details: onboardingResponse,
    });
  } catch (err) {
    res.status(500).json({
      error: 'Failed to resume onboarding session: ' + err.message,
      details: err.details,
    });
  }
});

module.exports = router;
