const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

// Configuration from parent config.js
const JSONBIN_API_KEY = process.env.JSONBIN_API_KEY || '$2a$10$d5csxfBvkFf6kUNZicShX.eK17pWhq6e3XN.QbZBj2WDx6hrilr9m';
const JSONBIN_BASE_URL = 'https://api.jsonbin.io/v3';
const JSONBIN_BIN_ID = '68c80246ae596e708fef591c'; // tech profile

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

async function generateStatsImage() {
    console.log('Starting PNG generation...');

    // Fetch current voting data
    const votingData = await fetchVotingData();
    console.log(`Loaded data: ${votingData.items.length} items, ${Object.values(votingData.votes).reduce((a, b) => a + b, 0)} total votes`);

    // Read HTML template
    const templatePath = path.join(__dirname, 'stats-template.html');
    let htmlContent = await fs.readFile(templatePath, 'utf8');

    // Inject data into template
    htmlContent = htmlContent.replace(
        '{{STATS_DATA}}',
        JSON.stringify({
            description: votingData.description || 'Most Important Technology',
            items: votingData.items || [],
            votes: votingData.votes || {}
        })
    );

    // Launch Puppeteer
    console.log('Launching browser...');
    const browser = await puppeteer.launch({
        headless: 'new',
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu'
        ]
    });

    try {
        const page = await browser.newPage();

        // Set viewport to 800x600
        await page.setViewport({
            width: 800,
            height: 600,
            deviceScaleFactor: 2 // High DPI for better quality
        });

        // Load the HTML
        await page.setContent(htmlContent, {
            waitUntil: 'networkidle0'
        });

        // Give time for rendering
        await page.waitForTimeout(1000);

        // Take screenshot
        console.log('Capturing screenshot...');
        const outputPath = path.join(__dirname, '..', 'stats', 'leaderboard.png');
        await page.screenshot({
            path: outputPath,
            type: 'png',
            fullPage: false
        });

        console.log(`✅ Stats image generated: ${outputPath}`);
    } finally {
        await browser.close();
    }
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
