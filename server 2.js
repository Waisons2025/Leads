const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const path = require('path');
require('dotenv').config();

// Import database connection
const { connectDB, getDB } = require('./config/database');

// Import routes
const leadsRoutes = require('./routes/leads');
const analyticsRoutes = require('./routes/analytics');
const webhooksRoutes = require('./routes/webhooks');

// Import services
const { startAutomationEngine } = require('./services/automation');

const app = express();
const PORT = process.env.PORT || 3000;

// Trust Railway proxy for rate limiting
app.set('trust proxy', 1);

// Security middleware (relaxed for debugging)
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
            imgSrc: ["'self'", "data:", "https:", "http:"],
            fontSrc: ["'self'", "https://cdnjs.cloudflare.com", "data:"],
            connectSrc: ["'self'", "http://localhost:3000"]
        }
    }
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
});

app.use(limiter);

// Stricter rate limiting for lead capture
const leadLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 20, // Increased limit for testing - 20 submissions per hour
    message: {
        error: 'Too many lead submissions from this IP, please try again later.',
        retryAfter: 'Please wait before submitting another request.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        res.status(429).json({
            error: 'Too many lead submissions from this IP, please try again later.',
            retryAfter: Math.round(req.rateLimit.resetTime / 1000),
            message: 'Rate limit exceeded. Please try again later.'
        });
    }
});

// Middleware
app.use(cors({
    origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files
app.use(express.static('public'));

// Debug middleware for leads API specifically
app.use('/api/leads', (req, res, next) => {
    console.log(`🔍 LEADS API: ${req.method} ${req.originalUrl} (path: ${req.path})`);
    next();
});

// API Routes
app.use('/api/leads', leadLimiter, leadsRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/webhooks', webhooksRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        database: process.env.DATABASE_URL ? 'Railway PostgreSQL Connected' : 'Test Mode (No Database)'
    });
});

// Serve main landing page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Serve dashboard
app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// Debug form route
app.get('/debug', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'debug-form.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err.stack);
    
    if (err.type === 'entity.too.large') {
        return res.status(413).json({ error: 'Request too large' });
    }
    
    res.status(500).json({ 
        error: 'Something went wrong!',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// Start server
async function startServer() {
    try {
        // Connect to Railway PostgreSQL
        const dbConnected = await connectDB();
        if (dbConnected) {
            console.log('✅ Railway PostgreSQL connected successfully');
        } else {
            console.log('⚠️ Running without database connection');
        }
        
        // Start automation engine (only if database is connected)
        if (dbConnected) {
            await startAutomationEngine();
            console.log('✅ Automation engine started');
        } else {
            console.log('⚠️ Automation engine disabled (no database)');
        }
        
        // Start HTTP server
        app.listen(PORT, () => {
            console.log(`🚀 Server running on port ${PORT}`);
            console.log(`📊 Dashboard: http://localhost:${PORT}/dashboard`);
            console.log(`🏠 Landing page: http://localhost:${PORT}`);
            console.log(`💾 Database: ${dbConnected ? 'Railway PostgreSQL (Production Ready)' : 'Test Mode (No Database)'}`);
        });
        
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('SIGTERM received, shutting down gracefully');
    process.exit(0);
});

process.on('SIGINT', async () => {
    console.log('SIGINT received, shutting down gracefully');
    process.exit(0);
});

startServer();