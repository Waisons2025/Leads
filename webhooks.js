const express = require('express');
const router = express.Router();

// Webhook endpoint for testing
router.post('/test', (req, res) => {
    console.log('🔗 Test webhook received:', req.body);
    res.json({ 
        success: true, 
        message: 'Test webhook received successfully',
        timestamp: new Date().toISOString()
    });
});

module.exports = router;