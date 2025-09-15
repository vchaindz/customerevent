# How to Get Your JSONBin X-Master-Key

## Important: X-Master-Key vs Regular API Key

JSONBin has TWO types of keys:
1. **X-Master-Key** - Full access, can create/update bins (YOU NEED THIS ONE!)
2. **Regular API Keys** - Limited access, custom permissions

## Steps to Get X-Master-Key:

1. **Login to JSONBin.io**
   - Go to https://jsonbin.io/login

2. **Navigate to API Keys**
   - Click on "API Keys" in the left sidebar
   - Or go directly to: https://jsonbin.io/api-keys

3. **Find Your X-Master-Key**
   - At the TOP of the page, you'll see a section labeled "X-Master-Key"
   - It will show your key that looks like: `$2b$10$xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
   - Click the "Copy" button next to it

4. **Update config.js**
   ```javascript
   JSONBIN_MODE: true,
   JSONBIN_API_KEY: '$2b$10$your-actual-key-here',
   ```

## Visual Guide:

```
JSONBin Dashboard
├── Overview
├── Bins
├── API Keys  <-- Click here
│   ├── X-Master-Key section  <-- THIS IS WHAT YOU NEED
│   │   └── $2b$10$xxxxxx... [Copy]
│   └── API Keys section  <-- NOT these
│       └── Your created API keys
```

## Why X-Master-Key?

- The X-Master-Key has FULL access to your account
- It can create new bins (needed for first-time setup)
- It can read and update existing bins
- Regular API keys can't create new bins

## Security Note:

- Never share your X-Master-Key publicly
- For production, consider using environment variables
- The key in config.js will be visible in your GitHub repo
- For better security, create the bins manually and use a restricted API key

## Alternative: Use Pre-created Bins

If you don't want to expose your X-Master-Key:

1. Manually create 3 bins in JSONBin dashboard
2. Note their IDs
3. Create a regular API key with read/write permissions
4. Update config.js with the bin IDs and regular API key

But for testing, using the X-Master-Key is the easiest approach!