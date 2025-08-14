const express = require('express');
const { postToFacebook, generateMarketUpdatePost } = require('../services/social');
const router = express.Router();

// Manual post to Facebook (for testing)
router.post('/facebook/post', async (req, res) => {
    try {
        const { message, imageUrl } = req.body;
        
        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }

        const result = await postToFacebook(message, imageUrl);
        
        res.json({
            success: true,
            message: 'Posted to Facebook successfully',
            postId: result?.id
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Generate market update content (for preview/manual posting)
router.get('/facebook/generate-content', (req, res) => {
    try {
        const content = generateMarketUpdatePost();
        
        res.json({
            success: true,
            content: content,
            instructions: 'Copy this content and manually post to Facebook, or use the /facebook/post endpoint'
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Test Facebook configuration
router.get('/facebook/test', async (req, res) => {
    try {
        if (!process.env.FACEBOOK_PAGE_ACCESS_TOKEN) {
            return res.json({
                success: false,
                message: 'Facebook access token not configured',
                instructions: 'Add FACEBOOK_PAGE_ACCESS_TOKEN to your .env file'
            });
        }

        // Test with a simple post
        const testMessage = "🔧 Testing Waisons Realty automation system! This is a test post from our lead generation platform.";
        
        const result = await postToFacebook(testMessage);
        
        res.json({
            success: true,
            message: 'Facebook posting works!',
            postId: result?.id
        });

    } catch (error) {
        res.json({
            success: false,
            error: error.message,
            instructions: 'Check your Facebook permissions and access token'
        });
    }
});

module.exports = router;