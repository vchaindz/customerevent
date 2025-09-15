const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');

// Simple file locking mechanism for concurrent writes
const fileLocks = new Map();

const PORT = process.env.PORT || 3000;

// Enable CORS for all routes
app.use(cors());
app.use(express.json());

// Serve static files from public directory
app.use('/static', express.static('public'));
app.use(express.static('public'));

// Ensure directories exist
async function ensureDirectories() {
    const dirs = ['profiles', 'voters', 'public'];
    for (const dir of dirs) {
        try {
            await fs.mkdir(dir, { recursive: true });
        } catch (err) {
            // Directory already exists
        }
    }
}

// Wait for lock to be released
async function acquireLock(key) {
    while (fileLocks.get(key)) {
        await new Promise(resolve => setTimeout(resolve, 10));
    }
    fileLocks.set(key, true);
}

// Release lock
function releaseLock(key) {
    fileLocks.delete(key);
}

// Load or create profile data
async function loadProfile(profileName) {
    const profilePath = path.join('profiles', `${profileName}.json`);
    try {
        const data = await fs.readFile(profilePath, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        // Create default profile if doesn't exist
        const defaultProfile = {
            description: `Vote for Best ${profileName.charAt(0).toUpperCase() + profileName.slice(1)}`,
            items: [],
            votes: {}
        };
        
        // Load items from voting.cnf if it's the tech profile
        if (profileName === 'tech') {
            try {
                const cnfContent = await fs.readFile('voting.cnf', 'utf8');
                const lines = cnfContent.split('\n');
                
                for (const line of lines) {
                    const trimmedLine = line.trim();
                    if (!trimmedLine || trimmedLine.startsWith('#')) continue;
                    
                    const match = trimmedLine.match(/^(\w+)\s*=\s*"([^"]*)"$/);
                    if (match) {
                        const key = match[1];
                        const value = match[2];
                        
                        if (key === 'description') {
                            defaultProfile.description = value;
                        } else if (key.startsWith('vote_item')) {
                            defaultProfile.items.push(value);
                            defaultProfile.votes[value] = 0;
                        }
                    }
                }
            } catch (err) {
                // Use defaults if voting.cnf doesn't exist
                defaultProfile.items = ['Option 1', 'Option 2', 'Option 3'];
                defaultProfile.items.forEach(item => {
                    defaultProfile.votes[item] = 0;
                });
            }
        } else {
            // Default items for other profiles
            defaultProfile.items = ['Option 1', 'Option 2', 'Option 3'];
            defaultProfile.items.forEach(item => {
                defaultProfile.votes[item] = 0;
            });
        }
        
        await saveProfile(profileName, defaultProfile);
        return defaultProfile;
    }
}

// Save profile data with file locking for concurrency
async function saveProfile(profileName, data) {
    const lockKey = `profile_${profileName}`;
    await acquireLock(lockKey);
    
    try {
        const profilePath = path.join('profiles', `${profileName}.json`);
        await fs.writeFile(profilePath, JSON.stringify(data, null, 2));
    } finally {
        releaseLock(lockKey);
    }
}

// Load voter data
async function loadVoters(profileName) {
    const voterPath = path.join('voters', `${profileName}.json`);
    try {
        const data = await fs.readFile(voterPath, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        return {};
    }
}

// Save voter data with file locking for concurrency
async function saveVoters(profileName, voters) {
    const lockKey = `voters_${profileName}`;
    await acquireLock(lockKey);
    
    try {
        const voterPath = path.join('voters', `${profileName}.json`);
        await fs.writeFile(voterPath, JSON.stringify(voters, null, 2));
    } finally {
        releaseLock(lockKey);
    }
}

// Get client identifier (IP + fingerprint)
function getClientId(req, fingerprint) {
    const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.ip;
    return `${ip}:${fingerprint}`;
}

// Serve the voting page for a specific profile
app.get('/vote/:profile', async (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Get profile configuration and current votes
app.get('/api/:profile/data', async (req, res) => {
    const profileName = req.params.profile;
    const profile = await loadProfile(profileName);
    res.json(profile);
});

// Cast a vote
app.post('/api/:profile/vote', async (req, res) => {
    const profileName = req.params.profile;
    const { item, fingerprint, previousVote } = req.body;
    
    if (!item || !fingerprint) {
        return res.status(400).json({ error: 'Missing item or fingerprint' });
    }
    
    const clientId = getClientId(req, fingerprint);
    
    // Load current data
    const profile = await loadProfile(profileName);
    const voters = await loadVoters(profileName);
    
    // Check if item exists
    if (!profile.items.includes(item)) {
        return res.status(400).json({ error: 'Invalid item' });
    }
    
    // Handle vote change
    if (voters[clientId] && voters[clientId] !== item) {
        // Remove previous vote
        const oldVote = voters[clientId];
        if (profile.votes[oldVote] > 0) {
            profile.votes[oldVote]--;
        }
    }
    
    // Check if already voted for same item
    if (voters[clientId] === item) {
        return res.json({ 
            success: false, 
            message: 'Already voted for this item',
            votes: profile.votes,
            userVote: item
        });
    }
    
    // Cast new vote
    profile.votes[item] = (profile.votes[item] || 0) + 1;
    voters[clientId] = item;
    
    // Save data
    await saveProfile(profileName, profile);
    await saveVoters(profileName, voters);
    
    // Broadcast update to all clients watching this profile
    io.to(profileName).emit('voteUpdate', {
        votes: profile.votes,
        lastVote: item
    });
    
    res.json({ 
        success: true, 
        votes: profile.votes,
        userVote: item
    });
});

// Get user's current vote
app.post('/api/:profile/myvote', async (req, res) => {
    const profileName = req.params.profile;
    const { fingerprint } = req.body;
    
    if (!fingerprint) {
        return res.json({ userVote: null });
    }
    
    const clientId = getClientId(req, fingerprint);
    const voters = await loadVoters(profileName);
    
    res.json({ userVote: voters[clientId] || null });
});

// Socket.io connection handling
io.on('connection', (socket) => {
    console.log('User connected');
    
    // Join a profile room for live updates
    socket.on('joinProfile', (profileName) => {
        socket.join(profileName);
        console.log(`User joined profile: ${profileName}`);
    });
    
    // Leave a profile room
    socket.on('leaveProfile', (profileName) => {
        socket.leave(profileName);
        console.log(`User left profile: ${profileName}`);
    });
    
    socket.on('disconnect', () => {
        console.log('User disconnected');
    });
});

// Start server
async function start() {
    await ensureDirectories();
    
    http.listen(PORT, () => {
        console.log(`✨ Voting app running on http://localhost:${PORT}`);
        console.log(`📊 Try different profiles:`);
        console.log(`   http://localhost:${PORT}/vote/tech`);
        console.log(`   http://localhost:${PORT}/vote/movies`);
        console.log(`   http://localhost:${PORT}/vote/food`);
    });
}

start();