const nodemailer = require('nodemailer');

// Create email transporter
function createTransporter() {
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
        console.warn('⚠️ Email configuration missing. Emails will not be sent.');
        return null;
    }

    return nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        }
    });
}

/**
 * Send welcome email to new leads
 */
async function sendWelcomeEmail(leadData) {
    const transporter = createTransporter();
    if (!transporter) return;

    const { firstName, lastName, email, address, propertyType, score } = leadData;

    const subject = `Thank you for your home valuation request, ${firstName}!`;
    
    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #1e3a5f 0%, #2c5282 100%); color: white; padding: 2rem; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f8f9fa; padding: 2rem; }
            .highlight { background: #e3f2fd; padding: 1rem; border-left: 4px solid #1e3a5f; margin: 1rem 0; }
            .footer { background: #333; color: white; padding: 1rem; text-align: center; border-radius: 0 0 8px 8px; }
            .btn { display: inline-block; background: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 10px 0; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Waisons Realty</h1>
                <p>Wayne County's Trusted Real Estate Partner</p>
            </div>
            
            <div class="content">
                <h2>Hello ${firstName}!</h2>
                
                <p>Thank you for requesting a free home valuation for your property at <strong>${address}</strong>.</p>
                
                <div class="highlight">
                    <h3>What Happens Next:</h3>
                    <ul>
                        <li>📊 We're preparing your comprehensive market analysis</li>
                        <li>📞 You'll receive a call within 24 hours</li>
                        <li>📧 Detailed valuation report sent via email</li>
                        <li>🏠 Optional in-person consultation available</li>
                    </ul>
                </div>
                
                <p><strong>Property Type:</strong> ${propertyType.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}</p>
                
                <div class="highlight">
                    <h3>Why Choose Waisons Realty?</h3>
                    <ul>
                        <li>🏆 154+ successful transactions</li>
                        <li>📍 Wayne County specialists with local expertise</li>
                        <li>📊 Data-driven market analysis</li>
                        <li>⚡ Quick response within 24 hours</li>
                    </ul>
                </div>
                
                <p>Have questions? Reply to this email or call us at <strong>(313) 769-5353</strong>.</p>
                
                <a href="https://waisonsrealty.com" class="btn">Visit Our Website</a>
            </div>
            
            <div class="footer">
                <p><strong>Waisons Realty</strong> | Licensed Real Estate Brokerage</p>
                <p>Serving Wayne County, Michigan</p>
                <p>Email: admin@waisonsrealty.com | Phone: (313) 769-5353</p>
                <p>Serving All of Wayne County (Detroit, Dearborn, Westland & More)</p>
            </div>
        </div>
    </body>
    </html>
    `;

    const textContent = `
Hello ${firstName}!

Thank you for requesting a free home valuation for your property at ${address}.

What Happens Next:
- We're preparing your comprehensive market analysis
- You'll receive a call within 24 hours  
- Detailed valuation report sent via email
- Optional in-person consultation available

Property Type: ${propertyType.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}

Why Choose Waisons Realty?
- 154+ successful transactions
- Wayne County specialists with local expertise  
- Data-driven market analysis
- Quick response within 24 hours

Have questions? Reply to this email or call us at (313) 769-5353.

Waisons Realty | Licensed Real Estate Brokerage
Serving Wayne County, Michigan
Email: admin@waisonsrealty.com | Phone: (313) 769-5353
Serving All of Wayne County (Detroit, Dearborn, Westland & More)
    `;

    try {
        const info = await transporter.sendMail({
            from: `"${process.env.BUSINESS_NAME || 'Waisons Realty'}" <${process.env.EMAIL_FROM || process.env.SMTP_USER}>`,
            to: email,
            subject: subject,
            text: textContent,
            html: htmlContent
        });

        console.log('✅ Welcome email sent:', info.messageId);
        return info;

    } catch (error) {
        console.error('❌ Failed to send welcome email:', error.message);
        throw error;
    }
}

/**
 * Send notification to admin about new lead
 */
async function sendNewLeadNotification(leadData) {
    const transporter = createTransporter();
    if (!transporter) return;

    const { firstName, lastName, email, phone, address, propertyType, timeframe, score, comments } = leadData;

    const subject = `🔥 New Lead: ${firstName} ${lastName} (Score: ${score})`;
    
    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body { font-family: Arial, sans-serif; }
            .lead-card { background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #28a745; }
            .score-high { color: #28a745; font-weight: bold; }
            .score-medium { color: #ffc107; font-weight: bold; }  
            .score-low { color: #dc3545; font-weight: bold; }
        </style>
    </head>
    <body>
        <h2>New Lead Captured!</h2>
        
        <div class="lead-card">
            <h3>${firstName} ${lastName}</h3>
            <p><strong>Score:</strong> <span class="score-${score >= 70 ? 'high' : score >= 40 ? 'medium' : 'low'}">${score}/100</span></p>
            
            <p><strong>Contact:</strong><br>
            Email: <a href="mailto:${email}">${email}</a><br>
            ${phone ? `Phone: <a href="tel:${phone}">${phone}</a><br>` : ''}
            </p>
            
            <p><strong>Property:</strong><br>
            Address: ${address}<br>
            Type: ${propertyType}<br>
            Timeframe: ${timeframe}
            </p>
            
            ${comments ? `<p><strong>Comments:</strong><br>${comments}</p>` : ''}
            
            <p><strong>Next Steps:</strong></p>
            <ul>
                ${score >= 80 ? '<li>🔥 HIGH PRIORITY - Call within 15 minutes</li>' : ''}
                ${score >= 60 ? '<li>📞 Call within 2 hours</li>' : '<li>📞 Call within 24 hours</li>'}
                <li>📊 Prepare market analysis</li>
                <li>📧 Send follow-up email</li>
            </ul>
        </div>
    </body>
    </html>
    `;

    try {
        const adminEmail = process.env.BUSINESS_EMAIL || process.env.EMAIL_FROM || process.env.SMTP_USER;
        
        const info = await transporter.sendMail({
            from: `"${process.env.BUSINESS_NAME || 'Waisons Realty'} System" <${process.env.SMTP_USER}>`,
            to: adminEmail,
            subject: subject,
            html: htmlContent
        });

        console.log('✅ Admin notification sent:', info.messageId);
        return info;

    } catch (error) {
        console.error('❌ Failed to send admin notification:', error.message);
        throw error;
    }
}

/**
 * Test email configuration
 */
async function testEmailConfig() {
    const transporter = createTransporter();
    if (!transporter) {
        return { success: false, message: 'Email configuration missing' };
    }

    try {
        await transporter.verify();
        return { success: true, message: 'Email configuration is valid' };
    } catch (error) {
        return { success: false, message: error.message };
    }
}

module.exports = {
    sendWelcomeEmail,
    sendNewLeadNotification,
    testEmailConfig,
    createTransporter
};