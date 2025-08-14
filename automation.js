const cron = require('node-cron');
const { getDB } = require('../config/database');
const { sendNewLeadNotification } = require('./email');
const { sendWelcomeSMS, sendFollowUpSMS, sendMarketUpdateSMS } = require('./sms');
const { postMarketUpdate } = require('./social');

let automationRunning = false;

/**
 * Start the automation engine
 */
async function startAutomationEngine() {
    if (automationRunning) {
        console.log('⚠️ Automation engine already running');
        return;
    }

    console.log('🤖 Starting automation engine...');
    automationRunning = true;

    // Run lead nurturing every 5 minutes
    cron.schedule('*/5 * * * *', async () => {
        console.log('🔄 Running lead nurturing automation...');
        await processLeadNurturing();
    });

    // Run daily analytics at midnight
    cron.schedule('0 0 * * *', async () => {
        console.log('📊 Running daily analytics...');
        await generateDailyAnalytics();
    });

    // Post market updates to social media (Monday, Wednesday, Friday at 9 AM)
    cron.schedule('0 9 * * 1,3,5', async () => {
        console.log('📱 Posting market update to social media...');
        await postMarketUpdate();
    });

    // Send weekly SMS market updates (Fridays at 10 AM)
    cron.schedule('0 10 * * 5', async () => {
        console.log('📱 Sending weekly SMS market updates...');
        await sendWeeklySMSUpdates();
    });

    // Send admin notifications for high-score leads every minute
    cron.schedule('* * * * *', async () => {
        await processHighPriorityLeads();
    });

    console.log('✅ Automation engine started successfully');
}

/**
 * Process lead nurturing automation
 */
async function processLeadNurturing() {
    try {
        const db = getDB();
        
        // Skip if in demo mode
        if (!process.env.DATABASE_PRIVATE_URL && !process.env.DATABASE_URL) {
            return;
        }
        
        // Find leads that need follow-up
        const result = await db.query(`
            SELECT id, first_name, last_name, email, phone, score, status, created_at
            FROM leads 
            WHERE status = 'new' 
            AND created_at > NOW() - INTERVAL '24 hours'
            AND created_at < NOW() - INTERVAL '1 hour'
            ORDER BY score DESC
            LIMIT 50
        `);

        for (const lead of result.rows) {
            try {
                // Send notification to admin for high-score leads
                if (lead.score >= 70) {
                    await sendNewLeadNotification(lead);
                }

                // Send welcome SMS to all new leads
                if (lead.phone) {
                    await sendWelcomeSMS({
                        firstName: lead.first_name,
                        phone: lead.phone,
                        address: lead.address || 'your property',
                        score: lead.score
                    }).catch(err => console.error('SMS send failed:', err.message));
                }

                // Update lead status to indicate it's been processed
                await db.query(
                    'UPDATE leads SET status = $1 WHERE id = $2',
                    ['contacted', lead.id]
                );

                // Log the automation activity
                await db.query(`
                    INSERT INTO lead_tracking (lead_id, event, data)
                    VALUES ($1, $2, $3)
                `, [lead.id, 'automation_processed', JSON.stringify({
                    action: 'nurturing_email_sent',
                    score: lead.score,
                    processed_at: new Date()
                })]);

            } catch (error) {
                console.error(`Failed to process lead ${lead.id}:`, error.message);
            }
        }

        if (result.rows.length > 0) {
            console.log(`✅ Processed ${result.rows.length} leads for nurturing`);
        }

    } catch (error) {
        console.error('❌ Lead nurturing automation failed:', error);
    }
}

/**
 * Process high priority leads for immediate notification
 */
async function processHighPriorityLeads() {
    try {
        const db = getDB();
        
        // Skip if in demo mode
        if (!process.env.DATABASE_PRIVATE_URL && !process.env.DATABASE_URL) {
            return;
        }
        
        // Find new high-score leads from the last 5 minutes
        const result = await db.query(`
            SELECT id, first_name, last_name, email, phone, address, 
                   property_type, timeframe, score, comments, created_at
            FROM leads 
            WHERE score >= 80 
            AND status = 'new'
            AND created_at > NOW() - INTERVAL '5 minutes'
            ORDER BY score DESC, created_at DESC
        `);

        for (const lead of result.rows) {
            try {
                // Send immediate notification for hot leads
                await sendNewLeadNotification({
                    firstName: lead.first_name,
                    lastName: lead.last_name,
                    email: lead.email,
                    phone: lead.phone,
                    address: lead.address,
                    propertyType: lead.property_type,
                    timeframe: lead.timeframe,
                    score: lead.score,
                    comments: lead.comments
                });

                // Log the notification
                await db.query(`
                    INSERT INTO lead_tracking (lead_id, event, data)
                    VALUES ($1, $2, $3)
                `, [lead.id, 'urgent_notification_sent', JSON.stringify({
                    score: lead.score,
                    notification_type: 'high_priority_lead',
                    sent_at: new Date()
                })]);

                console.log(`🔥 Urgent notification sent for high-priority lead: ${lead.first_name} ${lead.last_name} (Score: ${lead.score})`);

            } catch (error) {
                console.error(`Failed to send urgent notification for lead ${lead.id}:`, error.message);
            }
        }

    } catch (error) {
        console.error('❌ High priority lead processing failed:', error);
    }
}

/**
 * Generate daily analytics summary
 */
async function generateDailyAnalytics() {
    try {
        const db = getDB();
        
        // Skip if in demo mode
        if (!process.env.DATABASE_PRIVATE_URL && !process.env.DATABASE_URL) {
            console.log('📊 Daily Analytics: Demo mode - no real data available');
            return;
        }
        
        const analyticsQuery = `
            SELECT 
                COUNT(*) as total_leads,
                AVG(score) as avg_score,
                COUNT(CASE WHEN score >= 80 THEN 1 END) as hot_leads,
                COUNT(CASE WHEN score >= 60 AND score < 80 THEN 1 END) as warm_leads,
                COUNT(CASE WHEN timeframe = 'immediately' THEN 1 END) as urgent_leads
            FROM leads 
            WHERE DATE(created_at) = CURRENT_DATE - INTERVAL '1 day'
        `;
        
        const result = await db.query(analyticsQuery);
        const stats = result.rows[0] || {};

        console.log('📊 Daily Analytics Summary:');
        console.log(`   Total Leads: ${stats.total_leads || 0}`);
        console.log(`   Average Score: ${Math.round(stats.avg_score || 0)}`);
        console.log(`   Hot Leads (80+): ${stats.hot_leads || 0}`);
        console.log(`   Warm Leads (60-79): ${stats.warm_leads || 0}`);
        console.log(`   Urgent Timeframe: ${stats.urgent_leads || 0}`);

        // Store daily stats (optional)
        // You could insert this into a daily_analytics table

    } catch (error) {
        console.error('❌ Daily analytics generation failed:', error);
    }
}

/**
 * Stop the automation engine
 */
function stopAutomationEngine() {
    if (!automationRunning) {
        console.log('⚠️ Automation engine not running');
        return;
    }

    console.log('🛑 Stopping automation engine...');
    automationRunning = false;
    
    // Note: node-cron doesn't provide a direct way to stop all tasks
    // In production, you might want to track task references
    
    console.log('✅ Automation engine stopped');
}

/**
 * Get automation status
 */
function getAutomationStatus() {
    return {
        running: automationRunning,
        startTime: automationRunning ? new Date() : null,
        features: [
            'Lead nurturing (every 5 minutes)',
            'High-priority notifications (every minute)', 
            'Daily analytics (midnight)',
            'Email automation',
            'Lead scoring updates'
        ]
    };
}

module.exports = {
    startAutomationEngine,
    stopAutomationEngine,
    getAutomationStatus,
    processLeadNurturing,
    processHighPriorityLeads
};