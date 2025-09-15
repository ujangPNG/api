// api/visitor.js
export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Max-Age', '86400');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const JSONBIN_API_KEY = process.env.JSONBIN_API_KEY;
  const VISITOR_BIN_ID = process.env.VISITOR;
  
  if (!JSONBIN_API_KEY || !VISITOR_BIN_ID) {
    return res.status(500).json({ error: 'Visitor tracking configuration error' });
  }

  try {
    if (req.method === 'POST') {
      const visitorData = req.body;
      
      if (!visitorData) {
        return res.status(400).json({ error: 'Visitor data required' });
      }

      // Get visitor's IP from headers (Vercel provides this)
      const ip = req.headers['x-forwarded-for'] || 
                 req.headers['x-real-ip'] || 
                 req.connection.remoteAddress || 
                 'unknown';

      // Get location data from IP using ipapi.co (free service)
      let locationData = {};
      try {
        const locationResponse = await fetch(`https://ipapi.co/${ip.split(',')[0]}/json/`);
        if (locationResponse.ok) {
          locationData = await locationResponse.json();
        }
      } catch (error) {
        console.log('Location lookup failed:', error);
      }

      // Prepare visitor entry
      const timestamp = new Date().toISOString();
      const visitorEntry = {
        timestamp,
        ip: ip.split(',')[0], // Get first IP if multiple
        userAgent: visitorData.userAgent || 'unknown',
        referrer: visitorData.referrer || 'direct',
        url: visitorData.url || 'unknown',
        screenResolution: visitorData.screenResolution || 'unknown',
        language: visitorData.language || 'unknown',
        timezone: visitorData.timezone || 'unknown',
        country: locationData.country_name || 'unknown',
        countryCode: locationData.country_code || 'unknown',
        region: locationData.region || 'unknown',
        city: locationData.city || 'unknown',
        latitude: locationData.latitude || null,
        longitude: locationData.longitude || null,
        isp: locationData.org || 'unknown',
        detectionReason: visitorData.detectionReason || 'unknown'
      };

      // Get existing data from JSONBin
      const getResponse = await fetch(`https://api.jsonbin.io/v3/b/${VISITOR_BIN_ID}/latest`, {
        headers: {
          'X-Master-Key': JSONBIN_API_KEY,
          'X-Bin-Meta': 'false'
        }
      });

      let visitorDatabase = { visitors: [] };
      if (getResponse.ok) {
        visitorDatabase = await getResponse.json();
        if (!visitorDatabase.visitors) {
          visitorDatabase.visitors = [];
        }
      }

      // Add new visitor entry
      visitorDatabase.visitors.push(visitorEntry);

      // Keep only last 1000 entries to prevent bin from getting too large
      if (visitorDatabase.visitors.length > 1000) {
        visitorDatabase.visitors = visitorDatabase.visitors.slice(-1000);
      }

      // Update JSONBin
      const updateResponse = await fetch(`https://api.jsonbin.io/v3/b/${VISITOR_BIN_ID}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Master-Key': JSONBIN_API_KEY
        },
        body: JSON.stringify(visitorDatabase)
      });

      if (!updateResponse.ok) {
        throw new Error('Failed to update visitor database');
      }

      res.status(200).json({ success: true, message: 'Visitor data saved successfully' });
      
    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
    
  } catch (error) {
    console.error('Visitor API Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}