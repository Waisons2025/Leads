const twilio = require('twilio');

// Initialize Twilio client
function createTwilioClient() {
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
        console.warn('⚠️ Twilio configuration missing. SMS will not be sent.');
        return null;
    }

    return twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
}

/**
 * Send welcome SMS to new leads
 */
async function sendWelcomeSMS(leadData) {
    const client = createTwilioClient();
    if (!client || !leadData.phone) return;

    const { firstName, phone, address, score } = leadData;
    const fromNumber = process.env.SMS_FROM || process.env.TWILIO_PHONE_NUMBER;

    const message = `Hi ${firstName}! Thanks for requesting a home valuation for ${address}. We're preparing your market analysis and will call you within 24 hours. Questions? Reply STOP to opt out. - Waisons Realty (313) 769-5353`;

    try {
        const messageData = {
            body: message,
            to: phone
        };

        // Use Messaging Service if available, otherwise use phone number
        if (process.env.TWILIO_MESSAGING_SERVICE_SID) {
            messageData.messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;
        } else {
            messageData.from = fromNumber;
        }

        const result = await client.messages.create(messageData);

        console.log('✅ Welcome SMS sent:', result.sid);
        return result;

    } catch (error) {
        console.error('❌ Failed to send welcome SMS:', error.message);
        throw error;
    }
}

/**
 * Send follow-up SMS nurturing sequence
 */
async function sendFollowUpSMS(leadData, sequenceStep = 1) {
    const client = createTwilioClient();
    if (!client || !leadData.phone) return;

    const { firstName, phone, address, score } = leadData;
    const fromNumber = process.env.SMS_FROM || process.env.TWILIO_PHONE_NUMBER;

    const messages = {
        1: `Hi ${firstName}, this is Waisons Realty. Your ${address} market analysis is ready! We found some great comparable sales. Can we schedule a 10-min call to review? Reply YES or call (313) 769-5353`,
        
        2: `${firstName}, did you see your home valuation report? Properties in your area are selling fast! Wayne County market is hot right now. Let's chat about your options: (313) 769-5353`,
        
        3: `Hi ${firstName}, final follow-up on your ${address} valuation. We're here when you're ready to explore selling options. Your Wayne County location has great potential! - Waisons Realty`,
        
        urgent: `🔥 ${firstName}, your property score is ${score}/100 - that's excellent! Wayne County homes like yours are in high demand. Let's talk ASAP: (313) 769-5353 - Waisons Realty`
    };

    const messageText = score >= 80 ? messages.urgent : messages[sequenceStep];
    
    try {
        const messageData = {
            body: messageText,
            to: phone
        };

        if (process.env.TWILIO_MESSAGING_SERVICE_SID) {
            messageData.messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;
        } else {
            messageData.from = fromNumber;
        }

        const result = await client.messages.create(messageData);

        console.log(`✅ Follow-up SMS ${sequenceStep} sent:`, result.sid);
        return result;

    } catch (error) {
        console.error(`❌ Failed to send follow-up SMS ${sequenceStep}:`, error.message);
        throw error;
    }
}

/**
 * Send market update SMS
 */
async function sendMarketUpdateSMS(leadData) {
    const client = createTwilioClient();
    if (!client || !leadData.phone) return;

    const { firstName, phone, address } = leadData;
    const fromNumber = process.env.SMS_FROM || process.env.TWILIO_PHONE_NUMBER;

    const marketUpdates = [
        `${firstName}, Wayne County home prices are up 8% this month! Your ${address} value may have increased. Want an updated analysis? Call (313) 769-5353 - Waisons Realty`,
        
        `Market alert ${firstName}! 3 homes sold in your neighborhood this week. Interest rates are still favorable. Perfect time to sell ${address}? Let's discuss: (313) 769-5353`,
        
        `${firstName}, Wayne County inventory is low = higher prices for sellers! Your ${address} could benefit. Free consultation available: (313) 769-5353 - Waisons Realty`
    ];

    const message = marketUpdates[Math.floor(Math.random() * marketUpdates.length)];

    try {
        const messageData = {
            body: message,
            to: phone
        };

        if (process.env.TWILIO_MESSAGING_SERVICE_SID) {
            messageData.messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;
        } else {
            messageData.from = fromNumber;
        }

        const result = await client.messages.create(messageData);

        console.log('✅ Market update SMS sent:', result.sid);
        return result;

    } catch (error) {
        console.error('❌ Failed to send market update SMS:', error.message);
        throw error;
    }
}

/**
 * Send appointment reminder SMS
 */
async function sendAppointmentReminderSMS(leadData, appointmentTime) {
    const client = createTwilioClient();
    if (!client || !leadData.phone) return;

    const { firstName, phone } = leadData;
    const fromNumber = process.env.SMS_FROM || process.env.TWILIO_PHONE_NUMBER;

    const message = `Hi ${firstName}, reminder: Your Waisons Realty consultation is tomorrow at ${appointmentTime}. We specialize in Wayne County real estate. Questions? (313) 769-5353`;

    try {
        const messageData = {
            body: message,
            to: phone
        };

        if (process.env.TWILIO_MESSAGING_SERVICE_SID) {
            messageData.messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;
        } else {
            messageData.from = fromNumber;
        }

        const result = await client.messages.create(messageData);

        console.log('✅ Appointment reminder SMS sent:', result.sid);
        return result;

    } catch (error) {
        console.error('❌ Failed to send appointment reminder:', error.message);
        throw error;
    }
}

/**
 * Test SMS configuration
 */
async function testSMSConfig() {
    const client = createTwilioClient();
    if (!client) {
        return { success: false, message: 'Twilio configuration missing' };
    }

    try {
        // Test account validation (doesn't send SMS)
        const account = await client.api.accounts(process.env.TWILIO_ACCOUNT_SID).fetch();
        return { 
            success: true, 
            message: 'Twilio configuration is valid',
            accountSid: account.sid.substring(0, 10) + '...'
        };
    } catch (error) {
        return { success: false, message: error.message };
    }
}

module.exports = {
    sendWelcomeSMS,
    sendFollowUpSMS,
    sendMarketUpdateSMS,
    sendAppointmentReminderSMS,
    testSMSConfig,
    createTwilioClient
};