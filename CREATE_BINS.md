# Creating JSONBin Bins for Voting App

Since you're using a custom API key (not the X-Master-Key), you need to create the bins manually first.

## Step 1: Create Three Bins in JSONBin Dashboard

Go to https://jsonbin.io/app/bins and create 3 new bins with this exact content:

### Bin 1: Tech Voting
```json
{
  "profile": "tech",
  "description": "Vote for Most Important Technology 2000-2025",
  "items": ["64bit", "Virtualization", "Cloud computing", "LLMs", "AI in datacenter Ops", "TCP/IP"],
  "votes": {
    "64bit": 0,
    "Virtualization": 0,
    "Cloud computing": 0,
    "LLMs": 0,
    "AI in datacenter Ops": 0,
    "TCP/IP": 0
  },
  "voters": {},
  "lastUpdated": "2024-01-01T00:00:00Z"
}
```

### Bin 2: Movies Voting
```json
{
  "profile": "movies",
  "description": "Vote for Best Movie of All Time",
  "items": ["The Godfather", "Star Wars", "The Matrix", "Inception", "Pulp Fiction", "The Dark Knight"],
  "votes": {
    "The Godfather": 0,
    "Star Wars": 0,
    "The Matrix": 0,
    "Inception": 0,
    "Pulp Fiction": 0,
    "The Dark Knight": 0
  },
  "voters": {},
  "lastUpdated": "2024-01-01T00:00:00Z"
}
```

### Bin 3: Food Voting
```json
{
  "profile": "food",
  "description": "Vote for Your Favorite Food",
  "items": ["Pizza", "Sushi", "Burgers", "Tacos", "Pasta", "Ice Cream"],
  "votes": {
    "Pizza": 0,
    "Sushi": 0,
    "Burgers": 0,
    "Tacos": 0,
    "Pasta": 0,
    "Ice Cream": 0
  },
  "voters": {},
  "lastUpdated": "2024-01-01T00:00:00Z"
}
```

## Step 2: Get the Bin IDs

After creating each bin, you'll get a Bin ID that looks like: `65abc123def456789...`

Note down all three IDs.

## Step 3: Update config.js

```javascript
const APP_CONFIG = {
    BACKEND_URL: null,
    
    // Enable JSONBin mode
    JSONBIN_MODE: true,
    
    // Your custom API key (with all permissions)
    JSONBIN_API_KEY: 'your-custom-api-key-here',
    
    JSONBIN_BASE_URL: 'https://api.jsonbin.io/v3',
    
    // Add your bin IDs here
    JSONBIN_BINS: {
        tech: 'your-tech-bin-id',
        movies: 'your-movies-bin-id',
        food: 'your-food-bin-id'
    },
    
    DEFAULT_PROFILE: 'tech',
    JSONBIN_POLL_INTERVAL: 3000,
    STATIC_POLL_INTERVAL: 5000
};
```

## Step 4: Test It

1. Save config.js
2. Open index.html in your browser
3. You should see "🌐 JSONBin Mode (Shared Storage)"
4. Try voting - it should update the JSONBin!

## Verification

To verify it's working:
1. Vote for something
2. Open a different browser (or incognito window)
3. You should see the same vote counts!

## Troubleshooting

If you get errors:
- Check browser console (F12)
- Verify your API key has Read and Update permissions
- Make sure the bin IDs are correct
- Ensure bins are set to "Public" or your API key has access