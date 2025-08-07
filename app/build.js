const fs = require('fs');
const path = require('path');

console.log('Building Stytch SDK bundle...');

// Create a libs directory for vendor files
const libsDir = path.join(__dirname, 'libs');
if (!fs.existsSync(libsDir)) {
    fs.mkdirSync(libsDir);
}

// Use the headless ESM version which should work better in browser
const stytchPath = path.join(__dirname, 'node_modules', '@stytch', 'vanilla-js', 'dist', 'index.headless.esm.js');

if (!fs.existsSync(stytchPath)) {
    console.error('Could not find Stytch SDK in node_modules.');
    console.error('Please run: npm install');
    process.exit(1);
}

console.log(`Found Stytch SDK at: ${stytchPath}`);

let stytchSource = fs.readFileSync(stytchPath, 'utf8');

// Wrap the ESM module to make it work as a browser script
// This creates a self-executing function that adds exports to window
const wrappedSource = `
(function() {
    // Polyfill for CommonJS-style exports in browser
    if (typeof exports === 'undefined') {
        var exports = {};
        var module = { exports: exports };
    }
    
    ${stytchSource}
    
    // Export all named exports to window
    if (typeof window !== 'undefined') {
        // Look for exports in the module
        if (typeof module !== 'undefined' && module.exports) {
            Object.assign(window, module.exports);
        }
        // Also check for direct exports
        if (typeof exports !== 'undefined') {
            Object.assign(window, exports);
        }
    }
})();
`;

// Write the wrapped Stytch SDK to libs directory
const outputPath = path.join(libsDir, 'stytch.js');
fs.writeFileSync(outputPath, wrappedSource);

console.log(`✅ Stytch SDK bundled to: ${outputPath}`);
console.log('\nYou can now run: npm start');