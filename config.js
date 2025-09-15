// Configuration for the voting app
// Set BACKEND_URL to null to run in static mode (GitHub Pages)
// Set BACKEND_URL to your server URL to enable real-time features

const APP_CONFIG = {
    // Backend server URL - set to null for static mode (GitHub Pages)
    // Examples:
    // - For local development: 'http://localhost:3000'
    // - For production: 'https://your-server.com'
    // - For GitHub Pages (static): null
    BACKEND_URL: null,  // Set to null for GitHub Pages (static mode)
    
    // Default profile when running in static mode
    DEFAULT_PROFILE: 'tech',
    
    // Polling interval for simulated real-time updates in static mode (ms)
    STATIC_POLL_INTERVAL: 5000
};
