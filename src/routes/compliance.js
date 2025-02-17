const express = require('express');
const router = express.Router();
const ComplianceService = require('../services/complianceChecks');

// Middleware to check authentication
const requireAuth = (req, res, next) => {
    console.log('Checking authentication...');
    console.log('Session:', {
        exists: !!req.session,
        hasAccessToken: !!req.session?.accessToken,
        tokenPreview: req.session?.accessToken ? 
            `${req.session.accessToken.substring(0, 10)}...` : 'none'
    });

    if (!req.session?.accessToken) {
        console.log('Authentication failed - no access token');
        return res.status(401).json({ error: 'Authentication required' });
    }
    console.log('Authentication successful');
    next();
};

router.get('/status', requireAuth, async (req, res) => {
    console.log('Compliance status check initiated');
    try {
        const complianceService = new ComplianceService(req.session.accessToken);
        
        console.log('Running compliance checks...');
        const results = {
            mfa: await complianceService.checkMFA(),
            rls: await complianceService.checkRLS(),
            pitr: await complianceService.checkPITR(),
            timestamp: new Date().toISOString()
        };

        console.log('Compliance check results:', JSON.stringify(results, null, 2));
        res.json(results);
    } catch (error) {
        console.error('Compliance check error details:', {
            message: error.message,
            stack: error.stack,
            name: error.name
        });
        res.status(500).json({ 
            error: 'Failed to perform compliance checks',
            details: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

module.exports = router; 