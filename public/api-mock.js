// Mock API for local development
// This simulates the Vercel serverless function locally

// Mock leaderboard data
let mockLeaderboardData = {
    short_term: [
        {
            user_id: "mock_user_1",
            display_name: "Test User 1",
            total_tracks: 150,
            total_artists: 75,
            avg_track_popularity: 68,
            avg_artist_popularity: 72,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            show_in_leaderboard: true
        }
    ],
    medium_term: [],
    long_term: []
};

// Mock API handler
window.mockAPI = {
    async handleLeaderboard(method, data) {
        console.log(`🔧 Mock API: ${method} /api/leaderboard`, data);
        
        await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay
        
        if (method === 'GET') {
            return { ok: true, data: mockLeaderboardData };
        } else if (method === 'POST') {
            if (!data || !data.userData) {
                return { ok: false, error: 'User data required' };
            }
            
            const { userData } = data;
            const timeRange = userData.time_range;
            
            // Find existing user or add new
            const existingIndex = mockLeaderboardData[timeRange].findIndex(
                entry => entry.user_id === userData.user_id
            );
            
            if (existingIndex !== -1) {
                // Update existing
                mockLeaderboardData[timeRange][existingIndex] = {
                    ...mockLeaderboardData[timeRange][existingIndex],
                    ...userData,
                    updated_at: new Date().toISOString()
                };
            } else {
                // Add new
                mockLeaderboardData[timeRange].push({
                    ...userData,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                });
            }
            
            // Sort by score
            mockLeaderboardData[timeRange].sort((a, b) => {
                const scoreA = (a.total_tracks || 0) + (a.total_artists || 0) + 
                             (a.avg_track_popularity || 0) + (a.avg_artist_popularity || 0);
                const scoreB = (b.total_tracks || 0) + (b.total_artists || 0) + 
                             (b.avg_track_popularity || 0) + (b.avg_artist_popularity || 0);
                return scoreB - scoreA;
            });
            
            return { ok: true, data: { success: true, message: 'Mock leaderboard updated' } };
        }
        
        return { ok: false, error: 'Method not allowed' };
    }
};

console.log('🔧 Mock API loaded for local development');