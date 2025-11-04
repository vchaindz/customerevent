# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Technology Voting App** - A real-time voting application for technology polls (2000-2025). The app features live vote updates, QR code sharing, time-lapse replay of voting history, and multiple operating modes (static, backend, and JSONBin cloud storage).

## Key Commands

```bash
# Development
npm install              # Install dependencies
npm run dev             # Start development server with auto-reload (uses nodemon)
npm start               # Start production server

# The app runs on port 3000 by default
# Access: http://localhost:3000
```

## Architecture

### Operating Modes

The app supports **three distinct modes** that are automatically detected at runtime:

1. **Backend Mode** (Real-time WebSocket)
   - Node.js/Express server with Socket.io
   - Live bi-directional updates
   - Server runs on port 3000
   - Files: `server.js`, `app-backend.js`

2. **JSONBin Mode** (Cloud Storage)
   - Serverless operation via JSONBin.io API
   - Shared voting across all users on GitHub Pages
   - 3-second polling for updates
   - Files: `app-backend.js` (handles JSONBin API)
   - Config: `config.js` defines API keys and bin IDs

3. **Static Mode** (Local Storage)
   - Completely client-side using localStorage
   - No server required
   - Fallback when no backend available

### File Structure

```
Root Files:
- index.html          # Main voting interface (production)
- admin.html          # Admin panel for managing profiles
- config.js           # App configuration (backend URL, JSONBin settings)
- voting.cnf          # Configuration file for vote items
- server.js           # Express backend server with Socket.io

JavaScript:
- app-backend.js      # Main app logic (handles all 3 modes)
- app-hybrid.js       # Alternative hybrid implementation
- app-jsonbin.js      # Dedicated JSONBin implementation
- admin.js            # Admin panel logic

Data Storage:
- profiles/           # Profile configurations (tech.json, movies.json, food.json)
- voters/             # Voter tracking (fingerprint -> vote mapping)
- public/             # Static assets served by backend
```

### Core Features

1. **Browser Fingerprinting**
   - Canvas-based fingerprint generation
   - Prevents duplicate voting from same browser
   - Persists across page reloads

2. **Vote Management**
   - Users can change their vote
   - Optimistic UI updates for instant feedback
   - Automatic rollback on server errors

3. **Time Lapse Replay**
   - Replay voting history from 0 to current state
   - Adjustable speed (1x, 2x, 4x)
   - Animated vote counting with progressive updates

4. **QR Code Sharing**
   - Auto-generated QR code for mobile voting
   - Positioned on left side of header
   - Points to event.codenotary.io

5. **Multi-Profile Support**
   - Dynamic profile loading from master list
   - Profiles: tech, movies, food (extensible)
   - URL-based profile selection: `/vote/{profile}`

### Data Flow

**JSONBin Mode (Current Production Setup):**
```
User votes → Optimistic UI update → JSONBin API PUT →
Poll every 3s → Update UI if changes detected
```

**Backend Mode:**
```
User votes → Server API → Socket.io broadcast →
All clients update in real-time
```

### Configuration

All app configuration is in `config.js`:
- `BACKEND_URL`: Node.js server URL (null for static/JSONBin mode)
- `JSONBIN_MODE`: Enable/disable JSONBin cloud storage
- `JSONBIN_API_KEY`: API key for JSONBin.io
- `JSONBIN_BINS`: Object mapping profile names to bin IDs
- Polling intervals for updates

### Admin Panel

Access: `/admin.html`
- Password protected (hardcoded in `admin.js`)
- View live statistics
- Edit profiles and vote items
- Reset votes
- Manage multiple voting profiles

## Important Notes

- **Never commit secrets**: JSONBin API keys are already in the repo (consider rotating)
- **Commit messages**: Use simple descriptions without author attribution (just "vchaindz")
- **File organization**: Never save working files/tests to root folder
- **Optimistic updates**: Vote changes update UI immediately, then sync to backend
- **Concurrency**: Server uses file-based locking for concurrent write safety
- **Mobile optimized**: Responsive design with touch-friendly buttons (44px minimum)

## Technology Stack

- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Backend**: Express.js, Socket.io, Node.js
- **Storage**: File system (JSON), JSONBin.io API, localStorage
- **Libraries**: QRCode.js for QR code generation
- **Audio**: Water drop sound effect on votes
