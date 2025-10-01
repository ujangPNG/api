// api/visitor.js
export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const JSONBIN_API_KEY = process.env.JSONBIN_API_KEY;
  const VISITOR_BIN_ID = process.env.VISITOR_BIN_ID;

  if (!JSONBIN_API_KEY || !VISITOR_BIN_ID) {
    console.error('Server configuration error: JSONBIN_API_KEY or VISITOR_BIN_ID is not set.');
    return res.status(500).json({ error: 'Visitor tracking configuration error. Check server logs.' });
  }

  try {
    if (req.method === 'POST') {
      const visitorData = req.body;
      
      if (!visitorData) {
        return res.status(400).json({ error: 'Visitor data is required.' });
      }

      const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress || 'unknown';

      let locationData = {};
      try {
        // Request additional fields
        const fields = 'country,regionName,city,lat,lon,timezone,isp';
        const locationResponse = await fetch(`http://ip-api.com/json/${ip}?fields=${fields}`);
        if (locationResponse.ok) {
          locationData = await locationResponse.json();
        } else {
          console.warn(`Failed to fetch location data for IP ${ip}: ${locationResponse.statusText}`);
        }
      } catch (error) {
        console.warn(`Error fetching location data for IP ${ip}:`, error);
      }

      const timestamp = new Date().toISOString();
      const visitorEntry = {
        timestamp,
        ip,
        userAgent: visitorData.userAgent || 'unknown',
        referrer: visitorData.referrer || 'direct',
        language: visitorData.language || 'unknown',
        timezone: locationData.timezone || visitorData.timezone || 'unknown',
        country: locationData.country || 'unknown',
        region: locationData.regionName || 'unknown',
        city: locationData.city || 'unknown',
        isp: locationData.isp || 'unknown',
        lat: locationData.lat || null,
        lon: locationData.lon || null,
      };

      // Get existing data from JSONBin
      const getResponse = await fetch(`https://api.jsonbin.io/v3/b/${VISITOR_BIN_ID}/latest`, {
        headers: { 'X-Master-Key': JSONBIN_API_KEY },
      });

      if (!getResponse.ok) {
        console.error(`Failed to fetch from JSONBin: ${getResponse.statusText}`)
        throw new Error('Could not retrieve visitor database.');
      }

      const visitorDatabase = await getResponse.json();
      const visitors = visitorDatabase.record?.visitors || [];

      visitors.push(visitorEntry);

      // Keep only the last 1000 entries
      if (visitors.length > 1000) {
        visitors.splice(0, visitors.length - 1000);
      }

      // Update JSONBin
      const updateResponse = await fetch(`https://api.jsonbin.io/v3/b/${VISITOR_BIN_ID}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Master-Key': JSONBIN_API_KEY,
        },
        body: JSON.stringify({ visitors }),
      });

      if (!updateResponse.ok) {
        console.error(`Failed to update JSONBin: ${updateResponse.statusText}`)
        throw new Error('Failed to update visitor database.');
      }

      res.status(200).json({ success: true, message: 'Visitor data saved.' });

    } else if (req.method === 'GET') {
      // Add a GET method to retrieve the log for debugging
      const getResponse = await fetch(`https://api.jsonbin.io/v3/b/${VISITOR_BIN_ID}/latest`, {
        headers: { 'X-Master-Key': JSONBIN_API_KEY },
      });

      if (!getResponse.ok) {
        throw new Error('Could not retrieve visitor log.');
      }

      const data = await getResponse.json();
      res.status(200).json(data.record);

    } else {
      res.setHeader('Allow', ['POST', 'GET']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
    }
    
  } catch (error) {
    console.error('Visitor API Error:', error);
    res.status(500).json({ error: 'An internal server error occurred.' });
  }
}