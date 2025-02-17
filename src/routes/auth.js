const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const fetch = require('node-fetch');

// Generate PKCE code verifier and challenge
function generatePKCE() {
  const verifier = crypto.randomBytes(32).toString('base64url');
  const challenge = crypto
    .createHash('sha256')
    .update(verifier)
    .digest('base64url');
  return { verifier, challenge };
}

// Initialize OAuth flow
router.get('/login', (req, res) => {
  const { verifier, challenge } = generatePKCE();
  
  // Store verifier in session
  req.session.codeVerifier = verifier;
  
  // Construct authorization URL
  const authUrl = new URL('https://api.supabase.com/v1/oauth/authorize');
  authUrl.searchParams.append('client_id', process.env.SUPABASE_CLIENT_ID);
  authUrl.searchParams.append('redirect_uri', process.env.REDIRECT_URI);
  authUrl.searchParams.append('response_type', 'code');
  authUrl.searchParams.append('code_challenge', challenge);
  authUrl.searchParams.append('code_challenge_method', 'S256');
  
  res.redirect(authUrl.toString());
});

// Handle OAuth callback
router.get('/callback', async (req, res) => {
    console.log('Callback received:', {
        code: !!req.query.code,
        hasVerifier: !!req.session?.codeVerifier
    });

    const { code } = req.query;
    const { codeVerifier } = req.session || {};

    if (!code || !codeVerifier) {
        console.error('Missing parameters:', { code: !!code, codeVerifier: !!codeVerifier });
        return res.status(400).send('Missing required parameters');
    }

    try {
        // Exchange code for tokens
        const response = await fetch('https://api.supabase.com/v1/oauth/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Basic ${Buffer.from(
                    `${process.env.SUPABASE_CLIENT_ID}:${process.env.SUPABASE_CLIENT_SECRET}`
                ).toString('base64')}`
            },
            body: new URLSearchParams({
                grant_type: 'authorization_code',
                code,
                redirect_uri: process.env.REDIRECT_URI,
                code_verifier: codeVerifier
            })
        });

        const tokens = await response.json();
        
        if (!response.ok) {
            throw new Error(tokens.message || 'Failed to exchange code for tokens');
        }

        // Store tokens in session
        req.session.accessToken = tokens.access_token;
        req.session.refreshToken = tokens.refresh_token;

        console.log('Token exchange successful');
        res.redirect('/');
    } catch (error) {
        console.error('Auth callback error:', error);
        res.status(500).send('Authentication failed');
    }
});

// Modify the status route to include error handling
router.get('/status', (req, res) => {
    try {
        res.json({
            authenticated: !!req.session?.accessToken,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Status check error:', error);
        res.status(500).json({ 
            authenticated: false, 
            error: 'Failed to check authentication status' 
        });
    }
});

module.exports = router; 