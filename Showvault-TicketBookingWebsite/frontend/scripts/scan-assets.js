const fs = require('fs');
const path = require('path');

/**
 * Real-time asset scanner that generates a JSON file with all images
 * Run this script whenever you add new images to see them in the browser
 */

const ASSETS_PATH = path.join(__dirname, '../src/assets/images');
const OUTPUT_PATH = path.join(__dirname, '../src/assets/images-list.json');

const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.avif'];

function isImageFile(filename) {
    const ext = path.extname(filename).toLowerCase();
    return IMAGE_EXTENSIONS.includes(ext);
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function getMimeType(filename) {
    const ext = path.extname(filename).toLowerCase();
    const mimeTypes = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.webp': 'image/webp',
        '.svg': 'image/svg+xml',
        '.bmp': 'image/bmp',
        '.avif': 'image/avif'
    };
    return mimeTypes[ext] || 'image/jpeg';
}

function scanDirectory(dirPath, baseAssetsPath, currentPath = 'assets/images') {
    const result = {
        files: [],
        folders: []
    };
    
    try {
        if (!fs.existsSync(dirPath)) {
            console.log(`📁 Directory not found: ${dirPath}`);
            return result;
        }

        const entries = fs.readdirSync(dirPath, { withFileTypes: true });
        
        for (const entry of entries) {
            const fullPath = path.join(dirPath, entry.name);
            const stats = fs.statSync(fullPath);
            const relativePath = `${currentPath}/${entry.name}`;
            
            if (entry.isDirectory()) {
                // Add folder info
                const folderContents = fs.readdirSync(fullPath);
                const imageCount = folderContents.filter(file => {
                    const filePath = path.join(fullPath, file);
                    return fs.statSync(filePath).isFile() && isImageFile(file);
                }).length;
                
                result.folders.push({
                    name: entry.name,
                    path: relativePath,
                    size: `${imageCount} images`,
                    type: 'folder',
                    lastModified: stats.mtime.toISOString()
                });
                
            } else if (entry.isFile() && isImageFile(entry.name)) {
                // Add image file
                result.files.push({
                    name: entry.name,
                    path: relativePath,
                    size: formatFileSize(stats.size),
                    type: 'file',
                    mimeType: getMimeType(entry.name),
                    lastModified: stats.mtime.toISOString()
                });
            }
        }
    } catch (error) {
        console.error(`❌ Error scanning directory ${dirPath}:`, error.message);
    }
    
    return result;
}

function scanAllDirectories(basePath, currentPath = 'assets/images') {
    const allData = {};
    
    function scanRecursive(dirPath, pathKey) {
        const scanResult = scanDirectory(dirPath, basePath, pathKey);
        allData[pathKey] = [...scanResult.folders, ...scanResult.files];
        
        // Recursively scan subdirectories
        scanResult.folders.forEach(folder => {
            const subDirPath = path.join(dirPath, folder.name);
            const subPathKey = folder.path;
            scanRecursive(subDirPath, subPathKey);
        });
    }
    
    scanRecursive(basePath, currentPath);
    return allData;
}

function generateImagesList() {
    console.log('🔍 Scanning assets/images folder...');
    console.log(`📂 Base path: ${ASSETS_PATH}`);
    
    const imagesList = {
        generatedAt: new Date().toISOString(),
        version: '1.0.0',
        totalScanned: 0,
        directories: {}
    };
    
    if (!fs.existsSync(ASSETS_PATH)) {
        console.log('⚠️  Assets/images folder not found, creating empty structure...');
        imagesList.directories['assets/images'] = [];
    } else {
        // Scan all directories
        imagesList.directories = scanAllDirectories(ASSETS_PATH);
        
        // Count total items
        imagesList.totalScanned = Object.values(imagesList.directories)
            .reduce((total, items) => total + items.length, 0);
    }
    
    // Write to JSON file
    try {
        // Ensure the directory exists
        const outputDir = path.dirname(OUTPUT_PATH);
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }
        
        fs.writeFileSync(OUTPUT_PATH, JSON.stringify(imagesList, null, 2));
        console.log(`✅ Images list generated: ${OUTPUT_PATH}`);
        console.log(`📊 Total items scanned: ${imagesList.totalScanned}`);
        
        // Show directory breakdown
        Object.entries(imagesList.directories).forEach(([dir, items]) => {
            const files = items.filter(item => item.type === 'file');
            const folders = items.filter(item => item.type === 'folder');
            console.log(`   📁 ${dir}: ${files.length} images, ${folders.length} folders`);
        });
        
    } catch (error) {
        console.error('❌ Error writing images list:', error.message);
        process.exit(1);
    }
}

// Run the script
if (require.main === module) {
    generateImagesList();
}

module.exports = { generateImagesList };