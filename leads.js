const express = require('express');
const { getDB } = require('../config/database');
const { calculateLeadScore } = require('../services/leadScoring');
const { sendWelcomeEmail } = require('../services/email');
const { sendWelcomeSMS } = require('../services/sms');
const router = express.Router();

// Capture new lead
router.post('/capture', async (req, res) => {
    try {
        const {
            firstName,
            lastName,
            email,
            phone,
            address,
            propertyType = 'single-family',
            timeframe = 'just-curious',
            comments = '',
            source = 'website',
            utm_source = '',
            utm_medium = '',
            utm_campaign = '',
            page_url = '',
            referrer = ''
        } = req.body;

        // Validate required fields
        if (!firstName || !lastName || !email || !address) {
            return res.status(400).json({
                error: 'Missing required fields',
                required: ['firstName', 'lastName', 'email', 'address']
            });
        }

        // Calculate lead score
        const leadData = {
            propertyType,
            timeframe,
            location: address,
            hasPhone: !!phone,
            hasEmail: !!email,
            source
        };
        
        const score = calculateLeadScore(leadData);

        const db = getDB();
        
        // Check if lead already exists
        const existingLead = await db.query(
            'SELECT id FROM leads WHERE email = $1',
            [email]
        );

        let leadId;

        if (existingLead.rows.length > 0) {
            // Update existing lead
            const result = await db.query(`
                UPDATE leads SET 
                    first_name = $1,
                    last_name = $2,
                    phone = $3,
                    address = $4,
                    property_type = $5,
                    timeframe = $6,
                    comments = $7,
                    score = $8,
                    source = $9,
                    utm_source = $10,
                    utm_medium = $11,
                    utm_campaign = $12,
                    page_url = $13,
                    referrer = $14,
                    updated_at = CURRENT_TIMESTAMP
                WHERE email = $15
                RETURNING id
            `, [firstName, lastName, phone, address, propertyType, timeframe, 
                comments, score, source, utm_source, utm_medium, utm_campaign,
                page_url, referrer, email]);
                
            leadId = result.rows[0].id;
        } else {
            // Create new lead
            const result = await db.query(`
                INSERT INTO leads (
                    first_name, last_name, email, phone, address,
                    property_type, timeframe, comments, score, status,
                    source, utm_source, utm_medium, utm_campaign,
                    page_url, referrer
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
                RETURNING id
            `, [firstName, lastName, email, phone, address, propertyType, 
                timeframe, comments, score, 'new', source, utm_source,
                utm_medium, utm_campaign, page_url, referrer]);
                
            leadId = result.rows[0].id;
        }

        // Log lead tracking event
        await db.query(`
            INSERT INTO lead_tracking (lead_id, event, data)
            VALUES ($1, $2, $3)
        `, [leadId, 'form_submitted', JSON.stringify({
            score,
            source,
            utm_data: { utm_source, utm_medium, utm_campaign },
            property_type: propertyType,
            timeframe
        })]);

        // Send welcome email (async, don't wait for it)
        if (process.env.SMTP_HOST && process.env.SMTP_USER) {
            sendWelcomeEmail({
                firstName,
                lastName,
                email,
                address,
                propertyType,
                score
            }).catch(err => {
                console.error('Failed to send welcome email:', err.message);
            });
        }

        // Send welcome SMS (async, don't wait for it)
        if (phone && process.env.TWILIO_ACCOUNT_SID) {
            sendWelcomeSMS({
                firstName,
                phone,
                address,
                score
            }).catch(err => {
                console.error('Failed to send welcome SMS:', err.message);
            });
        }

        res.json({
            success: true,
            message: 'Lead captured successfully',
            leadId,
            score,
            status: 'new'
        });

    } catch (error) {
        console.error('Lead capture error:', error);
        
        if (error.code === '23505') { // Unique constraint violation
            return res.status(409).json({
                error: 'Email already exists',
                message: 'A lead with this email address already exists'
            });
        }
        
        res.status(500).json({
            error: 'Failed to capture lead',
            message: 'Please try again later'
        });
    }
});

// Get leads with filtering
router.get('/', async (req, res) => {
    try {
        const {
            status,
            minScore = 0,
            limit = 50,
            offset = 0,
            sortBy = 'created_at',
            sortOrder = 'desc'
        } = req.query;

        const db = getDB();
        
        let query = 'SELECT * FROM leads WHERE score >= $1';
        let params = [minScore];
        let paramIndex = 2;

        if (status) {
            const statusArray = status.split(',');
            query += ` AND status = ANY($${paramIndex})`;
            params.push(statusArray);
            paramIndex++;
        }

        query += ` ORDER BY ${sortBy} ${sortOrder.toUpperCase()} LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        params.push(parseInt(limit), parseInt(offset));

        const result = await db.query(query, params);

        res.json({
            leads: result.rows,
            total: result.rows.length,
            filters: { status, minScore, limit, offset }
        });

    } catch (error) {
        console.error('Get leads error:', error);
        res.status(500).json({
            error: 'Failed to retrieve leads'
        });
    }
});

// Get single lead
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const db = getDB();

        const result = await db.query('SELECT * FROM leads WHERE id = $1', [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Lead not found' });
        }

        res.json(result.rows[0]);

    } catch (error) {
        console.error('Get lead error:', error);
        res.status(500).json({ error: 'Failed to retrieve lead' });
    }
});

// Update lead status
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { status, score, comments } = req.body;
        const db = getDB();

        let query = 'UPDATE leads SET updated_at = CURRENT_TIMESTAMP';
        let params = [];
        let paramIndex = 1;

        if (status) {
            query += `, status = $${paramIndex}`;
            params.push(status);
            paramIndex++;
        }

        if (score !== undefined) {
            query += `, score = $${paramIndex}`;
            params.push(score);
            paramIndex++;
        }

        if (comments) {
            query += `, comments = $${paramIndex}`;
            params.push(comments);
            paramIndex++;
        }

        query += ` WHERE id = $${paramIndex} RETURNING *`;
        params.push(id);

        const result = await db.query(query, params);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Lead not found' });
        }

        // Log tracking event
        await db.query(`
            INSERT INTO lead_tracking (lead_id, event, data)
            VALUES ($1, $2, $3)
        `, [id, 'status_updated', JSON.stringify({ status, score, comments })]);

        res.json(result.rows[0]);

    } catch (error) {
        console.error('Update lead error:', error);
        res.status(500).json({ error: 'Failed to update lead' });
    }
});

// Get lead activity
router.get('/:id/activity', async (req, res) => {
    try {
        const { id } = req.params;
        const db = getDB();

        const result = await db.query(`
            SELECT event, data, created_at 
            FROM lead_tracking 
            WHERE lead_id = $1 
            ORDER BY created_at DESC
        `, [id]);

        res.json({ activity: result.rows });

    } catch (error) {
        console.error('Get lead activity error:', error);
        res.status(500).json({ error: 'Failed to retrieve lead activity' });
    }
});

module.exports = router;