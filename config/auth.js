require('dotenv').config();
const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');

/**
 * OAuth 2.0 Configuration and Authentication Handler
 */

const CREDENTIALS_PATH = path.join(__dirname, '../credentials.json');
const TOKEN_PATH = path.join(__dirname, '../token.json');

// Initialize OAuth 2.0 Client
const createOAuthClient = () => {
  if (!fs.existsSync(CREDENTIALS_PATH)) {
    throw new Error(`Credentials file not found at ${CREDENTIALS_PATH}. Please download from Google Cloud Console.`);
  }

  const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf8'));
  const { client_id, client_secret, redirect_uris } = credentials.installed || credentials.web;

  return new google.auth.OAuth2(
    client_id,
    client_secret,
    redirect_uris[0]
  );
};

/**
 * Get Authorization URL for user to grant access
 */
const getAuthorizationUrl = (scopes) => {
  const auth = createOAuthClient();
  const authUrl = auth.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
  });
  return authUrl;
};

/**
 * Get access token from authorization code
 */
const getAccessToken = async (code, scopes) => {
  const auth = createOAuthClient();
  try {
    const { tokens } = await auth.getToken(code);
    auth.setCredentials(tokens);
    
    // Save token for future use
    fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens), 'utf8');
    
    return tokens;
  } catch (error) {
    console.error('Error retrieving access token:', error);
    throw error;
  }
};

/**
 * Load saved token or return null
 */
const loadSavedToken = () => {
  try {
    if (fs.existsSync(TOKEN_PATH)) {
      const token = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8'));
      return token;
    }
  } catch (error) {
    console.error('Error loading saved token:', error);
  }
  return null;
};

/**
 * Create authenticated client with token
 */
const createAuthenticatedClient = (token) => {
  const auth = createOAuthClient();
  auth.setCredentials(token);
  return auth;
};

/**
 * Refresh access token if expired
 */
const refreshAccessToken = async (refreshToken) => {
  const auth = createOAuthClient();
  auth.setCredentials({ refresh_token: refreshToken });
  
  try {
    const { credentials } = await auth.refreshAccessToken();
    return credentials;
  } catch (error) {
    console.error('Error refreshing access token:', error);
    throw error;
  }
};

module.exports = {
  createOAuthClient,
  getAuthorizationUrl,
  getAccessToken,
  loadSavedToken,
  createAuthenticatedClient,
  refreshAccessToken,
  CREDENTIALS_PATH,
  TOKEN_PATH,
};
