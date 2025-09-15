// Configuration for the voting app
// JSONBin mode allows shared voting on GitHub Pages!

const APP_CONFIG = {
    // Backend server URL - set to null for static/JSONBin mode
    // For local backend: 'http://localhost:3001'
    BACKEND_URL: null,
    
    // JSONBin configuration - enables shared voting on GitHub Pages!
    JSONBIN_MODE: true,  // JSONBin is now enabled!
    JSONBIN_API_KEY: '$2a$10$d5csxfBvkFf6kUNZicShX.eK17pWhq6e3XN.QbZBj2WDx6hrilr9m',
    JSONBIN_BASE_URL: 'https://api.jsonbin.io/v3',
    
    // JSONBin bin IDs for each profile
    JSONBIN_BINS: {
        tech: '68c80246ae596e708fef591c',     // Tech voting bin
        movies: '68c8025a43b1c97be9439cdd',   // Movies voting bin  
        food: '68c8026dd0ea881f407e8a99'      // Food voting bin
    },
    
    // Default profile
    DEFAULT_PROFILE: 'tech',
    
    // Polling intervals (ms)
    JSONBIN_POLL_INTERVAL: 3000,  // Check JSONBin for updates every 3 seconds
    STATIC_POLL_INTERVAL: 5000    // Local storage polling (if JSONBin disabled)
};
