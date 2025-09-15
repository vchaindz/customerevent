// Configuration object - will be populated from backend
let CONFIG = {
    description: "Loading...",
    items: [],
    votes: {}
};

// Socket.io connection
let socket = null;
let currentProfile = null;

// Color palette for voting items
const COLORS = [
    '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57', '#ff9ff3'
];

// App state
let userVoted = false;
let userCurrentVote = null;
let userFingerprint = null;
let audioEnabled = true;
let waterDropSound = null;

// Get profile name from URL
function getProfileFromURL() {
    const pathParts = window.location.pathname.split('/');
    const voteIndex = pathParts.indexOf('vote');
    if (voteIndex !== -1 && pathParts[voteIndex + 1]) {
        return pathParts[voteIndex + 1];
    }
    return 'tech'; // Default profile
}

// Load configuration and votes from backend
async function loadConfig() {
    try {
        const profile = getProfileFromURL();
        const response = await fetch(`/api/${profile}/data`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        CONFIG = {
            description: data.description,
            items: data.items,
            votes: data.votes || {}
        };
        
        // Initialize votes for any missing items
        CONFIG.items.forEach(item => {
            if (!(item in CONFIG.votes)) {
                CONFIG.votes[item] = 0;
            }
        });
        
        console.log('Configuration loaded from backend:', CONFIG);
        return CONFIG;
        
    } catch (error) {
        console.error('Failed to load configuration:', error);
        showStatus('❌ Failed to load configuration. Using defaults.', 5000);
        
        // Fallback configuration
        return {
            description: "Vote for Your Favorite",
            items: ["Option 1", "Option 2", "Option 3"],
            votes: {"Option 1": 0, "Option 2": 0, "Option 3": 0}
        };
    }
}

// Initialize Socket.io connection
function initSocket() {
    const profile = getProfileFromURL();
    currentProfile = profile;
    
    socket = io();
    
    socket.on('connect', () => {
        console.log('Connected to server');
        socket.emit('joinProfile', profile);
    });
    
    socket.on('voteUpdate', (data) => {
        console.log('Vote update received:', data);
        CONFIG.votes = data.votes;
        renderVotingArena();
        renderLeaderboard();
        
        if (data.lastVote && data.lastVote !== userCurrentVote) {
            showStatus(`💧 Someone voted for ${data.lastVote}!`, 2000);
            playWaterDropSound();
        }
    });
    
    socket.on('disconnect', () => {
        console.log('Disconnected from server');
        showStatus('⚠️ Connection lost. Reconnecting...', 3000);
    });
    
    socket.on('reconnect', () => {
        console.log('Reconnected to server');
        socket.emit('joinProfile', profile);
        showStatus('✅ Reconnected!', 2000);
        loadConfig().then(() => {
            renderVotingArena();
            renderLeaderboard();
        });
    });
}

// Generate browser fingerprint
async function generateBrowserFingerprint() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillText('Unique browser fingerprint for voting', 2, 2);
    
    let webglInfo = 'unavailable';
    try {
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        if (gl) {
            const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
            if (debugInfo) {
                webglInfo = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
            }
        }
    } catch (e) {
        // WebGL not available
    }
    
    const fingerprint = [
        navigator.userAgent,
        navigator.language,
        navigator.languages ? navigator.languages.join(',') : '',
        screen.width + 'x' + screen.height + 'x' + screen.colorDepth,
        new Date().getTimezoneOffset(),
        canvas.toDataURL(),
        webglInfo,
        navigator.hardwareConcurrency || 'unknown',
        navigator.platform,
        navigator.cookieEnabled,
        typeof navigator.doNotTrack !== 'undefined' ? navigator.doNotTrack : 'unknown',
        navigator.maxTouchPoints || 0
    ].join('|');
    
    let hash = 0;
    for (let i = 0; i < fingerprint.length; i++) {
        const char = fingerprint.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    
    return Math.abs(hash).toString(36);
}

// Load user's current vote from backend
async function loadUserVote() {
    try {
        const profile = getProfileFromURL();
        const response = await fetch(`/api/${profile}/myvote`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fingerprint: userFingerprint })
        });
        
        const data = await response.json();
        if (data.userVote) {
            userVoted = true;
            userCurrentVote = data.userVote;
        } else {
            userVoted = false;
            userCurrentVote = null;
        }
        
        updateVoterInfo();
        
    } catch (error) {
        console.error('Failed to load user vote:', error);
    }
}

// Cast vote to backend
async function vote(item) {
    if (!userFingerprint) {
        showStatus('⏳ Please wait, initializing...', 2000);
        return;
    }
    
    if (userCurrentVote === item) {
        showStatus('❌ You already voted for this item!', 2000);
        return;
    }
    
    try {
        const profile = getProfileFromURL();
        const response = await fetch(`/api/${profile}/vote`, {
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
            const isVoteChange = userVoted && userCurrentVote;
            const previousVote = userCurrentVote;
            
            CONFIG.votes = data.votes;
            userVoted = true;
            userCurrentVote = data.userVote;
            
            updateVoterInfo();
            playWaterDropSound();
            
            // Create vote animation
            const itemEl = document.querySelector(`[data-item="${item}"] .vote-ball`);
            if (itemEl) {
                itemEl.classList.add('voted');
                const color = COLORS[CONFIG.items.indexOf(item) % COLORS.length];
                createVoteParticles(itemEl, color);
                setTimeout(() => itemEl.classList.remove('voted'), 600);
            }
            
            if (isVoteChange) {
                showStatus(`🔄 Vote changed from ${previousVote} to ${item}!`, 3000);
            } else {
                showStatus(`✅ Vote cast for ${item}!`, 3000);
            }
            
            renderVotingArena();
            renderLeaderboard();
            
        } else {
            showStatus(data.message || '❌ Vote failed', 3000);
        }
        
    } catch (error) {
        console.error('Failed to cast vote:', error);
        showStatus('❌ Failed to cast vote. Please try again.', 3000);
    }
}

// Initialize audio
function initAudio() {
    try {
        waterDropSound = new Audio(`/static/water_drop.mp3`);
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
                audioEnabled = false;
            });
        } catch (error) {
            console.warn('Audio play error:', error);
        }
    }
}

// Update voter information display
function updateVoterInfo() {
    const info = document.getElementById('voterInfo');
    if (!userFingerprint) {
        info.textContent = `🔍 Identifying your device...`;
        info.style.color = '#96ceb4';
        return;
    }
    
    const shortId = userFingerprint.substring(0, 6);
    
    if (userVoted && userCurrentVote) {
        info.textContent = `✅ You voted for: ${userCurrentVote} • Click another to change (Device: ${shortId})`;
        info.style.color = '#4ecdc4';
    } else {
        info.textContent = `🗳️ Ready to vote (Device: ${shortId})`;
        info.style.color = '#feca57';
    }
}

// Create background particles
function createBackgroundParticles() {
    const container = document.getElementById('backgroundParticles');
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) 
                    || window.innerWidth <= 768;
    
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

// Create vote particles effect
function createVoteParticles(element, color) {
    const rect = element.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) 
                    || window.innerWidth <= 768;
    
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

// Show status message
function showStatus(message, duration = 3000) {
    const statusEl = document.getElementById('statusMessage');
    statusEl.textContent = message;
    statusEl.classList.add('show');
    
    setTimeout(() => {
        statusEl.classList.remove('show');
    }, duration);
}

// Calculate ball size based on votes
function getBallSize(item) {
    const maxVotes = Math.max(...Object.values(CONFIG.votes), 1);
    const minSize = 35;
    const maxSize = 55;
    
    const ratio = CONFIG.votes[item] / maxVotes;
    return minSize + (maxSize - minSize) * ratio;
}

// Render voting arena
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

// Render leaderboard
function renderLeaderboard() {
    const list = document.getElementById('leaderboardList');
    
    // Sort items by votes
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
        
        // Create balls HTML - limit to 50 balls for performance
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
    showStatus('⚙️ Loading...', 2000);
    
    try {
        // Load configuration from backend
        await loadConfig();
        
        // Generate browser fingerprint
        userFingerprint = await generateBrowserFingerprint();
        console.log('Browser fingerprint:', userFingerprint.substring(0, 8) + '...');
        
        // Update page title and header
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
        
        // Initialize Socket.io
        initSocket();
        
        // Load user's current vote
        await loadUserVote();
        
        // Initialize UI
        initAudio();
        createBackgroundParticles();
        renderVotingArena();
        renderLeaderboard();
        
        // Show welcome message
        setTimeout(() => {
            showStatus('🚀 Welcome! Vote for your favorite!', 4000);
        }, 2000);
        
        // Enable audio on first user interaction
        document.addEventListener('click', () => {
            if (audioEnabled && waterDropSound && waterDropSound.paused) {
                waterDropSound.play().then(() => {
                    waterDropSound.pause();
                    waterDropSound.currentTime = 0;
                }).catch(() => {
                    // Audio still blocked
                });
            }
        }, { once: true });
        
        // Handle orientation change on mobile
        if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
            window.addEventListener('orientationchange', () => {
                setTimeout(() => {
                    renderVotingArena();
                    renderLeaderboard();
                }, 500);
            });
            
            // Prevent double-tap zoom
            let lastTouchEnd = 0;
            document.addEventListener('touchend', (event) => {
                const now = Date.now();
                if (now - lastTouchEnd <= 300) {
                    event.preventDefault();
                }
                lastTouchEnd = now;
            }, false);
        }
        
    } catch (error) {
        console.error('Failed to initialize application:', error);
        showStatus('❌ Failed to load application. Please refresh.', 10000);
    }
}

// Make vote function available globally
window.vote = vote;