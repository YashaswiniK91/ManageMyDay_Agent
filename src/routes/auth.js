const express = require('express');
const router = express.Router();
const { getAuthorizationUrl, getAccessToken } = require('../../config/auth');
const TokenStorage = require('../../utils/TokenStorage');

const tokenStorage = new TokenStorage('memory');
const SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/drive',
];

/**
 * Initialize OAuth flow
 * GET /auth/init
 */
router.get('/init', (req, res) => {
  try {
    const userId = req.query.userId || 'default-user';
    const state = JSON.stringify({ userId });
    const authUrl = getAuthorizationUrl(SCOPES, { state });
    res.json({
      status: 'authorization_initiated',
      authUrl,
      userId,
      message: 'Visit the URL above to authorize the application',
    });
  } catch (error) {
    res.status(500).json({
      error: 'Authentication initialization failed',
      message: error.message,
    });
  }
});

/**
 * OAuth Callback handler
 * GET /auth/callback?code=...
 */
router.get('/callback', async (req, res) => {
  const code = req.query.code;
  const state = req.query.state;

  if (!code) {
    return res.status(400).json({
      error: 'Missing authorization code',
    });
  }

  try {
    const tokens = await getAccessToken(code, SCOPES);

    let userId = 'default-user';
    if (state) {
      try {
        const parsedState = JSON.parse(state);
        userId = parsedState.userId || userId;
      } catch (error) {
        console.warn('Invalid OAuth state payload, falling back to default-user');
      }
    }

    await tokenStorage.saveToken(userId, tokens);

    res.json({
      status: 'authorized',
      message: 'Successfully authorized! You can now use the chatbot.',
      userId,
      token: {
        access_token: tokens.access_token.substring(0, 20) + '...',
        refresh_token: tokens.refresh_token ? tokens.refresh_token.substring(0, 20) + '...' : null,
        expiry_date: tokens.expiry_date,
      },
    });
  } catch (error) {
    res.status(500).json({
      error: 'Token retrieval failed',
      message: error.message,
    });
  }
});

/**
 * Get stored tokens (for debugging)
 * GET /auth/tokens
 */
router.get('/tokens', async (req, res) => {
  try {
    const users = await tokenStorage.listUsers();
    res.json({
      authorized_users: users,
      message: 'For production, do not expose this endpoint',
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to retrieve tokens',
      message: error.message,
    });
  }
});

/**
 * Get user token
 * GET /auth/token/:userId
 */
router.get('/token/:userId', async (req, res) => {
  try {
    const token = await tokenStorage.getToken(req.params.userId);
    
    if (!token) {
      return res.status(404).json({
        error: 'No token found for user',
        userId: req.params.userId,
      });
    }

    res.json({
      userId: req.params.userId,
      token: {
        access_token: token.access_token.substring(0, 20) + '...',
        expiry_date: token.expiry_date,
      },
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to retrieve token',
      message: error.message,
    });
  }
});

/**
 * Revoke token
 * DELETE /auth/token/:userId
 */
router.delete('/token/:userId', async (req, res) => {
  try {
    await tokenStorage.deleteToken(req.params.userId);
    res.json({
      status: 'token_revoked',
      userId: req.params.userId,
      message: 'Token successfully revoked',
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to revoke token',
      message: error.message,
    });
  }
});

module.exports = router;
