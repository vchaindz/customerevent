// Configuration for the voting app
// JSONBin mode allows shared voting on GitHub Pages!

const APP_CONFIG = {
    // Backend server URL - set to null for static/JSONBin mode
    // For local backend: 'http://localhost:3001'
    BACKEND_URL: null,
    
    // JSONBin configuration - enables shared voting on GitHub Pages!
    JSONBIN_MODE: false,  // Set to true when you have JSONBin configured
    JSONBIN_API_KEY: 'YOUR_JSONBIN_X_MASTER_KEY_HERE',  // Your JSONBin.io X-Master-Key (starts with $2b$10$)
    JSONBIN_BASE_URL: 'https://api.jsonbin.io/v3',
    
    // JSONBin bin IDs for each profile (will be created automatically if not set)
    JSONBIN_BINS: {
        tech: null,     // Will be created on first use
        movies: null,   // Will be created on first use  
        food: null      // Will be created on first use
    },
    
    // Default profile
    DEFAULT_PROFILE: 'tech',
    
    // Polling intervals (ms)
    JSONBIN_POLL_INTERVAL: 3000,  // Check JSONBin for updates every 3 seconds
    STATIC_POLL_INTERVAL: 5000    // Local storage polling (if JSONBin disabled)
};
