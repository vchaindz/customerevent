const { createCanvas } = require('canvas');
const fs = require('fs').promises;
const path = require('path');

// Configuration from parent config.js
const JSONBIN_API_KEY = process.env.JSONBIN_API_KEY || '$2a$10$d5csxfBvkFf6kUNZicShX.eK17pWhq6e3XN.QbZBj2WDx6hrilr9m';
const JSONBIN_BASE_URL = 'https://api.jsonbin.io/v3';
const JSONBIN_BIN_ID = '68c80246ae596e708fef591c'; // tech profile

const COLORS = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57', '#ff9ff3'];

async function fetchVotingData() {
    console.log('Fetching voting data from JSONBin...');

    try {
        const response = await fetch(`${JSONBIN_BASE_URL}/b/${JSONBIN_BIN_ID}/latest`, {
            method: 'GET',
            headers: {
                'X-Master-Key': JSONBIN_API_KEY,
                'X-Access-Key': JSONBIN_API_KEY
            }
        });

        if (!response.ok) {
            throw new Error(`JSONBin API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        return data.record;
    } catch (error) {
        console.error('Failed to fetch voting data:', error);
        throw error;
    }
}

function drawGradientBackground(ctx, width, height) {
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#667eea');
    gradient.addColorStop(1, '#764ba2');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
}

function drawRoundedRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
}

function drawBall(ctx, x, y, radius, color) {
    // Main ball
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();

    // Highlight
    const highlightGradient = ctx.createRadialGradient(
        x - radius * 0.3, y - radius * 0.3, 0,
        x, y, radius
    );
    highlightGradient.addColorStop(0, 'rgba(255, 255, 255, 0.6)');
    highlightGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = highlightGradient;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();

    // Shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 2;
}

async function generateStatsImage() {
    console.log('Starting PNG generation...');

    // Fetch current voting data
    const votingData = await fetchVotingData();
    const totalVotes = Object.values(votingData.votes).reduce((a, b) => a + b, 0);
    console.log(`Loaded data: ${votingData.items.length} items, ${totalVotes} total votes`);

    // Sort items by votes
    const sortedItems = votingData.items
        .map((item, index) => ({
            item,
            votes: votingData.votes[item] || 0,
            color: COLORS[index % COLORS.length]
        }))
        .sort((a, b) => b.votes - a.votes);

    // Create canvas
    const width = 800;
    const height = 600;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // Draw gradient background
    drawGradientBackground(ctx, width, height);

    // Draw main container
    const padding = 30;
    const containerX = padding;
    const containerY = padding;
    const containerWidth = width - padding * 2;
    const containerHeight = height - padding * 2;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    drawRoundedRect(ctx, containerX, containerY, containerWidth, containerHeight, 20);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw title
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 32px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🏆 Live Leaderboard', width / 2, containerY + 45);

    // Draw subtitle
    ctx.font = '16px Arial, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.fillText(votingData.description || 'Most Important Technology', width / 2, containerY + 75);

    // Draw timestamp
    ctx.font = '12px Arial, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    const timestamp = new Date().toLocaleString();
    ctx.fillText(`Updated: ${timestamp}`, width / 2, containerY + 95);

    // Draw leaderboard items
    const itemStartY = containerY + 120;
    const itemHeight = 65;
    const itemSpacing = 8;
    const maxItems = Math.min(sortedItems.length, 6); // Show top 6

    for (let i = 0; i < maxItems; i++) {
        const data = sortedItems[i];
        const y = itemStartY + i * (itemHeight + itemSpacing);

        // Reset shadow
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;

        // Item background
        ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
        drawRoundedRect(ctx, containerX + 20, y, containerWidth - 40, itemHeight, 12);
        ctx.fill();

        // Left border color
        ctx.fillStyle = data.color;
        ctx.fillRect(containerX + 20, y, 5, itemHeight);

        // Rank
        const rankIcon = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`;
        ctx.font = 'bold 24px Arial, sans-serif';
        ctx.fillStyle = '#ffd700';
        ctx.textAlign = 'left';
        ctx.fillText(rankIcon, containerX + 40, y + 40);

        // Item name
        ctx.font = 'bold 18px Arial, sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(data.item, containerX + 100, y + 30);

        // Vote count
        ctx.font = '14px Arial, sans-serif';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.fillText(`${data.votes} vote${data.votes !== 1 ? 's' : ''}`, containerX + 100, y + 50);

        // Draw balls
        const ballRadius = 8;
        const ballSpacing = 4;
        const ballStartX = containerX + 320;
        const ballY = y + itemHeight / 2;
        const maxBalls = 35;
        const ballCount = Math.min(data.votes, maxBalls);

        for (let b = 0; b < ballCount; b++) {
            const ballX = ballStartX + b * (ballRadius * 2 + ballSpacing);
            if (ballX + ballRadius < containerX + containerWidth - 60) {
                drawBall(ctx, ballX, ballY, ballRadius, data.color);
            }
        }

        // Overflow indicator
        if (data.votes > maxBalls) {
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
            ctx.font = '13px Arial, sans-serif';
            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'left';
            const overflowX = ballStartX + maxBalls * (ballRadius * 2 + ballSpacing);
            ctx.fillText(`+${data.votes - maxBalls}`, overflowX, ballY + 5);
        }
    }

    // Save to file
    const outputPath = path.join(__dirname, '..', 'stats', 'leaderboard.png');
    const buffer = canvas.toBuffer('image/png');
    await fs.writeFile(outputPath, buffer);

    console.log(`✅ Stats image generated: ${outputPath}`);
    console.log(`   Size: ${Math.round(buffer.length / 1024)} KB`);
}

// Run the generator
generateStatsImage()
    .then(() => {
        console.log('✅ PNG generation completed successfully');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ PNG generation failed:', error);
        process.exit(1);
    });
