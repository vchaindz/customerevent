# Stats PNG Endpoint

This directory contains the auto-generated PNG image of the voting leaderboard, updated every 5 minutes by GitHub Actions.

## PowerPoint Embedding URL

Use this URL to embed the live-updating stats image in PowerPoint:

```
https://raw.githubusercontent.com/vchaindz/customerevent/main/stats/leaderboard.png
```

## How It Works

1. **GitHub Actions Workflow** runs every 5 minutes
2. Fetches current voting data from JSONBin API
3. Generates an 800x600 PNG image of the leaderboard
4. Commits the image back to this repository
5. PowerPoint can fetch the latest image from the URL above

## Embedding in PowerPoint

1. Insert → Pictures → Picture from File
2. Paste the URL above
3. The image will auto-update when you:
   - Reopen the presentation
   - Use "Update Links" in PowerPoint
   - Manually refresh the image

## Update Frequency

- **Automatic**: Every 5 minutes via GitHub Actions
- **Manual**: Trigger workflow manually in GitHub Actions tab
- **Data Latency**: Up to 5 minutes behind live votes

## Image Details

- **Dimensions**: 800x600 pixels
- **Format**: PNG with transparency
- **File Size**: ~50-100 KB
- **Quality**: 2x device scale factor (Retina/HiDPI ready)

## Troubleshooting

**Image not updating?**
- Check GitHub Actions workflow status
- Verify JSONBin API key is set in repository secrets
- Wait up to 5 minutes for next scheduled run

**Image broken in PowerPoint?**
- Ensure you're using the raw.githubusercontent.com URL
- Check repository is public
- Try "Update Links" in PowerPoint File menu
