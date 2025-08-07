const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

// Load environment variables if .env file exists
const dotenvPath = path.join(__dirname, '.env');
if (fs.existsSync(dotenvPath)) {
    const envContent = fs.readFileSync(dotenvPath, 'utf8');
    envContent.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
            const [key, value] = trimmed.split('=');
            if (key && value) {
                process.env[key.trim()] = value.trim();
            }
        }
    });
}

const PORT = process.env.PORT || 3000;

// MIME types for different file extensions
const mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
    // Parse URL
    const parsedUrl = url.parse(req.url);
    let pathname = parsedUrl.pathname;
    
    // Default to index.html for root path
    if (pathname === '/') {
        pathname = '/index.html';
    }
    
    // Get file extension
    const ext = path.extname(pathname).toLowerCase();
    
    // Set content type
    const contentType = mimeTypes[ext] || 'application/octet-stream';
    
    // Construct file path
    let filePath = path.join(__dirname, pathname);
    
    // Security: prevent directory traversal
    if (!filePath.startsWith(__dirname)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
    }
    
    // Check if file exists, if not and it's in libs, try node_modules
    if (!fs.existsSync(filePath) && pathname.startsWith('/libs/')) {
        // If libs directory doesn't exist or file not found, create it
        const libsDir = path.join(__dirname, 'libs');
        if (!fs.existsSync(libsDir)) {
            console.log('libs directory not found, running build script...');
            try {
                require('./build.js');
            } catch (e) {
                console.error('Failed to run build script:', e.message);
            }
        }
    }
    
    // Special handling for config.js to inject environment variables
    if (pathname === '/config.js') {
        const configContent = fs.readFileSync(filePath, 'utf8');
        
        // Inject the Stytch environment variables
        const modifiedConfig = `
// Injected environment variables
window.STYTCH_PUBLIC_TOKEN = '${process.env.STYTCH_PUBLIC_TOKEN || ''}';
window.STYTCH_ORGANIZATION_ID = '${process.env.STYTCH_ORGANIZATION_ID || ''}';
window.STYTCH_ORGANIZATION_SLUG = '${process.env.STYTCH_ORGANIZATION_SLUG || ''}';

${configContent}
        `;
        
        res.writeHead(200, { 'Content-Type': 'text/javascript' });
        res.end(modifiedConfig);
        return;
    }
    
    // Read and serve file
    fs.readFile(filePath, (error, content) => {
        if (error) {
            if (error.code === 'ENOENT') {
                // File not found
                res.writeHead(404);
                res.end('404 - File Not Found');
            } else {
                // Server error
                res.writeHead(500);
                res.end(`Server Error: ${error.code}`);
            }
        } else {
            // Success
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});

server.listen(PORT, () => {
    console.log(`\n🚀 Server running at http://localhost:${PORT}\n`);
    
    if (!process.env.STYTCH_PUBLIC_TOKEN) {
        console.log('⚠️  Warning: STYTCH_PUBLIC_TOKEN not set!');
        console.log('   Please set it in one of these ways:');
        console.log('   1. Create a .env file in the app directory with:');
        console.log('      STYTCH_PUBLIC_TOKEN=your-public-token-here\n');
        console.log('   2. Set it as an environment variable:');
        console.log('      STYTCH_PUBLIC_TOKEN=your-token npm start\n');
    } else {
        console.log('✅ Stytch Public Token configured');
        console.log(`   Token: ${process.env.STYTCH_PUBLIC_TOKEN.substring(0, 20)}...`);
    }
    
    if (process.env.STYTCH_ORGANIZATION_ID) {
        console.log('✅ Stytch Organization ID configured');
        console.log(`   Organization ID: ${process.env.STYTCH_ORGANIZATION_ID.substring(0, 20)}...`);
    } else {
        console.log('ℹ️  No Organization ID set - will use discovery flow');
    }
    
    if (process.env.STYTCH_ORGANIZATION_SLUG) {
        console.log('✅ Stytch Organization Slug configured');
        console.log(`   Organization Slug: ${process.env.STYTCH_ORGANIZATION_SLUG}`);
    }
    
    console.log('\nPress Ctrl+C to stop the server\n');
});