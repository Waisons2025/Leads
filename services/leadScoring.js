/**
 * Lead Scoring Algorithm for Waisons Realty
 * Optimized for Southeast Michigan real estate market
 */

function calculateLeadScore(leadData) {
    let score = 0;
    
    const {
        timeframe = 'just-curious',
        propertyType = 'single-family',
        location = '',
        hasPhone = false,
        hasEmail = false,
        source = 'website',
        utm_campaign = '',
        comments = ''
    } = leadData;

    // 1. TIMEFRAME SCORING (0-30 points)
    const timeframeScores = {
        'immediately': 30,
        '1-3-months': 25,
        '3-6-months': 20,
        '6-12-months': 15,
        'just-curious': 5
    };
    score += timeframeScores[timeframe] || 5;

    // 2. PROPERTY TYPE SCORING (0-25 points)
    const propertyTypeScores = {
        'investment': 25,      // High value clients
        'commercial': 25,      // High commission
        'multi-family': 22,    // Good value
        'single-family': 20,   // Standard residential
        'duplex': 18,
        'townhouse': 15,
        'condo': 12,
        'land': 10
    };
    score += propertyTypeScores[propertyType] || 15;

    // 3. LOCATION BONUS (0-15 points)
    // Wayne County, MI focus with primary cities bonus
    const locationText = location.toLowerCase();
    
    // Wayne County primary cities (highest bonus)
    if (locationText.includes('detroit') || 
        locationText.includes('dearborn') || 
        locationText.includes('westland') ||
        locationText.includes('livonia') ||
        locationText.includes('warren') ||
        locationText.includes('taylor')) {
        score += 15; // Major Wayne County cities
    } else if (locationText.includes('allen park') ||
               locationText.includes('lincoln park') ||
               locationText.includes('melvindale') ||
               locationText.includes('wyandotte') ||
               locationText.includes('southgate') ||
               locationText.includes('inkster') ||
               locationText.includes('garden city') ||
               locationText.includes('wayne') ||
               locationText.includes('romulus') ||
               locationText.includes('plymouth') ||
               locationText.includes('canton') ||
               locationText.includes('redford')) {
        score += 12; // Other Wayne County cities
    } else if (locationText.includes('wayne county') ||
               locationText.includes('downriver')) {
        score += 8; // Wayne County region
    } else if (locationText.includes('michigan') || 
               locationText.includes(' mi ')) {
        score += 5; // Michigan resident
    }

    // 4. CONTACT INFORMATION (0-15 points)
    if (hasEmail && hasPhone) {
        score += 15; // Full contact info
    } else if (hasEmail) {
        score += 10; // Email only
    } else if (hasPhone) {
        score += 8; // Phone only
    }

    // 5. LEAD SOURCE QUALITY (0-10 points)
    const sourceScores = {
        'google-ads': 10,
        'facebook-ads': 9,
        'organic-search': 8,
        'referral': 8,
        'website': 7,
        'social-media': 6,
        'email-campaign': 5,
        'other': 3
    };
    score += sourceScores[source] || 5;

    // 6. ENGAGEMENT INDICATORS (0-5 points)
    if (comments && comments.length > 20) {
        score += 5; // Detailed comments show high engagement
    } else if (comments && comments.length > 5) {
        score += 3;
    }

    // UTM campaign bonus
    if (utm_campaign && utm_campaign.includes('premium')) {
        score += 3;
    }

    // Ensure score is within bounds
    return Math.min(Math.max(score, 0), 100);
}

/**
 * Get lead quality tier based on score
 */
function getLeadTier(score) {
    if (score >= 80) return 'hot';
    if (score >= 60) return 'warm';
    if (score >= 40) return 'qualified';
    return 'cold';
}

/**
 * Get recommended follow-up actions based on score
 */
function getRecommendedActions(score, leadData) {
    const actions = [];
    
    if (score >= 80) {
        actions.push('Call within 15 minutes');
        actions.push('Send premium property listings');
        actions.push('Schedule in-person consultation');
    } else if (score >= 60) {
        actions.push('Call within 2 hours');
        actions.push('Send market analysis');
        actions.push('Add to high-priority email sequence');
    } else if (score >= 40) {
        actions.push('Call within 24 hours');
        actions.push('Send welcome email with resources');
        actions.push('Add to nurturing email sequence');
    } else {
        actions.push('Send welcome email');
        actions.push('Add to monthly newsletter');
        actions.push('Follow up in 1 week');
    }

    // Location-specific actions for Wayne County cities
    const locationLower = leadData.location ? leadData.location.toLowerCase() : '';
    if (locationLower.includes('detroit') || locationLower.includes('dearborn') || 
        locationLower.includes('westland') || locationLower.includes('livonia') ||
        locationLower.includes('wayne county')) {
        actions.push('Highlight Wayne County market expertise');
        actions.push('Mention specialization in your city');
    }

    return actions;
}

/**
 * Calculate lead priority for routing
 */
function calculatePriority(score, timeframe) {
    let priority = 'normal';
    
    if (score >= 80 || timeframe === 'immediately') {
        priority = 'urgent';
    } else if (score >= 60 || timeframe === '1-3-months') {
        priority = 'high';
    }
    
    return priority;
}

module.exports = {
    calculateLeadScore,
    getLeadTier,
    getRecommendedActions,
    calculatePriority
};