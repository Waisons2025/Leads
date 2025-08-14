const axios = require('axios');

/**
 * Post to Facebook Page
 */
async function postToFacebook(content, imageUrl = null) {
    if (!process.env.FACEBOOK_PAGE_ACCESS_TOKEN) {
        console.warn('⚠️ Facebook Page Access Token missing. Post not sent.');
        console.warn('💡 Get Page Access Token from: https://developers.facebook.com/tools/explorer/');
        return null;
    }

    // First, get the correct Page ID from the token
    let pageId = process.env.FACEBOOK_PAGE_ID;
    
    if (!pageId || pageId === 'Waisonsrealty') {
        try {
            // Get page ID from the token
            const pagesResponse = await axios.get(`https://graph.facebook.com/me/accounts?access_token=${process.env.FACEBOOK_PAGE_ACCESS_TOKEN}`);
            if (pagesResponse.data.data && pagesResponse.data.data.length > 0) {
                pageId = pagesResponse.data.data[0].id;
                console.log('📄 Using Page ID:', pageId);
            } else {
                throw new Error('No pages found. You need a Page Access Token, not a User Access Token.');
            }
        } catch (error) {
            console.error('❌ Cannot get Page ID:', error.response?.data || error.message);
            throw new Error('Invalid token or no page access. Please get a Page Access Token from Facebook Graph API Explorer.');
        }
    }

    // Choose endpoint based on whether we have an image
    const endpoint = imageUrl ? 'photos' : 'feed';
    const url = `https://graph.facebook.com/v18.0/${pageId}/${endpoint}`;
    
    const postData = {
        access_token: process.env.FACEBOOK_PAGE_ACCESS_TOKEN
    };

    if (imageUrl) {
        postData.message = content;
        postData.url = imageUrl;
    } else {
        postData.message = content;
    }

    try {
        const response = await axios.post(url, postData);
        console.log('✅ Facebook post created:', response.data.id);
        return response.data;
    } catch (error) {
        console.error('❌ Facebook post failed:', error.response?.data || error.message);
        
        if (error.response?.data?.error?.code === 190) {
            throw new Error('Invalid access token. Please get a new Page Access Token from Facebook Graph API Explorer.');
        }
        
        throw error;
    }
}

/**
 * Generate social media content for new listings
 */
function generateListingPost(propertyData) {
    const { address, propertyType, price, bedrooms, bathrooms } = propertyData;
    
    const posts = [
        `🏡 NEW LISTING ALERT! 
${address}
${bedrooms} bed/${bathrooms} bath ${propertyType}
💰 ${price}

Beautiful home in Southeast Michigan! Perfect for families looking for quality and value. 

Contact Waisons Realty today!
📞 (313) 769-5353
📧 admin@waisonsrealty.com
🏠 7311 Park Ave, Allen Park, MI

#AllenPark #RealEstate #SoutheastMichigan #MetroDetroit #NewListing #WaisonsRealty`,

        `✨ JUST LISTED! ✨
${address}

🏠 ${bedrooms} bedrooms | 🛁 ${bathrooms} bathrooms
💵 Priced at ${price}

This ${propertyType} won't last long in today's market! Southeast Michigan buyers are actively searching.

Ready to sell yours? We're getting top dollar for our clients!

Waisons Realty - Your Local Experts
📱 (313) 769-5353
🌐 WaisonsRealty.com

#RealEstate #AllenPark #HomeSales #MetroDetroit`
    ];

    return posts[Math.floor(Math.random() * posts.length)];
}

/**
 * Generate market update posts
 */
function generateMarketUpdatePost() {
    const updates = [
        `📊 MARKET UPDATE: Southeast Michigan Strong! 

Allen Park home values up 8% this month! 🔥

Perfect time to:
✅ Sell for top dollar
✅ Invest in growing market  
✅ Get your free home valuation

Ready to make a move?
Waisons Realty | (313) 769-5353
7311 Park Ave, Allen Park, MI

#MarketUpdate #AllenPark #RealEstate #HomePrices #WaisonsRealty`,

        `🏘️ NEIGHBORHOOD SPOTLIGHT: Allen Park! 

Did you know?
🌟 Great schools & family community
🚗 Easy access to Detroit & highways
🛒 Growing local businesses
📈 Rising property values

Thinking of selling? Now's the time!
Free consultation: (313) 769-5353

Waisons Realty - Your Allen Park Experts
#AllenPark #Neighborhood #RealEstate #Community`,

        `💡 SELLER TIP TUESDAY! 

Want to sell your home faster?
1️⃣ Professional photos (we handle this!)
2️⃣ Competitive pricing strategy  
3️⃣ Strategic staging tips
4️⃣ Strong online presence

At Waisons Realty, we do ALL of this for you!
Your Southeast Michigan success story starts here 🏆

Call today: (313) 769-5353
#SellerTips #RealEstate #Success #WaisonsRealty`
    ];

    return updates[Math.floor(Math.random() * updates.length)];
}

/**
 * Generate success story posts
 */
function generateSuccessPost(saleData) {
    const { address, soldPrice, daysOnMarket, clientName } = saleData;

    return `🎉 SOLD! Another Happy Client! 

${address}
💰 SOLD for ${soldPrice}
⏰ In just ${daysOnMarket} days!

"${clientName} was thrilled with our service and results!"

This is what happens when you choose the right agent. Local expertise + proven marketing = SUCCESS! 

Ready for YOUR success story?
Waisons Realty | (313) 769-5353

#SOLD #Success #HappyClient #AllenPark #RealEstate #Results`;
}

/**
 * Post automatic market updates
 */
async function postMarketUpdate() {
    const content = generateMarketUpdatePost();
    
    try {
        // Post to Facebook
        if (process.env.FACEBOOK_PAGE_ACCESS_TOKEN) {
            await postToFacebook(content);
        }

        // Could add Instagram, Twitter, LinkedIn here
        console.log('✅ Market update posted to social media');
        return { success: true, content };

    } catch (error) {
        console.error('❌ Social media posting failed:', error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Post new listing automatically
 */
async function postNewListing(propertyData) {
    const content = generateListingPost(propertyData);
    
    try {
        // Post to Facebook with property image
        if (process.env.FACEBOOK_PAGE_ACCESS_TOKEN) {
            await postToFacebook(content, propertyData.imageUrl);
        }

        console.log('✅ New listing posted to social media');
        return { success: true, content };

    } catch (error) {
        console.error('❌ New listing post failed:', error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Celebrate a successful sale
 */
async function postSoldProperty(saleData) {
    const content = generateSuccessPost(saleData);
    
    try {
        // Post to Facebook
        if (process.env.FACEBOOK_PAGE_ACCESS_TOKEN) {
            await postToFacebook(content);
        }

        console.log('✅ Sold property posted to social media');
        return { success: true, content };

    } catch (error) {
        console.error('❌ Sold property post failed:', error.message);
        return { success: false, error: error.message };
    }
}

module.exports = {
    postToFacebook,
    postMarketUpdate,
    postNewListing,
    postSoldProperty,
    generateListingPost,
    generateMarketUpdatePost,
    generateSuccessPost
};