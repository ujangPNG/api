let accessToken = null;
let allTracks = [];
let allArtists = [];
let currentLanguage = "id";
let currentTimeRange = "short_term";
let userProfile = null;
let currentLeaderboardData = null;

// API Base URL - Auto-detect environment
const isLocal =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1";
const API_BASE_URL = "https://api-9n778prwu-ujangpngs-projects.vercel.app/spotify/api";
console.log(
    `🔧 Environment: ${isLocal ? "LOCAL" : "PRODUCTION"}, API URL: ${API_BASE_URL}`,
);

// Helper function for API calls (handles local mock vs production)
async function apiCall(endpoint, options = {}) {
    if (isLocal) {
        // Use mock API for local development
        console.log(`🔧 Using Mock API: ${endpoint}`);
        if (endpoint === "/leaderboard") {
            const method = options.method || "GET";
            const data = options.body ? JSON.parse(options.body) : null;
            const mockResult = await window.mockAPI.handleLeaderboard(
                method,
                data,
            );

            return {
                ok: mockResult.ok,
                json: async () =>
                    mockResult.data || { error: mockResult.error },
            };
        }
    } else {
        // Use real API for production
        return fetch(`${API_BASE_URL}${endpoint}`, options);
    }
}

function toggleLanguage() {
    currentLanguage = currentLanguage === "id" ? "en" : "id";
    document.getElementById("langToggle").textContent =
        currentLanguage === "id" ? "🌐 EN" : "🌐 ID";
    updatePageContent();
}

function updatePageContent() {
    // Update all text content based on current language
    document.querySelector("#authSection h2").textContent =
        translations[currentLanguage].setupTitle;
    document.querySelector("#authSection p").innerHTML = `
        ${translations[currentLanguage].setupInstructions}
        <br>${translations[currentLanguage].createApp} <a href="https://developer.spotify.com/dashboard" target="_blank" style="color: #1ed760;">Spotify Dashboard</a>
        <br>${translations[currentLanguage].setRedirect} <strong>https://spotify.zebua.site/spotify/</strong>
        <br>${translations[currentLanguage].copyClientId}
        <br>${translations[currentLanguage].emailOption}
    `;

    document.querySelector('label[for="clientId"]').textContent =
        translations[currentLanguage].clientIdLabel;
    document.querySelector('label[for="redirectUri"]').textContent =
        translations[currentLanguage].redirectUriLabel;
    document.querySelector("#authSection button").textContent =
        translations[currentLanguage].loginButton;

    // Stats section
    document.querySelector("#statsSection h2").textContent =
        translations[currentLanguage].statsTitle;
    document.querySelectorAll(".stat-label").forEach((label, index) => {
        const labels = [
            translations[currentLanguage].totalTracks,
            translations[currentLanguage].totalArtists,
            translations[currentLanguage].dataRequests,
            translations[currentLanguage].avgTracksPopularity,
            translations[currentLanguage].avgArtistPopularity,
        ];
        label.textContent = labels[index];
    });

    // Settings section
    document.querySelector(".settings-section h3").textContent =
        translations[currentLanguage].settingsTitle;
    document.querySelectorAll(".time-desc").forEach((desc, index) => {
        const timeRanges = [
            translations[currentLanguage].shortTerm,
            translations[currentLanguage].mediumTerm,
            translations[currentLanguage].longTerm,
        ];
        desc.textContent = timeRanges[index];
    });

    // Buttons
    document.querySelector(".button-group button:first-child").textContent =
        translations[currentLanguage].fetchDataButton;
    document.querySelector(".button-group button:last-child").textContent =
        translations[currentLanguage].logoutButton;

    // Loading section
    const loadingText = document.querySelector("#loadingSection p");
    if (loadingText) {
        const requests =
            loadingText.querySelector("#fetchProgress").textContent;
        loadingText.innerHTML = `${translations[currentLanguage].loading} <span id="fetchProgress">${requests}</span> ${translations[currentLanguage].requests}`;
    }

    // Results section
    const tracksTitle = document.querySelector("#tracksSection h3");
    const artistsTitle = document.querySelector("#artistsSection h3");
    if (tracksTitle)
        tracksTitle.textContent = translations[currentLanguage].topTracks;
    if (artistsTitle)
        artistsTitle.textContent = translations[currentLanguage].topArtists;

    // Update counts
    const tracksCount = document.querySelector("#tracksCount");
    const artistsCount = document.querySelector("#artistsCount");
    if (tracksCount) {
        const count = tracksCount.textContent.split(" ")[0];
        tracksCount.textContent = `${count} ${translations[currentLanguage].tracksCount}`;
    }
    if (artistsCount) {
        const count = artistsCount.textContent.split(" ")[0];
        artistsCount.textContent = `${count} ${translations[currentLanguage].artistsCount}`;
    }

    // Update leaderboard content if visible
    const leaderboardPromptCard = document.querySelector(".prompt-card");
    if (leaderboardPromptCard) {
        const promptText = leaderboardPromptCard.querySelector("p");
        if (promptText)
            promptText.textContent =
                translations[currentLanguage].leaderboardDesc;

        const buttons = leaderboardPromptCard.querySelectorAll(
            ".prompt-buttons .btn",
        );
        if (buttons.length >= 2) {
            buttons[0].textContent = translations[currentLanguage].showButton;
            buttons[1].textContent = translations[currentLanguage].hideButton;
        }
    }
}

// PKCE helper functions
function generateRandomString(length) {
    const possible =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    const values = crypto.getRandomValues(new Uint8Array(length));
    return values.reduce((acc, x) => acc + possible[x % possible.length], "");
}

async function sha256(plain) {
    const encoder = new TextEncoder();
    const data = encoder.encode(plain);
    return window.crypto.subtle.digest("SHA-256", data);
}

function base64encode(input) {
    return btoa(String.fromCharCode(...new Uint8Array(input)))
        .replace(/=/g, "")
        .replace(/\+/g, "-")
        .replace(/\//g, "_");
}

function startAuth() {
    const clientId = document.getElementById("clientId").value.trim();
    const redirectUri = document.getElementById("redirectUri").value.trim();

    if (!clientId) {
        alert("Client ID tidak boleh kosong!");
        return;
    }

    // Store for later use
    localStorage.setItem("spotify_client_id", clientId);
    localStorage.setItem("spotify_redirect_uri", redirectUri);

    // PKCE flow
    const codeVerifier = generateRandomString(64);
    localStorage.setItem("code_verifier", codeVerifier);

    sha256(codeVerifier).then((hashed) => {
        const codeChallenge = base64encode(hashed);

        const scope = "user-top-read user-read-private";
        const authUrl = new URL("https://accounts.spotify.com/authorize");

        const params = {
            response_type: "code",
            client_id: clientId,
            scope: scope,
            code_challenge_method: "S256",
            code_challenge: codeChallenge,
            redirect_uri: redirectUri,
        };

        authUrl.search = new URLSearchParams(params).toString();
        window.location.href = authUrl.toString();
    });
}

async function getAccessToken(code) {
    const clientId = localStorage.getItem("spotify_client_id");
    const redirectUri = localStorage.getItem("spotify_redirect_uri");
    const codeVerifier = localStorage.getItem("code_verifier");

    const response = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
            client_id: clientId,
            grant_type: "authorization_code",
            code: code,
            redirect_uri: redirectUri,
            code_verifier: codeVerifier,
        }),
    });

    const data = await response.json();
    if (data.access_token) {
        accessToken = data.access_token;
        localStorage.setItem("access_token", accessToken);

        // Fetch user profile when we get the token
        await fetchUserProfile();

        showStats();
        return true;
    }
    return false;
}

async function fetchUserProfile() {
    if (!accessToken) return null;

    try {
        const response = await fetch("https://api.spotify.com/v1/me", {
            headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (response.ok) {
            userProfile = await response.json();
            console.log("✅ User profile loaded:", userProfile.display_name);
            return userProfile;
        } else if (response.status === 401) {
            // Token expired, need to re-login
            localStorage.removeItem("access_token");
            accessToken = null;
            userProfile = null;
            showAuth();
        }
    } catch (error) {
        console.error("Error fetching user profile:", error);
    }
    return null;
}

function showStats() {
    document.getElementById("authSection").style.display = "none";
    document.getElementById("statsSection").style.display = "block";
}

function showAuth() {
    document.getElementById("authSection").style.display = "block";
    document.getElementById("statsSection").style.display = "none";
    document.getElementById("leaderboardPrompt").style.display = "none";
    document.getElementById("leaderboardSection").style.display = "none";
}

function logout() {
    localStorage.clear();
    accessToken = null;
    userProfile = null;
    allTracks = [];
    allArtists = [];
    currentLeaderboardData = null;
    showAuth();
}

async function fetchAllData() {
    if (!accessToken) return;

    const timeRange = document.querySelector(
        'input[name="timeRange"]:checked',
    ).value;
    currentTimeRange = timeRange;

    document.getElementById("loadingSection").style.display = "block";
    document.getElementById("resultsContainer").style.display = "grid";
    document.getElementById("leaderboardPrompt").style.display = "none";

    allTracks = [];
    allArtists = [];
    let requestCount = 0;
    let lastRenderCount = 0;

    try {
        // Ensure user profile is loaded
        if (!userProfile) {
            await fetchUserProfile();
        }

        console.log("🎵 Mengambil tracks dan artists secara parallel...");

        const limit = 50;
        const maxItems = 10000;
        const RENDER_BATCH_SIZE = 500; // Render setiap 500 items

        // Function to update counters only
        const updateCounters = () => {
            let avgTrackPopularity = 0;
            let avgArtistPopularity = 0;

            if (allTracks.length > 0) {
                const totalTrackPopularity = allTracks.reduce(
                    (sum, track) => sum + track.popularity,
                    0,
                );
                avgTrackPopularity = Math.round(
                    totalTrackPopularity / allTracks.length,
                );
            }

            if (allArtists.length > 0) {
                const totalArtistPopularity = allArtists.reduce(
                    (sum, artist) => sum + artist.popularity,
                    0,
                );
                avgArtistPopularity = Math.round(
                    totalArtistPopularity / allArtists.length,
                );
            }

            document.getElementById("fetchProgress").textContent = requestCount;
            document.getElementById("totalTracks").textContent =
                allTracks.length;
            document.getElementById("totalArtists").textContent =
                allArtists.length;
            document.getElementById("dataFetched").textContent = requestCount;
            document.getElementById("avgPopularity").textContent =
                avgTrackPopularity;
            document.getElementById("avgArtistPopularity").textContent =
                avgArtistPopularity;
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
            if (force || totalItems - lastRenderCount >= RENDER_BATCH_SIZE) {
                displayResults();
                lastRenderCount = totalItems;
            }
        };

        // Function to fetch a batch of items
        async function fetchBatch(type, offset) {
            const response = await fetch(
                `https://api.spotify.com/v1/me/top/${type}?limit=${limit}&offset=${offset}&time_range=${timeRange}`,
                { headers: { Authorization: `Bearer ${accessToken}` } },
            );

            if (!response.ok) {
                if (response.status === 401) {
                    throw new Error("Token expired. Please login again.");
                } else if (response.status === 403) {
                    throw new Error(
                        `status: ${response.status}, siniin email lu dulu lek`,
                    );
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            const items = data.items || [];

            if (items.length > 0) {
                if (type === "tracks") {
                    allTracks = allTracks.concat(items);
                } else {
                    allArtists = allArtists.concat(items);
                }
                requestCount++;

                // Update progress bar
                const progress =
                    type === "tracks"
                        ? Math.min((offset / maxItems) * 50, 50)
                        : 50 + Math.min((offset / maxItems) * 50, 50);
                document.getElementById("progressFill").style.width =
                    progress + "%";

                // Update display
                updateDisplay();

                console.log(
                    `✅ Fetched ${items.length} ${type} (total: ${type === "tracks" ? allTracks.length : allArtists.length}, offset: ${offset})`,
                );

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
                await new Promise((resolve) => setTimeout(resolve, 30));
            }
        }

        // Fetch tracks and artists in parallel
        await Promise.all([
            fetchAllOfType("tracks"),
            fetchAllOfType("artists"),
        ]);

        console.log(
            `🎉 FINAL RESULT: ${allTracks.length} tracks, ${allArtists.length} artists dari ${requestCount} requests`,
        );

        // Final update and hide loading section
        if (allTracks.length > 0 || allArtists.length > 0) {
            updateDisplay(true); // Force final render
            document.getElementById("loadingSection").style.display = "none";

            // Show leaderboard prompt
            showLeaderboardPrompt();
        } else {
            throw new Error(
                "No data returned. Try different time range or login again.",
            );
        }
    } catch (error) {
        console.error("❌ Error:", error);
        document.getElementById("loadingSection").innerHTML =
            `<div class="error">❌ Error: ${error.message}<br><br>
            <button class="btn" onclick="location.reload()">🔄 Refresh Page</button></div>`;

        // Reset token if unauthorized
        if (
            error.message.includes("Token expired") ||
            error.message.includes("401")
        ) {
            localStorage.removeItem("access_token");
            setTimeout(() => {
                logout();
            }, 3000);
        }
    }
}

function displayResults() {
    // Update counters
    document.getElementById("tracksCount").textContent =
        `${allTracks.length} tracks`;
    document.getElementById("artistsCount").textContent =
        `${allArtists.length} artists`;

    // Display tracks
    const tracksList = document.getElementById("tracksList");
    tracksList.innerHTML = allTracks
        .map(
            (track, index) => `
        <div class="list-item">
            <img src="${track.album.images[2]?.url || track.album.images[0]?.url || ""}" 
                 alt="${track.name}" class="item-image" 
                 onerror="this.src='data:image/svg+xml,%3Csvg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'60\\' height=\\'60\\' viewBox=\\'0 0 24 24\\' fill=\\'%231ed760\\'%3E%3Cpath d=\\'M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z\\'/%3E%3C/svg%3E';">
            <div class="item-info" style="flex: 1;">
                <h4>#${index + 1} ${track.name}</h4>
                <p>👤 ${track.artists.map((a) => a.name).join(", ")}</p>
                <p>💿 ${track.album.name}</p>
                <p>⭐ Popularity: ${track.popularity}/100</p>
            </div>
            <div class="item-info" style="min-width: 140px; text-align: right;">
                <h4>${Math.floor(track.duration_ms / 1000 / 60)}:${String(Math.floor((track.duration_ms / 1000) % 60)).padStart(2, "0")}</h4>
                <p>🔗 <a href="${track.external_urls.spotify}" target="_blank" style="color: #1ed760;">Link</a></p>
                <p>💿 #${track.track_number}</p>
                <p>${track.explicit ? "🔞 Explicit" : "✅ Clean"}</p>
            </div>
        </div>
    `,
        )
        .join("");

    // Display artists
    const artistsList = document.getElementById("artistsList");
    artistsList.innerHTML = allArtists
        .map(
            (artist, index) => `
        <div class="list-item">
            <img src="${artist.images[2]?.url || artist.images[0]?.url || ""}" 
                 alt="${artist.name}" class="item-image"
                 onerror="this.src='data:image/svg+xml,%3Csvg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'60\\' height=\\'60\\' viewBox=\\'0 0 24 24\\' fill=\\'%231ed760\\'%3E%3Cpath d=\\'M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z\\'/%3E%3C/svg%3E';">
            <div class="item-info">
                <h4>#${index + 1} ${artist.name}</h4>
                <p>🎭 ${artist.genres.length > 0 ? artist.genres.slice(0, 3).join(", ") : "No genre info"}</p>
                <p>👥 ${artist.followers.total.toLocaleString()} followers</p>
                <p>⭐ Popularity: ${artist.popularity}/100</p>
            </div>
        </div>
    `,
        )
        .join("");
}

// Leaderboard Functions
function showLeaderboardPrompt() {
    const urlParams = new URLSearchParams(window.location.search);
    const forceShow = urlParams.get("show") === "true";

    if (forceShow) {
        // Auto submit and show leaderboard
        submitToLeaderboard(true);
        return;
    }

    document.getElementById("leaderboardPrompt").style.display = "block";
}

async function submitToLeaderboard(showInLeaderboard) {
    try {
        if (!userProfile || !allTracks.length || !allArtists.length) {
            console.error("Missing data for leaderboard submission");
            return;
        }

        const avgTrackPopularity = Math.round(
            allTracks.reduce((sum, track) => sum + track.popularity, 0) /
                allTracks.length,
        );

        const avgArtistPopularity = Math.round(
            allArtists.reduce((sum, artist) => sum + artist.popularity, 0) /
                allArtists.length,
        );

        const userData = {
            user_id: userProfile.id,
            display_name: userProfile.display_name || "Anonymous User",
            time_range: currentTimeRange,
            total_tracks: allTracks.length,
            total_artists: allArtists.length,
            avg_track_popularity: avgTrackPopularity,
            avg_artist_popularity: avgArtistPopularity,
            show_in_leaderboard: showInLeaderboard,
        };

        // Check if force show via URL
        const urlParams = new URLSearchParams(window.location.search);
        const forceShow = urlParams.get("show") === "true";
        if (forceShow) {
            userData.show_in_leaderboard = true;
        }

        // Submit to leaderboard API
        const response = await apiCall("/leaderboard", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ userData }),
        });

        if (response.ok) {
            console.log("✅ Data berhasil disubmit ke leaderboard");
            document.getElementById("leaderboardPrompt").style.display = "none";

            if (showInLeaderboard || forceShow) {
                document.getElementById("leaderboardSection").style.display =
                    "block";
                await loadLeaderboard();
            }
        } else {
            console.error("❌ Gagal submit ke leaderboard");
        }
    } catch (error) {
        console.error("❌ Error submitting to leaderboard:", error);
    }
}

async function loadLeaderboard() {
    try {
        document.getElementById("leaderboardList").innerHTML = `
            <div class="loading">
                <div class="spinner"></div>
                <p>Loading leaderboard...</p>
            </div>
        `;

        const response = await apiCall("/leaderboard");

        if (!response.ok) {
            throw new Error("Failed to load leaderboard");
        }

        const data = await response.json();
        currentLeaderboardData = data;

        // Display current tab
        const activeTab = document.querySelector(".tab-btn.active");
        const timeRange = activeTab
            ? activeTab.textContent.toLowerCase().replace(" ", "_")
            : "short_term";
        displayLeaderboard(timeRange);
    } catch (error) {
        console.error("❌ Error loading leaderboard:", error);
        document.getElementById("leaderboardList").innerHTML = `
            <div class="error">❌ Gagal memuat leaderboard. Coba refresh.</div>
        `;
    }
}

function switchLeaderboardTab(timeRange) {
    // Update active tab
    document
        .querySelectorAll(".tab-btn")
        .forEach((btn) => btn.classList.remove("active"));
    event.target.classList.add("active");

    // Display leaderboard for selected time range
    displayLeaderboard(timeRange);
}

function displayLeaderboard(timeRange) {
    if (!currentLeaderboardData || !currentLeaderboardData[timeRange]) {
        document.getElementById("leaderboardList").innerHTML = `
            <div class="error">❌ Data tidak tersedia untuk ${timeRange}</div>
        `;
        return;
    }

    const leaderboardData = currentLeaderboardData[timeRange].filter(
        (entry) => entry.show_in_leaderboard !== false,
    );

    if (leaderboardData.length === 0) {
        document.getElementById("leaderboardList").innerHTML = `
            <div style="text-align: center; padding: 40px; opacity: 0.7;">
                🏆 Belum ada data di leaderboard ini
            </div>
        `;
        return;
    }

    const leaderboardHtml = leaderboardData
        .map((entry, index) => {
            const rank = index + 1;
            let rankClass = "";
            let rankEmoji = `#${rank}`;

            if (rank === 1) {
                rankClass = "top1";
                rankEmoji = "🥇";
            } else if (rank === 2) {
                rankClass = "top2";
                rankEmoji = "🥈";
            } else if (rank === 3) {
                rankClass = "top3";
                rankEmoji = "🥉";
            }

            const totalScore =
                (entry.total_tracks || 0) +
                (entry.total_artists || 0) +
                (entry.avg_track_popularity || 0) +
                (entry.avg_artist_popularity || 0);

            const updatedDate = entry.updated_at
                ? new Date(entry.updated_at).toLocaleDateString("id-ID", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                  })
                : "";

            return `
            <div class="leaderboard-item">
                <div class="leaderboard-rank ${rankClass}">${rankEmoji}</div>
                <div class="leaderboard-user">
                    <h4>${entry.display_name}</h4>
                    <div class="leaderboard-stats">
                        <div>🎵 ${entry.total_tracks || 0} tracks</div>
                        <div>🎤 ${entry.total_artists || 0} artists</div>
                        <div>⭐ ${entry.avg_track_popularity || 0}% tracks</div>
                        <div>⭐ ${entry.avg_artist_popularity || 0}% artists</div>
                    </div>
                    ${updatedDate ? `<div class="leaderboard-date">Updated: ${updatedDate}</div>` : ""}
                </div>
                <div style="text-align: right; color: #1ed760; font-weight: bold;">
                    Score: ${totalScore}
                </div>
            </div>
        `;
        })
        .join("");

    document.getElementById("leaderboardList").innerHTML = leaderboardHtml;
}

// Check for authorization code in URL
window.addEventListener("load", async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get("code");
    const error = urlParams.get("error");

    if (error) {
        alert("Authorization failed: " + error);
        return;
    }

    if (code) {
        const success = await getAccessToken(code);
        if (success) {
            // Clean URL
            window.history.replaceState(
                {},
                document.title,
                window.location.pathname,
            );
        } else {
            alert("Failed to get access token");
            showAuth();
        }
        return;
    }

    // Check if we have stored token
    const storedToken = localStorage.getItem("access_token");
    if (storedToken) {
        accessToken = storedToken;
        // Try to fetch user profile with stored token
        await fetchUserProfile();
        if (userProfile) {
            showStats();
        } else {
            // Token invalid, show auth
            showAuth();
        }
    } else {
        showAuth();
    }
});
