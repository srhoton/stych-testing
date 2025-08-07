# Stytch OAuth Demo App

A simple client-side JavaScript application that demonstrates OAuth authentication using Stytch with Google as the provider.

## Features

- Google OAuth authentication via Stytch
- Session management
- Clean, responsive UI
- Environment variable configuration for security

## Setup Instructions

### 1. Get Your Stytch Credentials

1. Sign up for a [Stytch account](https://stytch.com)
2. Create a new project in the Stytch Dashboard
3. Navigate to **OAuth** in the dashboard
4. Enable Google as an OAuth provider
5. Add `http://localhost:3000` to your redirect URLs
6. Copy your **Public Token** from the API Keys section

### 2. Configure the Application

Create a `.env` file in the `app` directory:

```bash
cp .env.example .env
```

Edit `.env` and add your Stytch Public Token:

```
STYTCH_PUBLIC_TOKEN=your-public-token-here
```

Alternatively, you can set it as an environment variable when running the server:

```bash
STYTCH_PUBLIC_TOKEN=your-token-here npm start
```

### 3. Configure Stytch OAuth Settings

In your Stytch Dashboard:

1. Go to **OAuth** settings
2. Enable **Google** as a provider
3. Add `http://localhost:3000` to the **Redirect URLs**
4. Save your changes

### 4. Run the Application

```bash
# Navigate to the app directory
cd app

# Start the server
npm start

# Or with environment variable
STYTCH_PUBLIC_TOKEN=your-token-here npm start
```

The application will be available at `http://localhost:3000`

## How It Works

1. **Initial Load**: The app checks if the user has an existing Stytch session
2. **Unauthenticated State**: Shows a "Sign in with Google" button
3. **OAuth Flow**: 
   - Clicking the button redirects to Google OAuth
   - After authentication, Google redirects back to `http://localhost:3000` with a token
   - The app validates the token with Stytch and creates a session
4. **Authenticated State**: Shows user information and a logout button

## File Structure

- `index.html` - Main HTML page with UI structure
- `styles.css` - Styling for the application
- `auth.js` - Stytch authentication logic
- `config.js` - Configuration settings
- `server.js` - Simple Node.js server to serve files and inject environment variables
- `.env` - Environment variables (create from .env.example)

## Security Notes

- Never commit your `.env` file or expose your Stytch tokens
- The Public Token is safe for client-side use
- For production, implement proper backend token validation
- Use HTTPS in production environments

## Troubleshooting

### "Stytch configuration missing" error
- Ensure your `.env` file exists and contains your `STYTCH_PUBLIC_TOKEN`
- Restart the server after adding the token

### OAuth redirect not working
- Verify `http://localhost:3000` is added to redirect URLs in Stytch Dashboard
- Ensure you're accessing the app via `http://localhost:3000` (not `127.0.0.1`)

### Session not persisting
- Check browser console for errors
- Ensure cookies are enabled
- Try clearing browser cache and cookies for localhost