// Simple Authentication System (Mock Implementation)
// This provides a working authentication flow without external dependencies

// DOM Elements
const signinForm = document.getElementById('signin-form');
const signupForm = document.getElementById('signup-form');
const showSignupBtn = document.getElementById('show-signup');
const showSigninBtn = document.getElementById('show-signin');
const loadingOverlay = document.getElementById('loading-overlay');
const successModal = document.getElementById('success-modal');
const errorModal = document.getElementById('error-modal');
const errorMessage = document.getElementById('error-message');

// Mock user storage (in production, this would be handled by Clerk)
const STORAGE_KEY = 'flashaudit_user';

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    try {
        // Check if user is already signed in
        const existingUser = localStorage.getItem(STORAGE_KEY);
        if (existingUser) {
            redirectToApp();
            return;
        }

        // Set up event listeners
        setupEventListeners();

        console.log('Authentication system initialized successfully');
    } catch (error) {
        console.error('Failed to initialize authentication system:', error);
        showError('Failed to initialize authentication system. Please refresh the page.');
    }
});

// Set up event listeners
function setupEventListeners() {
    // Form switching
    showSignupBtn?.addEventListener('click', (e) => {
        e.preventDefault();
        switchToSignup();
    });

    showSigninBtn?.addEventListener('click', (e) => {
        e.preventDefault();
        switchToSignin();
    });

    // Social authentication buttons
    document.getElementById('google-signin')?.addEventListener('click', () => handleSocialAuth('oauth_google', 'signin'));
    document.getElementById('github-signin')?.addEventListener('click', () => handleSocialAuth('oauth_github', 'signin'));
    document.getElementById('google-signup')?.addEventListener('click', () => handleSocialAuth('oauth_google', 'signup'));
    document.getElementById('github-signup')?.addEventListener('click', () => handleSocialAuth('oauth_github', 'signup'));

    // Email form submissions
    document.getElementById('email-signin-form')?.addEventListener('submit', handleEmailSignin);
    document.getElementById('email-signup-form')?.addEventListener('submit', handleEmailSignup);

    // Close modals on click outside
    successModal?.addEventListener('click', (e) => {
        if (e.target === successModal) {
            closeSuccessModal();
        }
    });

    errorModal?.addEventListener('click', (e) => {
        if (e.target === errorModal) {
            closeErrorModal();
        }
    });
}

// Switch between forms
function switchToSignup() {
    signinForm?.classList.remove('active');
    signupForm?.classList.add('active');
}

function switchToSignin() {
    signupForm?.classList.remove('active');
    signinForm?.classList.add('active');
}

// Handle social authentication (Mock implementation)
async function handleSocialAuth(strategy, mode) {
    console.log(`Starting ${strategy} authentication in ${mode} mode`);

    try {
        showLoading();

        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Mock successful authentication
        const mockUser = {
            id: 'user_' + Date.now(),
            email: strategy === 'oauth_google' ? 'user@gmail.com' : 'user@github.com',
            firstName: 'Demo',
            lastName: 'User',
            provider: strategy,
            createdAt: new Date().toISOString()
        };

        console.log('Created mock user:', mockUser);

        // Store user data
        localStorage.setItem(STORAGE_KEY, JSON.stringify(mockUser));
        console.log('User data stored in localStorage');

        showSuccess();
        console.log('Success modal shown, redirecting in 2 seconds...');
        setTimeout(() => redirectToApp(), 2000);
    } catch (error) {
        hideLoading();
        console.error('Social auth error:', error);
        showError('Authentication failed. Please try again.');
    }
}

// Handle email sign in (Mock implementation)
async function handleEmailSignin(e) {
    e.preventDefault();

    const formData = new FormData(e.target);
    const email = formData.get('email');
    const password = formData.get('password');

    if (!email || !password) {
        showError('Please fill in all fields.');
        return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showError('Please enter a valid email address.');
        return;
    }

    try {
        showLoading();

        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Mock successful authentication (in production, validate against real backend)
        const mockUser = {
            id: 'user_' + Date.now(),
            email: email,
            firstName: email.split('@')[0],
            lastName: 'User',
            provider: 'email',
            createdAt: new Date().toISOString()
        };

        // Store user data
        localStorage.setItem(STORAGE_KEY, JSON.stringify(mockUser));

        showSuccess();
        setTimeout(() => redirectToApp(), 2000);
    } catch (error) {
        hideLoading();
        console.error('Email signin error:', error);
        showError('Sign in failed. Please check your credentials and try again.');
    }
}

// Handle email sign up (Mock implementation)
async function handleEmailSignup(e) {
    e.preventDefault();

    const formData = new FormData(e.target);
    const firstName = formData.get('firstName');
    const lastName = formData.get('lastName');
    const email = formData.get('email');
    const password = formData.get('password');
    const agreeTerms = document.getElementById('agree-terms').checked;

    if (!firstName || !lastName || !email || !password) {
        showError('Please fill in all fields.');
        return;
    }

    if (!agreeTerms) {
        showError('Please agree to the Terms of Service and Privacy Policy.');
        return;
    }

    if (password.length < 8) {
        showError('Password must be at least 8 characters long.');
        return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showError('Please enter a valid email address.');
        return;
    }

    try {
        showLoading();

        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Mock successful registration
        const mockUser = {
            id: 'user_' + Date.now(),
            email: email,
            firstName: firstName,
            lastName: lastName,
            provider: 'email',
            createdAt: new Date().toISOString()
        };

        // Store user data
        localStorage.setItem(STORAGE_KEY, JSON.stringify(mockUser));

        showSuccess();
        setTimeout(() => redirectToApp(), 2000);
    } catch (error) {
        hideLoading();
        console.error('Email signup error:', error);
        showError('Sign up failed. Please try again.');
    }
}

// Utility functions
function showLoading() {
    loadingOverlay.style.display = 'flex';
}

function hideLoading() {
    loadingOverlay.style.display = 'none';
}

function showSuccess() {
    hideLoading();
    successModal.style.display = 'flex';
}

function closeSuccessModal() {
    successModal.style.display = 'none';
}

function showError(message) {
    hideLoading();
    errorMessage.textContent = message;
    errorModal.style.display = 'flex';
}

function closeErrorModal() {
    errorModal.style.display = 'none';
}

// Redirect to main application
function redirectToApp() {
    console.log('Redirecting to React app...');

    // Since we're running on the same server, just redirect to the root
    // The React app should be available at the same origin
    try {
        window.location.href = '/';
    } catch (error) {
        console.error('Redirect failed:', error);
        // Fallback: try the full URL
        window.location.href = 'http://localhost:5173/';
    }
}

// Handle browser back button
window.addEventListener('popstate', () => {
    // Prevent going back to auth page if user is signed in
    const existingUser = localStorage.getItem(STORAGE_KEY);
    if (existingUser) {
        redirectToApp();
    }
});

// Export functions for global access
window.closeErrorModal = closeErrorModal;
window.closeSuccessModal = closeSuccessModal;

// Debug function to check authentication status
window.checkAuthStatus = function() {
    const user = localStorage.getItem(STORAGE_KEY);
    console.log('Current user:', user ? JSON.parse(user) : 'Not signed in');
    return user;
};

// Debug function to clear authentication
window.clearAuth = function() {
    localStorage.removeItem(STORAGE_KEY);
    console.log('Authentication cleared');
    window.location.reload();
};
