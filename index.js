const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

// Check the response status
function checkStatus(response) {
    if (response.status != 200) throw new Error(`⛔ Failed to fetch webpage: ${response.statusText}`);
}

// Create download folders
async function createFolders(folderName) {
    const downloadDir = path.join(__dirname, folderName);
    if (!fs.existsSync(downloadDir)) {
        fs.mkdirSync(downloadDir);
        console.info(`📁 Created directory: ${downloadDir}`);
    }
    return downloadDir;
}

// Download image function
async function downloadImage(url, filePath) {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to download image: ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    await fs.promises.writeFile(filePath, buffer);
}

// Main function
async function main() {
    console.log("Searching For Images...");
    const url = "https://basicappleguy.com/?offset=1714399059698&category=Wallpaper";
    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    try {
        // Get General URL
        const response = await axios.get(url);
        checkStatus(response);
        
        // Load into Cheerio (HTML Parsing)
        const $ = cheerio.load(response.data);

        // Create main download directory
        const downloadDir = await createFolders("downloads");

        // Get Front-Page Links
        const headers = $('h1 a');
        const requests = headers.map(async (index, element) => {
            const pageLink = $(element).attr('href');
            const pageUrl = 'https://basicappleguy.com' + pageLink;
            const pageResponse = await axios.get(pageUrl);
            checkStatus(pageResponse);

            const page = cheerio.load(pageResponse.data);
            const imgLinks = page('p a');

            for (let i = 0; i < imgLinks.length; i++) {
                const element = imgLinks[i];
                let imgURL = page(element).attr('href');
                
                if (imgURL.startsWith('/s')) {
                    await delay(100);
                    const downloadURL = 'https://basicappleguy.com' + imgURL;
                    const filename = imgURL.replace(/^\/s/, '');
            
                    console.log("Found an Image! Starting download...");
            
                    // Sort into folders (iPhone, iPad, Mac)
                    let folderName = "Others";
                    if (filename.toLowerCase().includes("iphone")) {
                        folderName = "iPhone";
                    } else if (filename.toLowerCase().includes("ipad")) {
                        folderName = "iPad";
                    } else if (filename.toLowerCase().includes("mac")) {
                        folderName = "Mac";
                    }
            
                    const subDir = path.join(downloadDir, folderName);
                    if (!fs.existsSync(subDir)) {
                        fs.mkdirSync(subDir);
                        console.info(`📁 Created directory: ${subDir}`);
                    }
            
                    const filePath = path.join(subDir, filename);
                    
                    // Download the image sequentially
                    await downloadImage(downloadURL, filePath);
                    console.info(`🖼️ Saved image to ${filePath}`);
                    await delay(250);
                }
            }
        }).get();

        await Promise.all(requests); // Wait for all the page requests to finish

        console.log("Found All Images");
    } catch (error) {
        console.error(`Error: ${error.message}`);
    }
}

main();