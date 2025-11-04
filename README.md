# Technology Voting App

A real-time voting application for technology polls (2000-2025) with live updates, QR code sharing, and time-lapse replay features.

## Live Demo

🔗 **Vote Now**: [event.codenotary.io](https://event.codenotary.io)

## Features

- ✅ Real-time voting with live leaderboard updates
- 📱 QR code for easy mobile access
- ⏱️ Time-lapse replay of voting history (1x, 2x, 4x speed)
- 🔄 Vote change support with optimistic UI updates
- 🎨 Beautiful gradient UI with animated vote balls
- 📊 Multi-profile support (tech, movies, food)
- ☁️ Cloud storage via JSONBin API for shared voting
- 📈 **Stats PNG endpoint** for PowerPoint embedding

## Stats PNG Endpoint

### PowerPoint Embedding URL

Embed live-updating voting stats in presentations:

```
https://event.codenotary.io/stats/leaderboard.png
```

### How It Works

- Auto-generates every **5 minutes** via GitHub Actions
- Shows current leaderboard with vote counts
- 800x600 PNG optimized for presentations
- Updates automatically when you reopen PowerPoint

### Usage in PowerPoint

1. Insert → Pictures → Picture from File
2. Paste the URL above
3. Image updates when you reopen the presentation or use "Update Links"

For more details, see [stats/README.md](stats/README.md)

## Technology Stack

- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Cloud Storage**: JSONBin.io API
- **Automation**: GitHub Actions
- **Deployment**: GitHub Pages (static hosting)
- **Libraries**: QRCode.js, Puppeteer (for PNG generation)

## Development

This is a static web application designed for GitHub Pages deployment.

### File Structure

```
├── index.html              # Main voting interface
├── admin.html              # Admin panel for managing profiles
├── config.js               # App configuration (JSONBin settings)
├── app-backend.js          # Main application logic
├── admin.js                # Admin panel logic
├── profiles/               # Vote profile data
├── voters/                 # Voter tracking
├── scripts/                # PNG generation scripts
│   ├── generate-stats-image.js
│   ├── stats-template.html
│   └── package.json
├── stats/                  # Generated PNG images
│   └── leaderboard.png
└── .github/workflows/      # GitHub Actions
    └── generate-stats.yml
```

### Local Development

1. Clone the repository
2. Open `index.html` in a browser
3. Or use a local server: `npx serve`

### Admin Access

- URL: `/admin.html`
- Password protected (see `admin.js`)
- Manage profiles, reset votes, view live stats

## Operating Modes

The app automatically detects and uses the best available mode:

1. **JSONBin Mode** (Current): Cloud storage for shared voting on GitHub Pages
2. **Backend Mode**: Real-time WebSocket with Node.js server
3. **Static Mode**: Local storage fallback

## Configuration

Edit `config.js` to configure:
- JSONBin API keys and bin IDs
- Backend server URL (if using server mode)
- Default profile
- Polling intervals

## Deployment

Deployed on GitHub Pages with automatic stats generation via GitHub Actions.

### GitHub Actions Setup

The stats PNG is generated automatically. To set it up:

1. Add `JSONBIN_API_KEY` to repository secrets (optional - already in code)
2. Workflow runs every 5 minutes automatically
3. Can also trigger manually from Actions tab

## License

MIT License

## Credits

Built by vchaindz
