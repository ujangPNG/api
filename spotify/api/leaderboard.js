// api/leaderboard.js
export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const JSONBIN_API_KEY = process.env.JSONBIN_API_KEY;
  const BIN_ID = process.env.JSONBIN_BIN_ID; // Your JSONBin ID
  
  if (!JSONBIN_API_KEY || !BIN_ID) {
    return res.status(500).json({ error: 'Server configuration error' });
  }

  try {
    if (req.method === 'GET') {
      // Get leaderboard data
      const response = await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}/latest`, {
        headers: {
          'X-Master-Key': JSONBIN_API_KEY,
          'X-Bin-Meta': 'false'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch leaderboard');
      }
      
      const data = await response.json();
      res.status(200).json(data);
      
    } else if (req.method === 'POST') {
      // Submit user data to leaderboard
      const { userData } = req.body;
      
      if (!userData) {
        return res.status(400).json({ error: 'User data required' });
      }

      // First, get existing data
      const getResponse = await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}/latest`, {
        headers: {
          'X-Master-Key': JSONBIN_API_KEY,
          'X-Bin-Meta': 'false'
        }
      });

      let leaderboardData = {
        short_term: [],
        medium_term: [],
        long_term: []
      };

      if (getResponse.ok) {
        leaderboardData = await getResponse.json();
      }

      // Add timestamp
      const now = new Date().toISOString();
      const userEntry = {
        ...userData,
        created_at: now,
        updated_at: now
      };

      // Check if user already exists and update or add
      const timeRange = userData.time_range;
      const existingIndex = leaderboardData[timeRange].findIndex(
        entry => entry.user_id === userData.user_id
      );

      if (existingIndex !== -1) {
        // Update existing entry
        leaderboardData[timeRange][existingIndex] = {
          ...leaderboardData[timeRange][existingIndex],
          ...userEntry,
          created_at: leaderboardData[timeRange][existingIndex].created_at // Keep original creation date
        };
      } else {
        // Add new entry
        leaderboardData[timeRange].push(userEntry);
      }

      // Sort leaderboards by total score (tracks + artists + avg popularity)
      Object.keys(leaderboardData).forEach(range => {
        leaderboardData[range].sort((a, b) => {
          const scoreA = (a.total_tracks || 0) + (a.total_artists || 0) + 
                       (a.avg_track_popularity || 0) + (a.avg_artist_popularity || 0);
          const scoreB = (b.total_tracks || 0) + (b.total_artists || 0) + 
                       (b.avg_track_popularity || 0) + (b.avg_artist_popularity || 0);
          return scoreB - scoreA;
        });
        
        // Keep only top 100 per category
        leaderboardData[range] = leaderboardData[range].slice(0, 100);
      });

      // Update JSONBin
      const updateResponse = await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Master-Key': JSONBIN_API_KEY
        },
        body: JSON.stringify(leaderboardData)
      });

      if (!updateResponse.ok) {
        throw new Error('Failed to update leaderboard');
      }

      res.status(200).json({ success: true, message: 'Leaderboard updated successfully' });
      
    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
    
  } catch (error) {
    console.error('Leaderboard API Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}