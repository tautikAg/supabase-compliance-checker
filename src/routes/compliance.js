const express = require('express');
const router = express.Router();
const ComplianceService = require('../services/complianceChecks');

// Middleware to check authentication
const requireAuth = (req, res, next) => {
    if (!req.session.accessToken) {
        return res.status(401).json({ error: 'Authentication required' });
    }
    next();
};

router.get('/status', requireAuth, async (req, res) => {
    try {
        const complianceService = new ComplianceService(req.session.accessToken);
        
        const results = {
            mfa: await complianceService.checkMFA(),
            rls: await complianceService.checkRLS(),
            pitr: await complianceService.checkPITR(),
            timestamp: new Date().toISOString()
        };

        res.json(results);
    } catch (error) {
        console.error('Compliance check error:', error);
        res.status(500).json({ error: 'Failed to perform compliance checks' });
    }
});

module.exports = router; 