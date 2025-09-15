# JSONBin Setup for Shared Voting on GitHub Pages

This app supports JSONBin.io for shared voting storage that works on GitHub Pages!

## Setup Steps

### 1. Create a JSONBin Account
1. Go to [JSONBin.io](https://jsonbin.io/)
2. Sign up for a free account
3. Go to the API Keys section in your dashboard
4. You need the **X-Master-Key** (NOT a regular API key):
   - The X-Master-Key is shown at the top of the API Keys page
   - It starts with `$2b$10$` or `$2a$10$`
   - This is different from the API keys you create
   - The X-Master-Key has full access to create/update bins

### 2. Configure the App
Edit `config.js` and update:

```javascript
JSONBIN_MODE: true,  // Enable JSONBin mode
JSONBIN_API_KEY: 'your-actual-api-key-here',  // Your X-Master-Key from JSONBin
```

### 3. Create Bins (Optional)
The app will automatically create bins for each voting profile on first use. 
If you want to create them manually:

1. Go to JSONBin.io dashboard
2. Create a new bin for each profile (tech, movies, food)
3. Add the bin IDs to config.js:

```javascript
JSONBIN_BINS: {
    tech: 'your-tech-bin-id',
    movies: 'your-movies-bin-id',
    food: 'your-food-bin-id'
}
```

### 4. Deploy to GitHub Pages
1. Commit and push your changes
2. The app will now share votes across all users!

## How It Works

- When `JSONBIN_MODE` is enabled, the app stores all votes in JSONBin
- Every user sees the same vote counts in real-time
- The app polls JSONBin every 3 seconds for updates
- Each browser is tracked by fingerprint to prevent duplicate votes

## Fallback Modes

The app has three modes:
1. **Backend Mode**: When a Node.js server is running (best for real-time)
2. **JSONBin Mode**: Uses JSONBin.io for shared storage (works on GitHub Pages!)
3. **Static Mode**: Uses localStorage only (each user has independent votes)

## Free Tier Limits

JSONBin.io free tier includes:
- 10,000 requests per month
- Unlimited bins
- 100KB per bin

This is more than enough for a voting app!

## Troubleshooting

If you see "Invalid X-Master-Key":
- Make sure you're using the X-Master-Key, not the X-Access-Key
- The key should start with `$2b$` or `$2a$`
- Don't include any extra spaces or quotes

If votes aren't syncing:
- Check browser console for errors
- Verify JSONBIN_MODE is set to true
- Make sure your API key is correct
- Check that you haven't exceeded the free tier limits