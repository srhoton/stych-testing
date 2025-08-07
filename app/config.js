// Configuration for Stytch
// These values should be set as environment variables or in a .env file
// For local development, you can create a config.local.js file (add to .gitignore)

const STYTCH_CONFIG = {
    // Get these from environment variables or prompt user to set them
    PUBLIC_TOKEN: window.STYTCH_PUBLIC_TOKEN || '',
    
    // OAuth redirect URL - for local development
    // Make sure this EXACT URL is added to your Stytch Dashboard OAuth settings
    REDIRECT_URL: window.location.origin || 'http://localhost:3000',
    
    // OAuth settings
    OAUTH_PROVIDERS: ['google'],
    
    // Session duration in minutes
    SESSION_DURATION: 60,
    
    // For localhost development, we might need to use test mode
    // Make sure your Stytch project is configured for localhost:3000
    ENVIRONMENT: 'test', // or 'live' for production
    
    // B2B specific settings
    // For B2B OAuth, you can either:
    // 1. Use discovery flow (no organization needed upfront)
    // 2. Specify organization_id for direct authentication
    ORGANIZATION_ID: window.STYTCH_ORGANIZATION_ID || '', // From environment variable
    ORGANIZATION_SLUG: window.STYTCH_ORGANIZATION_SLUG || 'steverhoton' // From environment variable or default
};

// Check if config is properly set
if (!STYTCH_CONFIG.PUBLIC_TOKEN) {
    console.warn('Stytch Public Token not set. Please set STYTCH_PUBLIC_TOKEN environment variable or update config.js');
}