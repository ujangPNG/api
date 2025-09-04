let accessToken = null;
let allTracks = [];
let allArtists = [];

// PKCE helper functions
function generateRandomString(length) {
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const values = crypto.getRandomValues(new Uint8Array(length));
    return values.reduce((acc, x) => acc + possible[x % possible.length], "");
}

async function sha256(plain) {
    const encoder = new TextEncoder();
    const data = encoder.encode(plain);
    return window.crypto.subtle.digest('SHA-256', data);
}

function base64encode(input) {
    return btoa(String.fromCharCode(...new Uint8Array(input)))
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');
}
function startAuth() {
    const clientId = document.getElementById('clientId').value.trim();
    const redirectUri = document.getElementById('redirectUri').value.trim();
    
    if (!clientId) {
        alert('Client ID tidak boleh kosong!');
        return;
    }
    
    // Store for later use
    localStorage.setItem('spotify_client_id', clientId);
    localStorage.setItem('spotify_redirect_uri', redirectUri);
    
    // PKCE flow
    const codeVerifier = generateRandomString(64);
    localStorage.setItem('code_verifier', codeVerifier);
    
    sha256(codeVerifier).then(hashed => {
        const codeChallenge = base64encode(hashed);
        
        const scope = 'user-top-read user-read-private';
        const authUrl = new URL("https://accounts.spotify.com/authorize");
        
        const params = {
            response_type: 'code',
            client_id: clientId,
            scope: scope,
            code_challenge_method: 'S256',
            code_challenge: codeChallenge,
            redirect_uri: redirectUri,
        };
        
        authUrl.search = new URLSearchParams(params).toString();
        window.location.href = authUrl.toString();
    });
}
async function getAccessToken(code) {
    const clientId = localStorage.getItem('spotify_client_id');
    const redirectUri = localStorage.getItem('spotify_redirect_uri');
    const codeVerifier = localStorage.getItem('code_verifier');
    
    const response = await fetch("https://accounts.spotify.com/api/token", {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
            client_id: clientId,
            grant_type: 'authorization_code',
            code: code,
            redirect_uri: redirectUri,
            code_verifier: codeVerifier,
        }),
    });
    
    const data = await response.json();
    if (data.access_token) {
        accessToken = data.access_token;
        localStorage.setItem('access_token', accessToken);
        showStats();
        return true;
    }
    return false;
}
function showStats() {
    document.getElementById('authSection').style.display = 'none';
    document.getElementById('statsSection').style.display = 'block';
}
function showAuth() {
    document.getElementById('authSection').style.display = 'block';
    document.getElementById('statsSection').style.display = 'none';
}
function logout() {
    localStorage.clear();
    accessToken = null;
    allTracks = [];
    allArtists = [];
    showAuth();
}
async function fetchAllData() {
    if (!accessToken) return;
    
    const timeRange = document.querySelector('input[name="timeRange"]:checked').value;
    
    document.getElementById('loadingSection').style.display = 'block';
    document.getElementById('resultsContainer').style.display = 'grid';
    
    allTracks = [];
    allArtists = [];
    let requestCount = 0;
    let lastRenderCount = 0;
    let avgPopularity=0;
    let avgArtistPopularity=0;
    
    try {
        console.log('🎵 Mengambil tracks dan artists secara parallel...');
        
        const limit = 50;
        const maxItems = 10000;
        const RENDER_BATCH_SIZE = 500; // Render setiap 500 items
        
        // Function to update counters only
        const updateCounters = () => {
            async function totalPopularity() {
                let totalPopularity = 0;
                allTracks.forEach(track => {
                    totalPopularity += track.popularity;
                });
                
                const tracksList = document.getElementById('tracksList');
                document.getElementById('avgPopularity').textContent = Math.round(totalPopularity / allTracks.length || 0);
            }
            async function totalArtistPopularity() {
                let totalPopularity = 0;
                allArtists.forEach(track => {
                    totalPopularity += track.popularity;
                });
                
                const tracksList = document.getElementById('tracksList');
                document.getElementById('avgArtistPopularity').textContent = Math.round(totalPopularity / allArtists.length || 0);
            } 
            document.getElementById('fetchProgress').textContent = requestCount;
            document.getElementById('totalTracks').textContent = allTracks.length;
            document.getElementById('totalArtists').textContent = allArtists.length;
            document.getElementById('dataFetched').textContent = requestCount;
            totalPopularity();
            totalArtistPopularity();
        };
        
        // Function to update display with batching
        const updateDisplay = (force = false) => {
            updateCounters();
            const totalItems = allTracks.length + allArtists.length;
            
            // Render jika ini adalah 50 data pertama
            if (totalItems <= 50) {
                displayResults();
                lastRenderCount = totalItems;
                return;
            }
            
            // Render jika sudah mencapai batch size atau force render
            if (force || (totalItems - lastRenderCount) >= RENDER_BATCH_SIZE) {
                displayResults();
                lastRenderCount = totalItems;
            }
        };
        // Function to fetch a batch of items
        async function fetchBatch(type, offset) {
            const response = await fetch(
                `https://api.spotify.com/v1/me/top/${type}?limit=${limit}&offset=${offset}&time_range=${timeRange}`,
                { headers: { 'Authorization': `Bearer ${accessToken}` } }
            );
            
            if (!response.ok) {
                if (response.status === 401) {
                    throw new Error('Token expired. Please login again.');
                } if (response.status === 403){
                    throw new Error(`status: ${response.status}, siniin email lu dulu lek`);
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            const items = data.items || [];
            
            if (items.length > 0) {
                if (type === 'tracks') {
                    allTracks = allTracks.concat(items);
                } else {
                    allArtists = allArtists.concat(items);
                }
                requestCount++;
                
                // Update progress bar
                const progress = type === 'tracks' 
                    ? Math.min((offset / maxItems) * 50, 50)
                    : 50 + Math.min((offset / maxItems) * 50, 50);
                document.getElementById('progressFill').style.width = progress + '%';
                
                // Update display
                updateDisplay();
                
                console.log(`✅ Fetched ${items.length} ${type} (total: ${type === 'tracks' ? allTracks.length : allArtists.length}, offset: ${offset})`);
                
                return items.length === limit; // Return true if we should continue fetching
            }
            return false;
        }
        // Function to fetch all items of a type
        async function fetchAllOfType(type) {
            let offset = 0;
            while (offset < maxItems) {
                const shouldContinue = await fetchBatch(type, offset);
                if (!shouldContinue) break;
                offset += limit;
                // Rate limiting
                await new Promise(resolve => setTimeout(resolve, 30));
            }
        }
        // Fetch tracks and artists in parallel
        await Promise.all([
            fetchAllOfType('tracks'),
            fetchAllOfType('artists')
        ]);
        
        console.log(`🎉 FINAL RESULT: ${allTracks.length} tracks, ${allArtists.length} artists dari ${requestCount} requests`);
        
        // Final update and hide loading section
        if (allTracks.length > 0 || allArtists.length > 0) {
            updateDisplay(true); // Force final render
            document.getElementById('loadingSection').style.display = 'none';
        } else {
            throw new Error('No data returned. Try different time range or login again.');
        }
        
    } catch (error) {
        console.error('❌ Error:', error);
        document.getElementById('loadingSection').innerHTML = 
            `<div class="error">❌ Error: ${error.message}<br><br>
            <button class="btn" onclick="location.reload()">🔄 Refresh Page</button></div>`;
            
        // Reset token if unauthorized
        if (error.message.includes('Token expired') || error.message.includes('401')) {
            localStorage.removeItem('access_token');
            setTimeout(() => {
                logout();
            }, 3000);
        }
    }
}
function displayResults() {
    // Update counters
    document.getElementById('tracksCount').textContent = `${allTracks.length} tracks`;
    document.getElementById('artistsCount').textContent = `${allArtists.length} artists`;
    // Display tracks
    const tracksList = document.getElementById('tracksList');
    tracksList.innerHTML = allTracks.map((track, index) => `
        <div class="list-item">
            <img src="${track.album.images[2]?.url || track.album.images[0]?.url || ''}" 
                 alt="${track.name}" class="item-image" 
                 onerror="this.src='data:image/svg+xml,%3Csvg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'60\\' height=\\'60\\' viewBox=\\'0 0 24 24\\' fill=\\'%231ed760\\'%3E%3Cpath d=\\'M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z\\'/%3E%3C/svg%3E';">
            <div class="item-info" style="flex: 1;">
                <h4>#${index + 1} ${track.name}</h4>
                <p>👤 ${track.artists.map(a => a.name).join(', ')}</p>
                <p>💿 ${track.album.name}</p>
                <p>⭐ Popularity: ${track.popularity}/100</p>
            </div>
            <div class="item-info" style="min-width: 140px; text-align: right;">
                <h4>${Math.floor(track.duration_ms / 1000 / 60)}:${String(Math.floor((track.duration_ms / 1000) % 60)).padStart(2, '0')}</h4>
                <p>🔗 <a href="${track.external_urls.spotify}" target="_blank" style="color: #1ed760;">Link</a></p>
                <p>💿 #${track.track_number}</p>
                <p>${track.explicit ? '🔞 Explicit' : '✅ Clean'}</p>
            </div>
        </div>
    `).join('');
    
    // Display artists
    const artistsList = document.getElementById('artistsList');
    artistsList.innerHTML = allArtists.map((artist, index) => `
        <div class="list-item">
            <img src="${artist.images[2]?.url || artist.images[0]?.url || ''}" 
                 alt="${artist.name}" class="item-image"
                 onerror="this.src='data:image/svg+xml,%3Csvg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'60\\' height=\\'60\\' viewBox=\\'0 0 24 24\\' fill=\\'%231ed760\\'%3E%3Cpath d=\\'M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z\\'/%3E%3C/svg%3E';">
            <div class="item-info">
                <h4>#${index + 1} ${artist.name}</h4>
                <p>🎭 ${artist.genres.length > 0 ? artist.genres.slice(0, 3).join(', ') : 'No genre info'}</p>
                <p>👥 ${artist.followers.total.toLocaleString()} followers</p>
                <p>⭐ Popularity: ${artist.popularity}/100</p>
            </div>
        </div>
    `).join('');
}
// Check for authorization code in URL
window.addEventListener('load', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const error = urlParams.get('error');
    
    if (error) {
        alert('Authorization failed: ' + error);
        return;
    }
    
    if (code) {
        getAccessToken(code).then(success => {
            if (success) {
                // Clean URL
                window.history.replaceState({}, document.title, window.location.pathname);
            } else {
                alert('Failed to get access token');
                showAuth();
            }
        });
        return;
    }
    
    // Check if we have stored token
    const storedToken = localStorage.getItem('access_token');
    if (storedToken) {
        accessToken = storedToken;
        showStats();
    } else {
        showAuth();
    }
});