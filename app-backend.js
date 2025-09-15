// Hybrid Voting App with Backend Support
// Shared voting across all users!

let CONFIG = {
    description: "Loading...",
    items: [],
    votes: {}
};

let socket = null;
let isBackendMode = false;
let isBackendStorageMode = false;
let currentProfile = null;
let backendPollInterval = null;
let currentBinId = null;

const COLORS = [
    '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57', '#ff9ff3'
];

let userVoted = false;
let userCurrentVote = null;
let userFingerprint = null;
let audioEnabled = true;
let waterDropSound = null;
let votedUsers = {};  // Track who voted for what

// Get profile from URL or use default
function getProfileFromURL() {
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(window.location.search);
    return hash || params.get('profile') || APP_CONFIG.DEFAULT_PROFILE || 'tech';
}

// Check if backend is available
async function checkBackendAvailability() {
    if (!APP_CONFIG.BACKEND_URL) {
        return false;
    }
    
    try {
        const response = await fetch(`${APP_CONFIG.BACKEND_URL}/api/tech/data`, {
            method: 'GET',
            mode: 'cors'
        });
        return response.ok;
    } catch (error) {
        console.log('Primary backend not available, checking secondary backend');
        return false;
    }
}

// Backend API Functions
async function createBackendStorage(profile) {
    const initialData = {
        profile: profile,
        description: `Vote for Best ${profile.charAt(0).toUpperCase() + profile.slice(1)}`,
        items: getDefaultItems(profile),
        votes: {},
        voters: {},
        lastUpdated: new Date().toISOString()
    };
    
    // Initialize votes
    initialData.items.forEach(item => {
        initialData.votes[item] = 0;
    });
    
    try {
        const response = await fetch(`${APP_CONFIG.JSONBIN_BASE_URL}/b`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Master-Key': APP_CONFIG.JSONBIN_API_KEY,
                'X-Bin-Name': `voting-${profile}`,
                'X-Bin-Private': false
            },
            body: JSON.stringify(initialData)
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log(`Created backend storage for ${profile}:`, data.metadata.id);
            return data.metadata.id;
        }
    } catch (error) {
        console.error('Failed to create backend storage:', error);
    }
    return null;
}

async function loadBackendData(binId) {
    if (!binId) return null;
    
    try {
        const response = await fetch(`${APP_CONFIG.JSONBIN_BASE_URL}/b/${binId}/latest`, {
            method: 'GET',
            headers: {
                'X-Master-Key': APP_CONFIG.JSONBIN_API_KEY,
                'X-Access-Key': APP_CONFIG.JSONBIN_API_KEY  // Also send as Access Key for custom keys
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            return data.record;
        }
    } catch (error) {
        console.error('Failed to load backend data:', error);
    }
    return null;
}

async function updateBackendData(binId, data) {
    if (!binId) return false;
    
    data.lastUpdated = new Date().toISOString();
    
    try {
        const response = await fetch(`${APP_CONFIG.JSONBIN_BASE_URL}/b/${binId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-Master-Key': APP_CONFIG.JSONBIN_API_KEY,
                'X-Access-Key': APP_CONFIG.JSONBIN_API_KEY  // Also try as Access Key
            },
            body: JSON.stringify(data)
        });
        
        return response.ok;
    } catch (error) {
        console.error('Failed to update backend:', error);
        return false;
    }
}

function getDefaultItems(profile) {
    const defaults = {
        tech: ["64bit", "Virtualization", "Cloud computing", "LLMs", "AI in datacenter Ops", "TCP/IP"],
        movies: ["The Godfather", "Star Wars", "The Matrix", "Inception", "Pulp Fiction", "The Dark Knight"],
        food: ["Pizza", "Sushi", "Burgers", "Tacos", "Pasta", "Ice Cream"]
    };
    return defaults[profile] || defaults.tech;
}

// Load configuration (backend, JSONBin, or static)
async function loadConfig() {
    const profile = getProfileFromURL();
    currentProfile = profile;
    
    if (isBackendMode) {
        // Load from backend
        try {
            const response = await fetch(`${APP_CONFIG.BACKEND_URL}/api/${profile}/data`);
            const data = await response.json();
            
            CONFIG = {
                description: data.description,
                items: data.items,
                votes: data.votes || {}
            };
            
            CONFIG.items.forEach(item => {
                if (!(item in CONFIG.votes)) {
                    CONFIG.votes[item] = 0;
                }
            });
            
            return CONFIG;
        } catch (error) {
            console.error('Failed to load from backend:', error);
        }
    } else if (isBackendStorageMode && APP_CONFIG.JSONBIN_MODE) {
        // Load from backend storage
        currentBinId = APP_CONFIG.JSONBIN_BINS[profile];
        
        if (!currentBinId) {
            // Create new bin if doesn't exist
            currentBinId = await createBackendStorage(profile);
            if (currentBinId) {
                console.log(`Created new backend storage for ${profile}: ${currentBinId}`);
                // Update config with new bin ID
                APP_CONFIG.JSONBIN_BINS[profile] = currentBinId;
            }
        }
        
        const binData = await loadBackendData(currentBinId);
        if (binData) {
            CONFIG = {
                description: binData.description,
                items: binData.items,
                votes: binData.votes || {}
            };
            votedUsers = binData.voters || {};
            
            // Check if current user already voted
            if (userFingerprint && votedUsers[userFingerprint]) {
                userVoted = true;
                userCurrentVote = votedUsers[userFingerprint];
            }
            
            return CONFIG;
        }
    }
    
    // Fallback to static mode
    const savedConfig = localStorage.getItem(`config_${profile}`);
    if (savedConfig) {
        CONFIG = JSON.parse(savedConfig);
    } else {
        CONFIG = {
            description: `Vote for Best ${profile.charAt(0).toUpperCase() + profile.slice(1)}`,
            items: getDefaultItems(profile),
            votes: {}
        };
        
        CONFIG.items.forEach(item => {
            CONFIG.votes[item] = 0;
        });
    }
    
    return CONFIG;
}

// Start polling backend for updates
function startBackendPolling() {
    if (!isBackendStorageMode || !currentBinId) return;
    
    // Clear existing interval
    if (backendPollInterval) {
        clearInterval(backendPollInterval);
    }
    
    backendPollInterval = setInterval(async () => {
        const binData = await loadBackendData(currentBinId);
        if (binData) {
            let hasChanges = false;
            
            // Check for vote changes
            for (const item in binData.votes) {
                if (binData.votes[item] !== CONFIG.votes[item]) {
                    hasChanges = true;
                    break;
                }
            }
            
            if (hasChanges) {
                CONFIG.votes = binData.votes;
                votedUsers = binData.voters || {};
                
                // Update user vote status
                if (userFingerprint && votedUsers[userFingerprint]) {
                    userVoted = true;
                    userCurrentVote = votedUsers[userFingerprint];
                } else {
                    userVoted = false;
                    userCurrentVote = null;
                }
                
                updateVoterInfo();
                renderVotingArena();
                renderLeaderboard();
                playWaterDropSound();
            }
        }
    }, APP_CONFIG.JSONBIN_POLL_INTERVAL);
}

// Initialize Socket.io (backend mode only)
function initSocket() {
    if (!isBackendMode || !APP_CONFIG.BACKEND_URL) return;
    
    const script = document.createElement('script');
    script.src = `${APP_CONFIG.BACKEND_URL}/socket.io/socket.io.js`;
    script.onload = () => {
        socket = io(APP_CONFIG.BACKEND_URL);
        
        socket.on('connect', () => {
            console.log('Connected to backend');
            socket.emit('joinProfile', currentProfile);
        });
        
        socket.on('voteUpdate', (data) => {
            CONFIG.votes = data.votes;
            renderVotingArena();
            renderLeaderboard();
            
            if (data.lastVote && data.lastVote !== userCurrentVote) {
                showStatus(`💧 Someone voted for ${data.lastVote}!`, 2000);
                playWaterDropSound();
            }
        });
    };
    script.onerror = () => {
        console.error('Failed to load Socket.io');
    };
    document.head.appendChild(script);
}

// Generate browser fingerprint
async function generateBrowserFingerprint() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillText('Unique browser fingerprint', 2, 2);
    
    const fingerprint = [
        navigator.userAgent,
        navigator.language,
        screen.width + 'x' + screen.height,
        new Date().getTimezoneOffset(),
        canvas.toDataURL()
    ].join('|');
    
    let hash = 0;
    for (let i = 0; i < fingerprint.length; i++) {
        hash = ((hash << 5) - hash) + fingerprint.charCodeAt(i);
        hash = hash & hash;
    }
    
    return Math.abs(hash).toString(36);
}

// Cast vote
async function vote(item) {
    if (!userFingerprint) {
        showStatus('⏳ Please wait, initializing...', 2000);
        return;
    }
    
    if (userCurrentVote === item) {
        showStatus('❌ You already voted for this item!', 2000);
        return;
    }
    
    const previousVote = userCurrentVote;
    
    if (isBackendMode && APP_CONFIG.BACKEND_URL) {
        // Backend mode
        try {
            const response = await fetch(`${APP_CONFIG.BACKEND_URL}/api/${currentProfile}/vote`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    item: item,
                    fingerprint: userFingerprint,
                    previousVote: userCurrentVote
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                CONFIG.votes = data.votes;
                userVoted = true;
                userCurrentVote = data.userVote;
            } else {
                showStatus(data.message || '❌ Vote failed', 3000);
                return;
            }
        } catch (error) {
            console.error('Failed to cast vote:', error);
            showStatus('❌ Failed to cast vote. Please try again.', 3000);
            return;
        }
    } else if (isBackendStorageMode && currentBinId) {
        // Backend storage mode
        const binData = await loadBackendData(currentBinId);
        if (binData) {
            // Update votes
            if (previousVote && binData.votes[previousVote] > 0) {
                binData.votes[previousVote]--;
            }
            binData.votes[item] = (binData.votes[item] || 0) + 1;
            
            // Update voters
            binData.voters = binData.voters || {};
            binData.voters[userFingerprint] = item;
            
            // Save to backend
            const success = await updateBackendData(currentBinId, binData);
            
            if (success) {
                CONFIG.votes = binData.votes;
                votedUsers = binData.voters;
                userVoted = true;
                userCurrentVote = item;
            } else {
                showStatus('❌ Failed to save vote. Please try again.', 3000);
                return;
            }
        }
    } else {
        // Static mode (localStorage only)
        if (previousVote && CONFIG.votes[previousVote] > 0) {
            CONFIG.votes[previousVote]--;
        }
        
        CONFIG.votes[item] = (CONFIG.votes[item] || 0) + 1;
        userVoted = true;
        userCurrentVote = item;
        
        // Save to localStorage
        const voteKey = `voted_${currentProfile}_${userFingerprint}`;
        localStorage.setItem(voteKey, item);
        localStorage.setItem(`votes_${currentProfile}`, JSON.stringify(CONFIG.votes));
    }
    
    updateVoterInfo();
    playWaterDropSound();
    
    // Animation
    const itemEl = document.querySelector(`[data-item="${item}"] .vote-ball`);
    if (itemEl) {
        itemEl.classList.add('voted');
        const color = COLORS[CONFIG.items.indexOf(item) % COLORS.length];
        createVoteParticles(itemEl, color);
        setTimeout(() => itemEl.classList.remove('voted'), 600);
    }
    
    if (previousVote) {
        showStatus(`🔄 Vote changed from ${previousVote} to ${item}!`, 3000);
    } else {
        showStatus(`✅ Vote cast for ${item}!`, 3000);
    }
    
    renderVotingArena();
    renderLeaderboard();
}

// Initialize audio
function initAudio() {
    try {
        waterDropSound = new Audio('water_drop.mp3');
        waterDropSound.volume = 0.4;
        waterDropSound.preload = 'auto';
    } catch (error) {
        console.warn('Audio initialization failed:', error);
        audioEnabled = false;
    }
}

// Play water drop sound
function playWaterDropSound() {
    if (audioEnabled && waterDropSound) {
        try {
            const sound = waterDropSound.cloneNode();
            sound.volume = 0.4;
            sound.play().catch(e => {
                console.warn('Audio play failed:', e);
            });
        } catch (error) {
            console.warn('Audio play error:', error);
        }
    }
}

// Update mode indicator
function updateModeIndicator() {
    const indicator = document.getElementById('modeIndicator');
    if (isBackendMode) {
        indicator.textContent = '🟢 Live Mode (Real-time Backend)';
        indicator.className = 'mode-indicator backend';
    } else if (isBackendStorageMode) {
        indicator.textContent = '🟢 Connected to Backend';
        indicator.className = 'mode-indicator backend';
    } else {
        indicator.textContent = '🟡 Static Mode (Local Storage)';
        indicator.className = 'mode-indicator static';
    }
}

// Update voter info
function updateVoterInfo() {
    const info = document.getElementById('voterInfo');
    if (!userFingerprint) {
        info.textContent = `🔍 Identifying your device...`;
        info.style.color = '#96ceb4';
        return;
    }
    
    const shortId = userFingerprint.substring(0, 6);
    const totalVotes = Object.values(CONFIG.votes).reduce((a, b) => a + b, 0);
    
    if (userVoted && userCurrentVote) {
        info.textContent = `✅ You voted for: ${userCurrentVote} • Device: ${shortId} • Total votes: ${totalVotes}`;
        info.style.color = '#4ecdc4';
    } else {
        info.textContent = `🗳️ Ready to vote • Device: ${shortId} • Total votes: ${totalVotes}`;
        info.style.color = '#feca57';
    }
}

// UI Functions (same as before)
function createBackgroundParticles() {
    const container = document.getElementById('backgroundParticles');
    const isMobile = window.innerWidth <= 768;
    const particleCount = isMobile ? 20 : 50;
    
    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.left = Math.random() * 100 + '%';
        particle.style.top = Math.random() * 100 + '%';
        particle.style.width = (Math.random() * 8 + 4) + 'px';
        particle.style.height = particle.style.width;
        particle.style.animationDelay = Math.random() * 6 + 's';
        particle.style.animationDuration = (Math.random() * 4 + 4) + 's';
        
        if (isMobile) {
            particle.style.opacity = '0.3';
        }
        
        container.appendChild(particle);
    }
}

function createVoteParticles(element, color) {
    const rect = element.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const isMobile = window.innerWidth <= 768;
    const particleCount = isMobile ? 8 : 15;

    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.className = 'vote-particle';
        particle.style.background = color;
        particle.style.left = centerX + 'px';
        particle.style.top = centerY + 'px';
        
        const angle = (i / particleCount) * Math.PI * 2;
        const distance = isMobile ? 60 + Math.random() * 30 : 100 + Math.random() * 50;
        const dx = Math.cos(angle) * distance;
        const dy = Math.sin(angle) * distance;
        
        particle.style.setProperty('--dx', dx + 'px');
        particle.style.setProperty('--dy', dy + 'px');
        
        document.body.appendChild(particle);
        setTimeout(() => particle.remove(), isMobile ? 800 : 1000);
    }
}

function showStatus(message, duration = 3000) {
    const statusEl = document.getElementById('statusMessage');
    statusEl.textContent = message;
    statusEl.classList.add('show');
    
    setTimeout(() => {
        statusEl.classList.remove('show');
    }, duration);
}

function getBallSize(item) {
    const maxVotes = Math.max(...Object.values(CONFIG.votes), 1);
    const minSize = 35;
    const maxSize = 55;
    
    const ratio = CONFIG.votes[item] / maxVotes;
    return minSize + (maxSize - minSize) * ratio;
}

function renderVotingArena() {
    const arena = document.getElementById('votingArena');
    arena.innerHTML = '';

    CONFIG.items.forEach((item, index) => {
        const color = COLORS[index % COLORS.length];
        const ballSize = getBallSize(item);
        const isUserChoice = userCurrentVote === item;
        
        const itemEl = document.createElement('div');
        itemEl.className = 'vote-item';
        if (isUserChoice) {
            itemEl.classList.add('user-voted');
        }
        itemEl.setAttribute('data-item', item);
        
        let buttonText = 'Vote';
        let buttonClass = 'vote-button';
        
        if (isUserChoice) {
            buttonText = '✓ Your Vote';
            buttonClass = 'vote-button voted-button';
        } else if (userVoted) {
            buttonText = 'Change Vote';
            buttonClass = 'vote-button change-button';
        }
        
        const voteCount = CONFIG.votes[item] || 0;
        
        itemEl.innerHTML = `
            <div class="vote-ball" style="background: ${color}; width: ${ballSize}px; height: ${ballSize}px;"></div>
            <div class="vote-content">
                <div class="item-name">${item}</div>
                <div class="vote-count">${voteCount} vote${voteCount !== 1 ? 's' : ''}</div>
            </div>
            <button class="${buttonClass}" onclick="vote('${item.replace(/'/g, "\\'")}')">
                ${buttonText}
            </button>
        `;
        
        arena.appendChild(itemEl);
    });
}

function renderLeaderboard() {
    const list = document.getElementById('leaderboardList');
    
    const sortedItems = CONFIG.items
        .map((item, index) => ({
            item,
            votes: CONFIG.votes[item] || 0,
            color: COLORS[index % COLORS.length]
        }))
        .sort((a, b) => b.votes - a.votes);

    list.innerHTML = '';
    
    sortedItems.forEach((data, rank) => {
        const itemEl = document.createElement('div');
        itemEl.className = 'leaderboard-item';
        itemEl.style.borderLeftColor = data.color;
        
        const rankIcon = rank === 0 ? '🥇' : rank === 1 ? '🥈' : rank === 2 ? '🥉' : `#${rank + 1}`;
        
        let ballsHTML = '';
        const ballCount = Math.min(data.votes, 50);
        for (let i = 0; i < ballCount; i++) {
            ballsHTML += `<div class="leaderboard-ball" style="background: ${data.color}; animation-delay: ${i * 0.05}s;"></div>`;
        }
        
        if (data.votes > 50) {
            ballsHTML += `<div style="color: white; font-size: 0.9em; margin-left: 5px;">+${data.votes - 50} more</div>`;
        }
        
        itemEl.innerHTML = `
            <div class="leaderboard-rank">${rankIcon}</div>
            <div class="leaderboard-info">
                <div class="leaderboard-name">${data.item}</div>
                <div class="leaderboard-votes">${data.votes} vote${data.votes !== 1 ? 's' : ''}</div>
            </div>
            <div class="leaderboard-balls">
                ${ballsHTML}
            </div>
        `;
        
        list.appendChild(itemEl);
    });
}

// Initialize app
async function initApp() {
    showStatus('⚙️ Initializing...', 2000);
    
    try {
        // Generate fingerprint first
        userFingerprint = await generateBrowserFingerprint();
        
        // Check backend availability
        isBackendMode = await checkBackendAvailability();
        
        // If no primary backend, use secondary backend if configured
        if (!isBackendMode && APP_CONFIG.JSONBIN_MODE && APP_CONFIG.JSONBIN_API_KEY) {
            isBackendStorageMode = true;
            console.log('Using backend storage for shared voting');
        }
        
        updateModeIndicator();
        
        // Load configuration
        await loadConfig();
        
        // Update UI
        document.title = CONFIG.description;
        const titleEl = document.querySelector('.title');
        if (titleEl) {
            titleEl.textContent = CONFIG.description.replace(/Vote for /, '');
        }
        
        const subtitleEl = document.querySelector('.subtitle');
        if (subtitleEl) {
            const profile = getProfileFromURL();
            subtitleEl.textContent = `Profile: ${profile} • Vote for your favorite!`;
        }
        
        // Initialize connection/polling
        if (isBackendMode) {
            initSocket();
        } else if (isBackendStorageMode) {
            startBackendPolling();
        }
        
        // Initialize UI
        initAudio();
        createBackgroundParticles();
        updateVoterInfo();
        renderVotingArena();
        renderLeaderboard();
        
        setTimeout(() => {
            if (isBackendStorageMode) {
                showStatus('✅ Connected to Backend - All votes are synced!', 4000);
            } else {
                showStatus('🚀 Ready to vote!', 3000);
            }
        }, 2000);
        
        // Enable audio on first click
        document.addEventListener('click', () => {
            if (audioEnabled && waterDropSound && waterDropSound.paused) {
                waterDropSound.play().then(() => {
                    waterDropSound.pause();
                    waterDropSound.currentTime = 0;
                }).catch(() => {});
            }
        }, { once: true });
        
    } catch (error) {
        console.error('Failed to initialize:', error);
        showStatus('❌ Failed to initialize. Please refresh.', 10000);
    }
}

// Make vote function global
window.vote = vote;

// Start app when DOM is loaded
window.addEventListener('DOMContentLoaded', initApp);