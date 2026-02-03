
const fs = require('fs');
const https = require('https');
const path = require('path');

const URLS = [
    'https://forum.hellfest.fr/t/jeudi-18-juin-infos-liens-bios/12801',
    'https://forum.hellfest.fr/t/vendredi-19-juin-infos-liens-bios/12802',
    'https://forum.hellfest.fr/t/samedi-20-juin-infos-liens-bios/12803',
    'https://forum.hellfest.fr/t/dimanche-21-juin-infos-liens-bios/12804'
];

const OUTPUT_FILE = path.join(__dirname, 'src/data/bandLogos.json');

// Regex patterns based on user description
// Looking for: <hr> ... <img src="..."> ... <h2>BAND NAME</h2>
// Since regex on HTML is fragile, we'll try a flexible pattern that captures the img src before a h2
// Structure: <img src="(URL)" ...> ... <h2>(NAME)</h2>
// Revised regex based on user feedback:
// Structure: <hr> ... <img src="LOGO"> ... <h2>BAND</h2>
// We want the image *immediately* after the HR (or close to it) and before the H2.
// The previous regex likely skipped the logo and grabbed a social icon inside the block if the logo wasn't picked up correctly.
// Let's try: <hr>[\s\S]*?<img src="([^"]+)"[^>]*>[\s\S]*?<h2>(.*?)<\/h2>
const REGEX_BLOCK = /<hr>[\s\S]*?<img src="([^"]+)"[^>]*>[\s\S]*?<h2>(.*?)<\/h2>/g;

async function fetchHtml(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => resolve(data));
        }).on('error', reject);
    });
}

async function scrape() {
    const bandLogos = {};
    let totalFound = 0;

    console.log('🚀 Starting scraping...');

    for (const url of URLS) {
        console.log(`\n📄 Fetching: ${url}`);
        try {
            const html = await fetchHtml(url);

            // We need to iterate over matches
            let match;
            let count = 0;

            // Re-create regex for each loop to avoid index issues
            const regex = new RegExp(REGEX_BLOCK);

            // The user said the structure is: HR -> IMG -> H2.
            // HTML might be slightly messy. Let's look for "img src... h2" proximity.
            // Actually, simply scanning for the pattern: 
            // src="...url..." ... <h2>NAME</h2> 
            // might be enough if they are close.

            // Let's refine the regex to be safer:
            // Find <h2>, look backward for <img>? No, regex goes forward.
            // Find <img>, then non-greedy match until <h2>.

            while ((match = regex.exec(html)) !== null) {
                const imgUrl = match[1];
                let bandName = match[2];

                // cleanup band name (remove HTML tags if any, trim)
                bandName = bandName.replace(/<[^>]*>/g, '').trim();

                // Cleanup URL if relative
                if (imgUrl.startsWith('/')) {
                    // It seems forum urls are absolute in the example, but just in case
                    // bandLogos[bandName] = 'https://forum.hellfest.fr' + imgUrl;
                }

                // Decode HTML entities in band name (e.g. &amp;)
                bandName = bandName.replace(/&amp;/g, '&');

                if (bandName && imgUrl && !bandName.includes('Scene')) { // Filter out potential headers
                    bandLogos[bandName] = imgUrl;
                    process.stdout.write(`✅ ${bandName} `);
                    count++;
                }
            }
            console.log(`\n---> Found ${count} logos.`);
            totalFound += count;

        } catch (err) {
            console.error(`❌ Error fetching ${url}:`, err.message);
        }
    }

    // Ensure directory exists
    const dir = path.dirname(OUTPUT_FILE);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(bandLogos, null, 2));
    console.log(`\n🎉 Done! Saved ${totalFound} logos to ${OUTPUT_FILE}`);
}

scrape();
