const { Pool } = require('pg');

let pool = null;

// Railway PostgreSQL - Use PRIVATE endpoint to avoid egress fees
// Railway automatically provides DATABASE_PRIVATE_URL in production
const DATABASE_URL = process.env.DATABASE_PRIVATE_URL || process.env.DATABASE_URL;

async function connectDB() {
    try {
        console.log('DEBUG - DATABASE_URL:', DATABASE_URL);
        console.log('DEBUG - DATABASE_PRIVATE_URL:', process.env.DATABASE_PRIVATE_URL);
        console.log('DEBUG - process.env.DATABASE_URL:', process.env.DATABASE_URL);
        
        if (!DATABASE_URL || DATABASE_URL.trim() === '') {
            console.log('⚠️ No database URL configured - running in test mode');
            return null;
        }
        
        console.log('🔄 Connecting to Railway PostgreSQL...');
        
        pool = new Pool({
            connectionString: DATABASE_URL,
            ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
            max: 20,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 2000,
        });

        // Test the connection
        const client = await pool.connect();
        await client.query('SELECT NOW()');
        client.release();
        
        console.log('✅ Railway PostgreSQL connected successfully');
        
        // Create tables if they don't exist
        await createTables();
        
        return pool;
    } catch (error) {
        console.error('❌ Railway PostgreSQL connection failed:', error.message);
        if (process.env.NODE_ENV === 'production') {
            throw error;
        } else {
            console.log('⚠️ Running in test mode without database');
            return null;
        }
    }
}

async function createTables() {
    try {
        console.log('🔧 Creating database tables...');
        
        // Leads table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS leads (
                id SERIAL PRIMARY KEY,
                first_name VARCHAR(100) NOT NULL,
                last_name VARCHAR(100) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                phone VARCHAR(20),
                address TEXT,
                property_type VARCHAR(50),
                timeframe VARCHAR(50),
                comments TEXT,
                score INTEGER DEFAULT 0,
                status VARCHAR(50) DEFAULT 'new',
                source VARCHAR(100),
                utm_source VARCHAR(100),
                utm_medium VARCHAR(100), 
                utm_campaign VARCHAR(100),
                page_url TEXT,
                referrer TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Email activity table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS email_activity (
                id SERIAL PRIMARY KEY,
                lead_id INTEGER REFERENCES leads(id),
                email_type VARCHAR(100),
                subject VARCHAR(255),
                status VARCHAR(50),
                sent_at TIMESTAMP,
                opened_at TIMESTAMP,
                clicked_at TIMESTAMP,
                bounced_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // SMS activity table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS sms_activity (
                id SERIAL PRIMARY KEY,
                lead_id INTEGER REFERENCES leads(id),
                message TEXT,
                status VARCHAR(50),
                sent_at TIMESTAMP,
                delivered_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Scheduled followups table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS scheduled_followups (
                id SERIAL PRIMARY KEY,
                lead_id INTEGER REFERENCES leads(id),
                type VARCHAR(50),
                scheduled_for TIMESTAMP,
                status VARCHAR(50) DEFAULT 'pending',
                data JSONB,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Lead tracking table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS lead_tracking (
                id SERIAL PRIMARY KEY,
                lead_id INTEGER REFERENCES leads(id),
                event VARCHAR(100),
                data JSONB,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Create indexes for better performance
        await createIndexes();
        
        console.log('✅ Database tables created successfully');
    } catch (error) {
        console.warn('⚠️ Some tables may already exist:', error.message);
    }
}

async function createIndexes() {
    try {
        const indexes = [
            'CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);',
            'CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);',
            'CREATE INDEX IF NOT EXISTS idx_leads_score ON leads(score DESC);',
            'CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);',
            'CREATE INDEX IF NOT EXISTS idx_leads_source ON leads(source);',
            'CREATE INDEX IF NOT EXISTS idx_email_activity_lead_id ON email_activity(lead_id);',
            'CREATE INDEX IF NOT EXISTS idx_sms_activity_lead_id ON sms_activity(lead_id);',
            'CREATE INDEX IF NOT EXISTS idx_scheduled_followups_lead_id ON scheduled_followups(lead_id);',
            'CREATE INDEX IF NOT EXISTS idx_scheduled_followups_scheduled_for ON scheduled_followups(scheduled_for);',
            'CREATE INDEX IF NOT EXISTS idx_lead_tracking_lead_id ON lead_tracking(lead_id);'
        ];

        for (const indexQuery of indexes) {
            await pool.query(indexQuery);
        }
        
        console.log('✅ Database indexes created successfully');
    } catch (error) {
        console.warn('⚠️ Some indexes may already exist:', error.message);
    }
}

function getDB() {
    if (!pool) {
        throw new Error('Database not connected. Call connectDB() first.');
    }
    return pool;
}

async function closeDB() {
    if (pool) {
        await pool.end();
        console.log('📴 Railway PostgreSQL connection closed');
    }
}

// Health check function
async function checkDBHealth() {
    try {
        if (!pool) return { status: 'disconnected' };
        
        const client = await pool.connect();
        const result = await client.query('SELECT NOW(), version()');
        client.release();
        
        return {
            status: 'connected',
            database: 'PostgreSQL',
            version: result.rows[0].version,
            timestamp: result.rows[0].now,
            totalConnections: pool.totalCount,
            idleConnections: pool.idleCount
        };
    } catch (error) {
        return { 
            status: 'error', 
            message: error.message 
        };
    }
}

module.exports = {
    connectDB,
    getDB,
    closeDB,
    checkDBHealth
};
