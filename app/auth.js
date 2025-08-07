// Stytch OAuth Authentication Logic

let stytchClient;

// Initialize Stytch client
async function initializeStytch() {
    if (!STYTCH_CONFIG.PUBLIC_TOKEN) {
        console.error('Stytch Public Token is missing');
        showError('Stytch configuration missing. Please set your Stytch Public Token.');
        showUnauthenticated();
        return null;
    }
    
    try {
        console.log('Initializing StytchB2BUIClient with token:', STYTCH_CONFIG.PUBLIC_TOKEN.substring(0, 20) + '...');
        
        // Use the StytchB2BUIClient as documented
        if (window.StytchB2BUIClient && typeof window.StytchB2BUIClient === 'function') {
            console.log('Creating new StytchB2BUIClient instance');
            stytchClient = new window.StytchB2BUIClient(STYTCH_CONFIG.PUBLIC_TOKEN);
            console.log('StytchB2BUIClient initialized successfully');
            return stytchClient;
        } else {
            console.error('StytchB2BUIClient not found');
            throw new Error('StytchB2BUIClient not found - check script loading');
        }
        
    } catch (error) {
        console.error('Failed to initialize Stytch:', error);
        showError('Failed to initialize authentication service. Check console for details.');
        return null;
    }
}

// Check if user is authenticated
async function checkAuthentication() {
    showLoading();
    
    // Initialize Stytch client
    const client = await initializeStytch();
    if (!client) {
        hideLoading();
        return;
    }
    
    try {
        // Check for tokens in URL
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');
        const stytchTokenType = urlParams.get('stytch_token_type');
        
        console.log('URL params:', { 
            token: token ? 'present' : 'absent', 
            stytchTokenType
        });
        
        // Handle B2B Password Reset callback
        if (token && stytchTokenType === 'multi_tenant_passwords') {
            console.log('B2B Password Reset token detected');
            
            // Store the token for password reset
            window.passwordResetToken = token;
            
            // Clear URL parameters
            window.history.replaceState({}, document.title, window.location.pathname);
            
            // Show the new password form
            showNewPasswordForm();
            hideLoading();
            return;
        }
        
        // Handle B2B Magic Link callback
        if (token && stytchTokenType === 'multi_tenant_magic_links') {
            console.log('B2B Magic Link token detected, authenticating...');
            
            try {
                let authResponse;
                
                // For B2B Magic Links
                if (client.magicLinks && client.magicLinks.authenticate) {
                    console.log('Using magicLinks.authenticate');
                    authResponse = await client.magicLinks.authenticate({
                        magic_links_token: token,
                        session_duration_minutes: STYTCH_CONFIG.SESSION_DURATION
                    });
                }
                
                console.log('Magic Link auth response:', authResponse);
                
                if (authResponse && (authResponse.member_id || authResponse.member)) {
                    // Clear URL parameters
                    window.history.replaceState({}, document.title, window.location.pathname);
                    showAuthenticated(authResponse);
                    hideLoading();
                    return;
                }
            } catch (authError) {
                console.error('Magic Link authentication failed:', authError);
                if (authError.error_type === 'email_jit_provisioning_not_allowed') {
                    showError('This email is not registered with the organization. Please contact your administrator to get invited.');
                } else if (authError.error_type === 'member_not_found') {
                    showError('You are not a member of this organization. Please contact your administrator for access.');
                } else {
                    showError('Failed to authenticate. Please try logging in again.');
                }
            }
        }
        
        // Handle B2B OAuth callback
        if (token && stytchTokenType === 'oauth') {
            console.log('B2B OAuth token detected, authenticating...');
            
            try {
                let authResponse;
                
                // For regular B2B OAuth
                if (client.oauth && client.oauth.authenticate) {
                    console.log('Using oauth.authenticate');
                    authResponse = await client.oauth.authenticate({
                        oauth_token: token,
                        session_duration_minutes: STYTCH_CONFIG.SESSION_DURATION
                    });
                }
                
                console.log('OAuth auth response:', authResponse);
                
                if (authResponse && (authResponse.member_id || authResponse.member)) {
                    // Clear URL parameters
                    window.history.replaceState({}, document.title, window.location.pathname);
                    showAuthenticated(authResponse);
                    hideLoading();
                    return;
                }
            } catch (authError) {
                console.error('OAuth authentication failed:', authError);
                if (authError.error_type === 'email_jit_provisioning_not_allowed') {
                    showError('This email is not registered with the organization. Please contact your administrator to get invited.');
                } else if (authError.error_type === 'member_not_found') {
                    showError('You are not a member of this organization. Please contact your administrator for access.');
                } else {
                    showError('Failed to authenticate. Please try logging in again.');
                }
            }
        }
        
        // Check for existing B2B session
        try {
            // B2B sessions are different - they include member and organization context
            let sessionData = null;
            
            // Try B2B-specific session methods
            if (client.session && client.session.getSync) {
                try {
                    const session = client.session.getSync();
                    console.log('B2B session found:', session);
                    
                    if (session && session.member_id) {
                        // B2B session with member
                        sessionData = {
                            member: session.member || { member_id: session.member_id },
                            organization: session.organization || { organization_id: session.organization_id },
                            session: session
                        };
                    }
                } catch (e) {
                    console.log('Session.getSync failed:', e.message);
                }
            }
            
            if (sessionData) {
                // User/Member has valid session
                showAuthenticated(sessionData);
            } else {
                // No valid session
                console.log('No valid B2B session found');
                showUnauthenticated();
            }
        } catch (sessionError) {
            console.error('Session check error:', sessionError);
            showUnauthenticated();
        }
    } catch (error) {
        console.error('Authentication check failed:', error);
        showUnauthenticated();
    }
    
    hideLoading();
}

// Handle Google OAuth login
async function handleLogin() {
    if (!stytchClient) {
        console.error('Stytch client not initialized');
        showError('Authentication service not initialized. Please refresh the page.');
        return;
    }
    
    try {
        console.log('Starting B2B Google OAuth flow...');
        
        // Check what's available on the oauth object
        if (stytchClient.oauth && stytchClient.oauth.google && stytchClient.oauth.google.start) {
            console.log('Using Google OAuth with organization context...');
            
            const oauthConfig = {
                login_redirect_url: STYTCH_CONFIG.REDIRECT_URL,
                signup_redirect_url: STYTCH_CONFIG.REDIRECT_URL,
                custom_scopes: ['openid', 'email', 'profile'],
                // Pass organization context directly
                organization_id: STYTCH_CONFIG.ORGANIZATION_ID
            };
            
            console.log('OAuth config:', oauthConfig);
            console.log('Organization ID:', STYTCH_CONFIG.ORGANIZATION_ID);
            
            stytchClient.oauth.google.start(oauthConfig);
            console.log('OAuth flow started - redirecting to Google...');
        } else {
            console.error('Google OAuth start method not found');
            showError('Google OAuth method not available. Please check your Stytch dashboard settings.');
        }
    } catch (error) {
        console.error('OAuth start failed:', error);
        
        if (error.error_type === 'organization_not_found') {
            showError('Organization not found. Please check your configuration.');
        } else if (error.message && error.message.includes('CORS')) {
            showError('CORS error: Make sure http://localhost:3000 is added to your Stytch OAuth redirect URLs.');
        } else if (error.message) {
            showError(`Error: ${error.message}`);
        } else {
            showError('Failed to start OAuth flow. Check console for details.');
        }
    }
}

// Handle Password Login
async function handlePasswordLogin() {
    const emailInput = document.getElementById('password-email-input');
    const passwordInput = document.getElementById('password-input');
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    
    if (!email || !password) {
        showError('Please enter both email and password.');
        return;
    }
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showError('Please enter a valid email address.');
        return;
    }
    
    if (!stytchClient) {
        console.error('Stytch client not initialized');
        showError('Authentication service not initialized. Please refresh the page.');
        return;
    }
    
    try {
        console.log('Authenticating with password for:', email);
        
        // Check if passwords is available
        if (stytchClient.passwords && stytchClient.passwords.authenticate) {
            console.log('Using passwords.authenticate');
            
            const passwordConfig = {
                email_address: email,
                password: password,
                organization_id: STYTCH_CONFIG.ORGANIZATION_ID,
                session_duration_minutes: STYTCH_CONFIG.SESSION_DURATION
            };
            
            console.log('Password auth config:', { ...passwordConfig, password: '***' });
            
            // Authenticate with password
            const response = await stytchClient.passwords.authenticate(passwordConfig);
            
            console.log('Password auth successful:', response);
            
            if (response && (response.member_id || response.member)) {
                // Clear form
                emailInput.value = '';
                passwordInput.value = '';
                
                // Show authenticated state
                showAuthenticated(response);
            }
            
        } else {
            console.error('Passwords not available on client');
            showError('Password authentication is not configured. Please contact your administrator.');
        }
    } catch (error) {
        console.error('Password authentication failed:', error);
        
        if (error.error_type === 'invalid_credentials') {
            showError('Invalid email or password. Please try again.');
        } else if (error.error_type === 'email_jit_provisioning_not_allowed') {
            showError('This email is not registered with the organization. Please contact your administrator to get invited.');
        } else if (error.error_type === 'organization_not_found') {
            showError('Organization not found. Please check your configuration.');
        } else if (error.message) {
            showError(`Error: ${error.message}`);
        } else {
            showError('Failed to authenticate. Please try again.');
        }
    }
}

// Handle Password Reset Request
async function handlePasswordReset() {
    const emailInput = document.getElementById('reset-email-input');
    const email = emailInput.value.trim();
    
    if (!email) {
        showError('Please enter your email address.');
        return;
    }
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showError('Please enter a valid email address.');
        return;
    }
    
    if (!stytchClient) {
        console.error('Stytch client not initialized');
        showError('Authentication service not initialized. Please refresh the page.');
        return;
    }
    
    try {
        console.log('Sending password reset email to:', email);
        
        // Check if passwords is available
        if (stytchClient.passwords && stytchClient.passwords.resetByEmailStart) {
            console.log('Using passwords.resetByEmailStart');
            
            const resetConfig = {
                email_address: email,
                organization_id: STYTCH_CONFIG.ORGANIZATION_ID,
                login_redirect_url: STYTCH_CONFIG.REDIRECT_URL,
                reset_password_redirect_url: STYTCH_CONFIG.REDIRECT_URL,
                reset_password_expiration_minutes: 60
            };
            
            console.log('Password reset config:', resetConfig);
            
            // Send password reset email
            const response = await stytchClient.passwords.resetByEmailStart(resetConfig);
            
            console.log('Password reset email sent:', response);
            
            // Show success message
            document.getElementById('password-reset-success').classList.remove('hidden');
            document.getElementById('password-reset-form').classList.add('hidden');
            document.getElementById('error').classList.add('hidden');
            
            // Clear the email input
            emailInput.value = '';
            
            // Hide success message and go back to login after 5 seconds
            setTimeout(() => {
                document.getElementById('password-reset-success').classList.add('hidden');
                showPasswordLogin();
            }, 5000);
            
        } else {
            console.error('Password reset not available on client');
            showError('Password reset is not configured. Please contact your administrator.');
        }
    } catch (error) {
        console.error('Password reset failed:', error);
        
        if (error.error_type === 'member_not_found') {
            showError('This email is not registered with the organization.');
        } else if (error.message) {
            showError(`Error: ${error.message}`);
        } else {
            showError('Failed to send password reset email. Please try again.');
        }
    }
}

// Handle Setting New Password (after reset)
async function handleSetNewPassword() {
    const newPasswordInput = document.getElementById('new-password-input');
    const confirmPasswordInput = document.getElementById('confirm-password-input');
    const newPassword = newPasswordInput.value;
    const confirmPassword = confirmPasswordInput.value;
    
    if (!newPassword || !confirmPassword) {
        showError('Please enter and confirm your new password.');
        return;
    }
    
    if (newPassword !== confirmPassword) {
        showError('Passwords do not match. Please try again.');
        return;
    }
    
    if (newPassword.length < 8) {
        showError('Password must be at least 8 characters long.');
        return;
    }
    
    if (!window.passwordResetToken) {
        showError('Password reset token not found. Please request a new reset email.');
        return;
    }
    
    if (!stytchClient) {
        console.error('Stytch client not initialized');
        showError('Authentication service not initialized. Please refresh the page.');
        return;
    }
    
    try {
        console.log('Setting new password...');
        
        // Check if passwords is available
        if (stytchClient.passwords && stytchClient.passwords.resetByEmail) {
            console.log('Using passwords.resetByEmail');
            
            const resetConfig = {
                password_reset_token: window.passwordResetToken,
                password: newPassword,
                session_duration_minutes: STYTCH_CONFIG.SESSION_DURATION
            };
            
            console.log('Password reset config:', { ...resetConfig, password: '***', password_reset_token: '***' });
            
            // Reset password
            const response = await stytchClient.passwords.resetByEmail(resetConfig);
            
            console.log('Password reset successful:', response);
            
            // Clear the token
            delete window.passwordResetToken;
            
            // Clear form
            newPasswordInput.value = '';
            confirmPasswordInput.value = '';
            
            if (response && (response.member_id || response.member)) {
                // Show authenticated state
                showAuthenticated(response);
            }
            
        } else {
            console.error('Password reset not available on client');
            showError('Password reset is not configured. Please contact your administrator.');
        }
    } catch (error) {
        console.error('Password reset failed:', error);
        
        if (error.error_type === 'reset_password_token_not_found') {
            showError('Invalid or expired reset token. Please request a new password reset.');
        } else if (error.error_type === 'password_too_weak') {
            showError('Password is too weak. Please choose a stronger password.');
        } else if (error.message) {
            showError(`Error: ${error.message}`);
        } else {
            showError('Failed to reset password. Please try again.');
        }
    }
}

// Handle Email Magic Link
async function handleMagicLink() {
    const emailInput = document.getElementById('email-input');
    const email = emailInput.value.trim();
    
    if (!email) {
        showError('Please enter your email address.');
        return;
    }
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showError('Please enter a valid email address.');
        return;
    }
    
    if (!stytchClient) {
        console.error('Stytch client not initialized');
        showError('Authentication service not initialized. Please refresh the page.');
        return;
    }
    
    try {
        console.log('Sending B2B Magic Link to:', email);
        
        // Check if magicLinks is available
        if (stytchClient.magicLinks && stytchClient.magicLinks.email && stytchClient.magicLinks.email.loginOrSignup) {
            console.log('Using magicLinks.email.loginOrSignup');
            
            const magicLinkConfig = {
                email_address: email,
                organization_id: STYTCH_CONFIG.ORGANIZATION_ID,
                login_redirect_url: STYTCH_CONFIG.REDIRECT_URL,
                signup_redirect_url: STYTCH_CONFIG.REDIRECT_URL
            };
            
            console.log('Magic Link config:', magicLinkConfig);
            
            // Send the magic link
            const response = await stytchClient.magicLinks.email.loginOrSignup(magicLinkConfig);
            
            console.log('Magic Link sent successfully:', response);
            
            // Show success message
            document.getElementById('magic-link-success').classList.remove('hidden');
            document.getElementById('error').classList.add('hidden');
            
            // Clear the email input
            emailInput.value = '';
            
            // Hide success message after 10 seconds
            setTimeout(() => {
                document.getElementById('magic-link-success').classList.add('hidden');
            }, 10000);
            
        } else {
            console.error('Magic Links not available on client');
            showError('Magic Links are not configured. Please contact your administrator.');
        }
    } catch (error) {
        console.error('Magic Link send failed:', error);
        
        if (error.error_type === 'email_jit_provisioning_not_allowed') {
            showError('This email is not registered with the organization. Please contact your administrator to get invited.');
        } else if (error.error_type === 'organization_not_found') {
            showError('Organization not found. Please check your configuration.');
        } else if (error.message) {
            showError(`Error: ${error.message}`);
        } else {
            showError('Failed to send magic link. Please try again.');
        }
    }
}

// Handle logout
async function handleLogout() {
    if (!stytchClient) {
        window.location.reload();
        return;
    }
    
    try {
        console.log('Logging out...');
        stytchClient.session.revoke();
        showUnauthenticated();
        clearUserInfo();
        console.log('Logout successful');
    } catch (error) {
        console.error('Logout failed:', error);
        showError('Failed to logout. Please try again.');
    }
}

// UI Helper Functions
function showLoading() {
    document.getElementById('loading').classList.remove('hidden');
    document.getElementById('authenticated').classList.add('hidden');
    document.getElementById('unauthenticated').classList.add('hidden');
    document.getElementById('error').classList.add('hidden');
}

function hideLoading() {
    document.getElementById('loading').classList.add('hidden');
}

function showPasswordResetForm() {
    // Hide password login form
    document.getElementById('password-email-input').parentElement.classList.add('hidden');
    // Show password reset form
    document.getElementById('password-reset-form').classList.remove('hidden');
    // Hide any success messages
    document.getElementById('password-reset-success').classList.add('hidden');
    // Hide error messages
    document.getElementById('error').classList.add('hidden');
}

function showPasswordLogin() {
    // Show password login form
    document.getElementById('password-email-input').parentElement.classList.remove('hidden');
    // Hide password reset form
    document.getElementById('password-reset-form').classList.add('hidden');
    // Hide new password form
    document.getElementById('new-password-form').classList.add('hidden');
    // Hide any success messages
    document.getElementById('password-reset-success').classList.add('hidden');
}

function showNewPasswordForm() {
    // Hide all other forms
    document.getElementById('unauthenticated').classList.remove('hidden');
    document.getElementById('password-email-input').parentElement.classList.add('hidden');
    document.getElementById('password-reset-form').classList.add('hidden');
    // Hide OAuth and magic link sections
    document.getElementById('login-btn').classList.add('hidden');
    document.getElementById('email-input').parentElement.classList.add('hidden');
    document.querySelectorAll('.divider').forEach(el => el.classList.add('hidden'));
    // Show new password form
    document.getElementById('new-password-form').classList.remove('hidden');
}

function showAuthenticated(authData) {
    document.getElementById('authenticated').classList.remove('hidden');
    document.getElementById('unauthenticated').classList.add('hidden');
    document.getElementById('error').classList.add('hidden');
    
    console.log('Showing authenticated state with data:', authData);
    
    // Display user/member information if available
    if (authData) {
        const userInfo = document.getElementById('user-info');
        let userHTML = '';
        
        // Handle B2B member data structure
        if (authData.member) {
            const member = authData.member;
            
            // B2B member information
            const email = member.email_address || member.email ||
                         (member.oauth_registrations && member.oauth_registrations[0] && member.oauth_registrations[0].profile_data && member.oauth_registrations[0].profile_data.email);
            
            const name = member.name ||
                        (member.oauth_registrations && member.oauth_registrations[0] && member.oauth_registrations[0].profile_data && member.oauth_registrations[0].profile_data.name) ||
                        member.untrusted_metadata?.name ||
                        `${member.first_name || ''} ${member.last_name || ''}`.trim();
            
            const memberId = member.member_id || member.id;
            
            // Organization information for B2B
            const org = authData.organization || member.organization;
            const orgName = org?.organization_name || org?.name;
            const orgSlug = org?.organization_slug || org?.slug;
            
            if (email) {
                userHTML += `<p><strong>Email:</strong> ${email}</p>`;
            }
            if (name && name !== ' ') {
                userHTML += `<p><strong>Name:</strong> ${name}</p>`;
            }
            if (orgName) {
                userHTML += `<p><strong>Organization:</strong> ${orgName}</p>`;
            }
            if (orgSlug) {
                userHTML += `<p><strong>Org Slug:</strong> ${orgSlug}</p>`;
            }
            if (memberId) {
                userHTML += `<p><strong>Member ID:</strong> ${memberId.substring(0, 8)}...</p>`;
            }
        }
        // Handle direct auth response
        else {
            const entity = authData;
            
            // Try to extract email from various possible locations
            const email = entity.email || entity.email_address ||
                         (entity.emails && entity.emails[0] && entity.emails[0].email);
            
            const name = entity.name || `${entity.first_name || ''} ${entity.last_name || ''}`.trim();
            const id = entity.member_id || entity.user_id || entity.id;
            
            if (email) {
                userHTML += `<p><strong>Email:</strong> ${email}</p>`;
            }
            if (name && name !== ' ') {
                userHTML += `<p><strong>Name:</strong> ${name}</p>`;
            }
            if (id) {
                userHTML += `<p><strong>ID:</strong> ${id.substring(0, 8)}...</p>`;
            }
        }
        
        userInfo.innerHTML = userHTML || '<p>Authenticated successfully</p>';
    }
}

function showUnauthenticated() {
    document.getElementById('unauthenticated').classList.remove('hidden');
    document.getElementById('authenticated').classList.add('hidden');
    document.getElementById('error').classList.add('hidden');
}

function showError(message) {
    const errorElement = document.getElementById('error');
    const errorText = document.getElementById('error-text');
    errorText.textContent = message;
    errorElement.classList.remove('hidden');
}

function clearUserInfo() {
    document.getElementById('user-info').innerHTML = '';
}

// Wait for SDK to load
function waitForStytchSDK(callback, attempts = 0) {
    // Check for StytchB2BUIClient
    if (window.StytchB2BUIClient) {
        console.log('Stytch B2B SDK loaded successfully');
        callback();
    } else if (attempts < 100) { // Try for 10 seconds (100 * 100ms)
        if (attempts % 10 === 0) { // Log every second
            console.log(`Waiting for Stytch B2B SDK... (${attempts / 10} seconds)`);
        }
        setTimeout(() => waitForStytchSDK(callback, attempts + 1), 100);
    } else {
        console.error('Failed to load Stytch B2B SDK after 10 seconds');
        showError('Failed to load Stytch B2B SDK. Please check your internet connection and refresh.');
        showUnauthenticated();
    }
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, waiting for Stytch SDK...');
    
    // Wait for Stytch SDK to load before initializing
    waitForStytchSDK(() => {
        // Check authentication on page load
        checkAuthentication();
        
        // Setup OAuth login button
        const loginBtn = document.getElementById('login-btn');
        if (loginBtn) {
            loginBtn.addEventListener('click', handleLogin);
        }
        
        // Setup magic link button
        const magicLinkBtn = document.getElementById('magic-link-btn');
        if (magicLinkBtn) {
            magicLinkBtn.addEventListener('click', handleMagicLink);
        }
        
        // Setup email input to send on Enter key
        const emailInput = document.getElementById('email-input');
        if (emailInput) {
            emailInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    handleMagicLink();
                }
            });
        }
        
        // Setup password login button
        const passwordLoginBtn = document.getElementById('password-login-btn');
        if (passwordLoginBtn) {
            passwordLoginBtn.addEventListener('click', handlePasswordLogin);
        }
        
        // Setup password input fields to submit on Enter key
        const passwordEmailInput = document.getElementById('password-email-input');
        const passwordInput = document.getElementById('password-input');
        if (passwordEmailInput) {
            passwordEmailInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    if (passwordInput && passwordInput.value) {
                        handlePasswordLogin();
                    } else if (passwordInput) {
                        passwordInput.focus();
                    }
                }
            });
        }
        if (passwordInput) {
            passwordInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    handlePasswordLogin();
                }
            });
        }
        
        // Setup forgot password link
        const forgotPasswordLink = document.getElementById('forgot-password-link');
        if (forgotPasswordLink) {
            forgotPasswordLink.addEventListener('click', (e) => {
                e.preventDefault();
                showPasswordResetForm();
            });
        }
        
        // Setup password reset button
        const sendResetBtn = document.getElementById('send-reset-btn');
        if (sendResetBtn) {
            sendResetBtn.addEventListener('click', handlePasswordReset);
        }
        
        // Setup reset email input to submit on Enter
        const resetEmailInput = document.getElementById('reset-email-input');
        if (resetEmailInput) {
            resetEmailInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    handlePasswordReset();
                }
            });
        }
        
        // Setup back to login link
        const backToLoginLink = document.getElementById('back-to-login');
        if (backToLoginLink) {
            backToLoginLink.addEventListener('click', (e) => {
                e.preventDefault();
                showPasswordLogin();
            });
        }
        
        // Setup set new password button
        const setPasswordBtn = document.getElementById('set-password-btn');
        if (setPasswordBtn) {
            setPasswordBtn.addEventListener('click', handleSetNewPassword);
        }
        
        // Setup new password inputs to submit on Enter
        const newPasswordInput = document.getElementById('new-password-input');
        const confirmPasswordInput = document.getElementById('confirm-password-input');
        if (newPasswordInput) {
            newPasswordInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    if (confirmPasswordInput && !confirmPasswordInput.value) {
                        confirmPasswordInput.focus();
                    } else {
                        handleSetNewPassword();
                    }
                }
            });
        }
        if (confirmPasswordInput) {
            confirmPasswordInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    handleSetNewPassword();
                }
            });
        }
        
        // Setup logout button  
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', handleLogout);
        }
    });
});