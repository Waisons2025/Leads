# Waisons Realty - Lead Automation System

A complete real estate lead generation and automation platform built for Waisons Realty, serving Allen Park and Southeast Michigan.

## 🚀 Features

- **Lead Capture**: Beautiful landing page with form optimization
- **Lead Scoring**: Intelligent 100-point scoring system
- **Email Automation**: Customized drip campaigns and follow-ups  
- **SMS Integration**: Twilio-powered text messaging
- **CRM Sync**: Mailchimp, Google Sheets, and Zapier integration
- **Analytics Dashboard**: Real-time performance tracking
- **Territory Focus**: Southeast Michigan market specialization

## 📋 Prerequisites

- **Node.js** (v16 or higher)
- **Railway Account** (free tier available)
- **npm** or **yarn**

## 🛠️ Installation

### 1. Clone/Extract the Project
```bash
# If using git
git clone <repository-url>
cd waisons-realty-lead-automation

# If using the zip file
unzip waisons-realty-lead-automation.zip
cd waisons-realty-lead-automation
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Setup Railway Database

#### Railway Deployment (Recommended - Production Ready)
1. Go to [Railway.app](https://railway.app)
2. Sign up for a free account
3. Click "New Project" → "Deploy from GitHub repo"
4. Connect your GitHub repository
5. Add PostgreSQL database service
6. Railway automatically provides `DATABASE_URL`

#### Local Development (Optional)
```bash
# Install PostgreSQL locally
brew install postgresql
brew services start postgresql

# Create database
createdb waisons_realty
```

### 4. Environment Configuration
```bash
# Copy the example environment file
cp .env.example .env

# Edit .env with your settings
nano .env
```

**Railway Database Configuration:**
```env
# For local development
DATABASE_URL=postgresql://localhost:5432/waisons_realty

# Railway automatically sets DATABASE_URL in production
# No manual configuration needed!
```

**Email Configuration (Required):**
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM=admin@waisonsrealty.com
```

### 5. Start the Application
```bash
# Development mode
npm run dev

# Production mode  
npm start
```

## 🌐 Access Points

- **Landing Page**: http://localhost:3000
- **Dashboard**: http://localhost:3000/dashboard
- **Health Check**: http://localhost:3000/api/health

## 📊 Database Tables

The system automatically creates these PostgreSQL tables:

- `leads` - Lead information and scoring
- `email_activity` - Email tracking and analytics  
- `sms_activity` - SMS message logs
- `scheduled_followups` - Automated follow-up tasks
- `lead_tracking` - Lead interaction history

**Why PostgreSQL over MongoDB?**
- ✅ Better performance for relational data
- ✅ ACID compliance for data integrity
- ✅ Railway's native support
- ✅ Cost-effective scaling
- ✅ SQL queries for complex analytics

## 🔧 Configuration Options

### Lead Scoring System
- **Timeframe**: Immediate (30 pts), 1-3 months (25 pts), etc.
- **Location**: Allen Park bonus (+10 pts)
- **Property Type**: Single family (20 pts), Investment (25 pts)
- **Contact Quality**: Phone + Email (10 pts)

### Email Templates
- Welcome sequence (3 emails)
- Market updates (weekly)
- Follow-up reminders
- Nurturing campaigns

### Integration Options
- **Mailchimp**: Automatic list synchronization
- **Google Sheets**: Lead data export
- **Zapier**: 1000+ app connections
- **Twilio**: SMS notifications and campaigns

## 🚨 Production Deployment

### Railway Environment Variables:
```env
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://...  # Automatically provided by Railway
ALLOWED_ORIGINS=https://waisonsrealty.com
```

### Railway Deployment Steps:
1. Push code to GitHub
2. Connect Railway to your repository
3. Add PostgreSQL database service
4. Set environment variables in Railway dashboard
5. Deploy automatically on every push

### Security Checklist:
- ✅ Rate limiting enabled (100 req/15min, 5 leads/hour)
- ✅ Helmet.js security headers
- ✅ CORS configuration
- ✅ Input validation and sanitization
- ✅ MongoDB injection protection

## 📱 API Endpoints

### Leads
- `POST /api/leads/capture` - Capture new lead
- `GET /api/leads` - Get leads with filtering
- `PUT /api/leads/:id` - Update lead status
- `GET /api/leads/:id/activity` - Get lead activity

### Analytics  
- `GET /api/analytics/dashboard` - Dashboard metrics
- `GET /api/analytics/leads/sources` - Lead source breakdown
- `GET /api/analytics/conversion-funnel` - Conversion analytics

### Webhooks
- `POST /api/webhooks/mailchimp` - Mailchimp integration
- `POST /api/webhooks/twilio` - SMS status updates

## 🔍 Monitoring

Check application health:
```bash
curl http://localhost:3000/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z", 
  "database": "MongoDB Connected"
}
```

## 🆘 Troubleshooting

### Railway PostgreSQL Connection Issues
```bash
# Check if PostgreSQL is running locally
brew services list | grep postgresql

# Test local connection
psql postgresql://localhost:5432/waisons_realty

# Check Railway logs
railway logs
```

### Common Fixes
- **Port 3000 in use**: Change `PORT` in .env
- **Email not sending**: Verify SMTP credentials and app passwords
- **Leads not saving**: Check Railway PostgreSQL connection and permissions

## 📞 Support

For technical support or customizations:
- Email: admin@waisonsrealty.com  
- Phone: (313) 769-5353
- Address: 7311 Park Ave., Allen Park, MI 48122

## 🎯 Southeast Michigan Focus

This system is specifically optimized for:
- Allen Park (company headquarters)
- Dearborn, Warren, Southfield
- Metro Detroit area
- Wayne County real estate market

---

**Built for Waisons Realty** - Professional real estate lead automation serving Southeast Michigan since 2024.