const express = require('express');
const { getDB } = require('../config/database');
const router = express.Router();

// Test endpoint
router.get('/test', (req, res) => {
    res.json({
        success: true,
        message: 'Analytics API is working',
        timestamp: new Date().toISOString(),
        endpoints: [
            'GET /api/analytics/test - This endpoint',
            'GET /api/analytics/dashboard - Dashboard metrics'
        ]
    });
});

// Get dashboard analytics
router.get('/dashboard', async (req, res) => {
    try {
        const { dateRange = 30 } = req.query;
        
        // Check if database is available
        let db;
        try {
            db = getDB();
        } catch (error) {
            // No database connection - return test mode data
            return res.json({
                success: true,
                data: {
                    dateRange: dateRange,
                    funnel: {
                        total_leads: 0,
                        contacted: 0,
                        qualified: 0,
                        avg_score: 0
                    },
                    sources: [],
                    recentActivity: [],
                    testMode: true,
                    message: 'Running in test mode - connect database to see real data'
                }
            });
        }
        
        const dateFilter = `created_at >= CURRENT_DATE - INTERVAL '${parseInt(dateRange)} days'`;

        // Get basic funnel metrics
        const funnelQuery = `
            SELECT 
                COUNT(*) as total_leads,
                COUNT(CASE WHEN status = 'contacted' THEN 1 END) as contacted,
                COUNT(CASE WHEN status = 'qualified' THEN 1 END) as qualified,
                AVG(score) as avg_score
            FROM leads 
            WHERE ${dateFilter}
        `;
        
        const funnelResult = await db.query(funnelQuery);
        const funnel = funnelResult.rows[0] || {};

        // Get lead sources
        const sourcesQuery = `
            SELECT 
                COALESCE(source, 'unknown') as _id,
                COUNT(*) as totalLeads
            FROM leads 
            WHERE ${dateFilter}
            GROUP BY source
            ORDER BY totalLeads DESC
            LIMIT 10
        `;
        
        const sourcesResult = await db.query(sourcesQuery);

        // Get daily trends
        const trendsQuery = `
            SELECT 
                DATE(created_at) as date,
                COUNT(*) as leads
            FROM leads 
            WHERE ${dateFilter}
            GROUP BY DATE(created_at)
            ORDER BY date DESC
            LIMIT 30
        `;
        
        const trendsResult = await db.query(trendsQuery);

        // Get quality distribution
        const qualityQuery = `
            SELECT 
                COUNT(CASE WHEN score >= 80 THEN 1 END) as highScore,
                COUNT(CASE WHEN score >= 60 AND score < 80 THEN 1 END) as mediumScore,
                COUNT(CASE WHEN score < 60 THEN 1 END) as lowScore,
                AVG(score) as averageScore
            FROM leads 
            WHERE ${dateFilter}
        `;
        
        const qualityResult = await db.query(qualityQuery);

        // Get campaign performance
        const campaignQuery = `
            SELECT 
                COALESCE(utm_campaign, 'direct') as _id,
                COUNT(*) as totalLeads,
                AVG(score) as averageScore
            FROM leads 
            WHERE ${dateFilter} AND utm_campaign IS NOT NULL
            GROUP BY utm_campaign
            ORDER BY totalLeads DESC
            LIMIT 5
        `;
        
        const campaignResult = await db.query(campaignQuery);

        res.json({
            funnel: {
                leads: parseInt(funnel.total_leads) || 0,
                contacted: parseInt(funnel.contacted) || 0,
                qualified: parseInt(funnel.qualified) || 0,
                conversionRates: {
                    overallConversion: funnel.total_leads > 0 ? 
                        Math.round((funnel.qualified / funnel.total_leads) * 100) : 0
                }
            },
            sources: sourcesResult.rows,
            trends: trendsResult.rows,
            quality: {
                ...qualityResult.rows[0],
                averageScore: Math.round(qualityResult.rows[0]?.averageScore || 0)
            },
            campaigns: campaignResult.rows,
            dateRange: parseInt(dateRange)
        });

    } catch (error) {
        console.error('Dashboard analytics error:', error);
        res.status(500).json({
            error: 'Failed to fetch analytics data',
            message: error.message
        });
    }
});

// Get lead sources breakdown
router.get('/leads/sources', async (req, res) => {
    try {
        const { dateRange = 30 } = req.query;
        const db = getDB();
        
        const query = `
            SELECT 
                COALESCE(source, 'unknown') as source,
                COUNT(*) as total_leads,
                AVG(score) as avg_score,
                COUNT(CASE WHEN status = 'qualified' THEN 1 END) as qualified_leads
            FROM leads 
            WHERE created_at >= CURRENT_DATE - INTERVAL '${parseInt(dateRange)} days'
            GROUP BY source
            ORDER BY total_leads DESC
        `;
        
        const result = await db.query(query);
        
        res.json({
            sources: result.rows.map(row => ({
                source: row.source,
                totalLeads: parseInt(row.total_leads),
                avgScore: Math.round(row.avg_score || 0),
                qualifiedLeads: parseInt(row.qualified_leads),
                conversionRate: row.total_leads > 0 ? 
                    Math.round((row.qualified_leads / row.total_leads) * 100) : 0
            }))
        });

    } catch (error) {
        console.error('Lead sources error:', error);
        res.status(500).json({ error: 'Failed to fetch lead sources data' });
    }
});

// Get conversion funnel
router.get('/conversion-funnel', async (req, res) => {
    try {
        const { dateRange = 30 } = req.query;
        const db = getDB();
        
        const query = `
            SELECT 
                COUNT(*) as total_leads,
                COUNT(CASE WHEN status IN ('contacted', 'qualified', 'appointment', 'client', 'closed') THEN 1 END) as contacted,
                COUNT(CASE WHEN status IN ('qualified', 'appointment', 'client', 'closed') THEN 1 END) as qualified,
                COUNT(CASE WHEN status IN ('appointment', 'client', 'closed') THEN 1 END) as appointment,
                COUNT(CASE WHEN status IN ('client', 'closed') THEN 1 END) as clients,
                COUNT(CASE WHEN status = 'closed' THEN 1 END) as closed
            FROM leads 
            WHERE created_at >= CURRENT_DATE - INTERVAL '${parseInt(dateRange)} days'
        `;
        
        const result = await db.query(query);
        const data = result.rows[0] || {};
        
        res.json({
            funnel: {
                leads: parseInt(data.total_leads) || 0,
                contacted: parseInt(data.contacted) || 0,
                qualified: parseInt(data.qualified) || 0,
                appointment: parseInt(data.appointment) || 0,
                clients: parseInt(data.clients) || 0,
                closed: parseInt(data.closed) || 0
            },
            conversionRates: {
                contactedRate: data.total_leads > 0 ? Math.round((data.contacted / data.total_leads) * 100) : 0,
                qualifiedRate: data.contacted > 0 ? Math.round((data.qualified / data.contacted) * 100) : 0,
                appointmentRate: data.qualified > 0 ? Math.round((data.appointment / data.qualified) * 100) : 0,
                clientRate: data.appointment > 0 ? Math.round((data.clients / data.appointment) * 100) : 0,
                closedRate: data.clients > 0 ? Math.round((data.closed / data.clients) * 100) : 0,
                overallConversion: data.total_leads > 0 ? Math.round((data.closed / data.total_leads) * 100) : 0
            }
        });

    } catch (error) {
        console.error('Conversion funnel error:', error);
        res.status(500).json({ error: 'Failed to fetch conversion funnel data' });
    }
});

// Get lead quality metrics
router.get('/lead-quality', async (req, res) => {
    try {
        const { dateRange = 30 } = req.query;
        const db = getDB();
        
        const query = `
            SELECT 
                AVG(score) as average_score,
                COUNT(CASE WHEN score >= 80 THEN 1 END) as high_quality,
                COUNT(CASE WHEN score >= 60 AND score < 80 THEN 1 END) as medium_quality,
                COUNT(CASE WHEN score < 60 THEN 1 END) as low_quality,
                COUNT(*) as total_leads
            FROM leads 
            WHERE created_at >= CURRENT_DATE - INTERVAL '${parseInt(dateRange)} days'
        `;
        
        const result = await db.query(query);
        const data = result.rows[0] || {};
        
        res.json({
            averageScore: Math.round(data.average_score || 0),
            distribution: {
                high: parseInt(data.high_quality) || 0,
                medium: parseInt(data.medium_quality) || 0,
                low: parseInt(data.low_quality) || 0
            },
            percentages: {
                high: data.total_leads > 0 ? Math.round((data.high_quality / data.total_leads) * 100) : 0,
                medium: data.total_leads > 0 ? Math.round((data.medium_quality / data.total_leads) * 100) : 0,
                low: data.total_leads > 0 ? Math.round((data.low_quality / data.total_leads) * 100) : 0
            },
            totalLeads: parseInt(data.total_leads) || 0
        });

    } catch (error) {
        console.error('Lead quality error:', error);
        res.status(500).json({ error: 'Failed to fetch lead quality data' });
    }
});

module.exports = router;
