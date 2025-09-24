require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const passport = require('passport');
const session = require('express-session');
const axios = require('axios');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const GitHubStrategy = require('passport-github2').Strategy;
const MongoStore = require('connect-mongo');

const app = express();
// Trust reverse proxy (Render/Heroku) so secure cookies work behind proxy
app.set('trust proxy', 1);

// Base URL helpers for OAuth callbacks on Render/production
const BASE_URL = process.env.BASE_URL || process.env.RENDER_EXTERNAL_URL || `http://localhost:${process.env.PORT || 3000}`;
const GOOGLE_CALLBACK = process.env.GOOGLE_CALLBACK_URL || `${BASE_URL}/auth/google/callback`;
const GITHUB_CALLBACK = process.env.GITHUB_CALLBACK_URL || `${BASE_URL}/auth/github/callback`;

// Function to create session configuration
const createSessionConfig = () => {
    const baseConfig = {
        secret: process.env.JWT_SECRET,
        resave: false,
        saveUninitialized: false,
        cookie: {
            secure: process.env.NODE_ENV === 'production',
            httpOnly: true,
            maxAge: 24 * 60 * 60 * 1000 // 1 day
        }
    };

    // Only try to use MongoDB store if we're connected
    if (mongoose.connection.readyState === 1) {
        try {
            return {
                ...baseConfig,
                store: MongoStore.create({
                    client: mongoose.connection.getClient(),
                    ttl: 24 * 60 * 60,
                    autoRemove: 'native',
                    crypto: {
                        secret: process.env.JWT_SECRET
                    }
                })
            };
        } catch (error) {
            console.log('Failed to create MongoDB session store:', error);
        }
    }

    console.log('Using memory store for sessions');
    return baseConfig;
};

// MongoDB connection
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI, {
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
            dbName: 'task-7'
        });
        console.log('Connected to MongoDB');
    } catch (err) {
        console.error('MongoDB connection error:', err);
        console.log('Server will continue running without MongoDB functionality');
    }
};

// Connect to MongoDB
connectDB();

// Serve static files from the public directory
app.use(express.static('public'));

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: [
                "'self'",
                "'unsafe-inline'",
                "'unsafe-eval'",
                "cdn.jsdelivr.net",
                "cdnjs.cloudflare.com",
                "apis.google.com",
                "www.gstatic.com",
                "*.googleapis.com"
            ],
            styleSrc: [
                "'self'",
                "'unsafe-inline'",
                "cdn.jsdelivr.net",
                "cdnjs.cloudflare.com",
                "fonts.googleapis.com"
            ],
            imgSrc: [
                "'self'",
                "openweathermap.org",
                "*.openweathermap.org",
                "data:",
                "https:",
                "*.googleapis.com",
                "*.gstatic.com"
            ],
            connectSrc: [
                "'self'",
                "api.openweathermap.org",
                "newsapi.org",
                "apis.google.com",
                "*.googleapis.com"
            ],
            fontSrc: [
                "'self'",
                "cdnjs.cloudflare.com",
                "fonts.gstatic.com"
            ],
            frameSrc: [
                "'self'",
                "accounts.google.com",
                "github.com"
            ],
            objectSrc: ["'none'"],
            mediaSrc: ["'none'"]
        }
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: false
}));
app.use(cors());
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Session configuration
const sessionConfig = createSessionConfig();
app.use(session(sessionConfig));

// Handle session store errors
if (sessionConfig.store) {
    sessionConfig.store.on('error', function(error) {
        console.error('Session store error:', error);
    });
}

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// User model
const User = mongoose.model('User', new mongoose.Schema({
    googleId: String,
    githubId: String,
    email: String,
    name: String,
    avatar: String
}));

// Passport serialization
passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (error) {
        done(error, null);
    }
});

// Google OAuth Strategy
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: GOOGLE_CALLBACK
}, async (accessToken, refreshToken, profile, done) => {
    try {
        let user = await User.findOne({ googleId: profile.id });
        if (!user) {
            user = await User.create({
                googleId: profile.id,
                email: profile.emails[0].value,
                name: profile.displayName,
                avatar: profile.photos[0].value
            });
        }
        return done(null, user);
    } catch (error) {
        return done(error, null);
    }
}));

// GitHub OAuth Strategy
passport.use(new GitHubStrategy({
    clientID: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    callbackURL: GITHUB_CALLBACK
}, async (accessToken, refreshToken, profile, done) => {
    try {
        let user = await User.findOne({ githubId: profile.id });
        if (!user) {
            user = await User.create({
                githubId: profile.id,
                email: profile.emails[0].value,
                name: profile.displayName,
                avatar: profile.photos[0].value
            });
        }
        return done(null, user);
    } catch (error) {
        return done(error, null);
    }
}));

// Auth middleware
const isAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) {
        return next();
    }
    res.status(401).json({ error: 'Not authenticated' });
};

// OAuth routes
app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

app.get('/auth/google/callback', 
    (req, res, next) => {
        passport.authenticate('google', (err, user, info) => {
            if (err) {
                console.error('Google auth error:', err);
                return res.redirect('/login?error=' + encodeURIComponent('Authentication failed'));
            }
            if (!user) {
                return res.redirect('/login?error=' + encodeURIComponent(info?.message || 'Authentication failed'));
            }
            req.logIn(user, (err) => {
                if (err) {
                    console.error('Login error:', err);
                    return res.redirect('/login?error=' + encodeURIComponent('Login failed'));
                }
                req.session.user = user;
                res.redirect('/');
            });
        })(req, res, next);
    }
);

app.get('/auth/github', passport.authenticate('github', { scope: ['user:email'] }));
app.get('/auth/github/callback', passport.authenticate('github', {
    failureRedirect: '/login'
}), (req, res) => {
    req.session.user = req.user;
    res.redirect('/');
});

// Auth status route
app.get('/auth/status', (req, res) => {
    res.json({ 
        authenticated: req.isAuthenticated(),
        user: req.user 
    });
});

// Logout route
app.post('/auth/logout', (req, res) => {
    req.logout((err) => {
        if (err) {
            console.error('Logout error:', err);
            res.status(500).send('Failed to logout');
        } else {
            req.session.destroy((err) => {
                if (err) {
                    console.error('Session destruction error:', err);
                    res.status(500).send('Failed to logout');
                } else {
                    res.status(200).send('Logged out successfully');
                }
            });
        }
    });
});

// External API routes
app.get('/api/weather/:city', isAuthenticated, async (req, res) => {
    try {
        const response = await axios.get(`https://api.openweathermap.org/data/2.5/weather`, {
            params: {
                q: req.params.city,
                appid: process.env.WEATHER_API_KEY,
                units: 'metric'
            }
        });
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch weather data' });
    }
});

app.get('/api/news/:category', isAuthenticated, async (req, res) => {
    try {
        const response = await axios.get(`https://newsapi.org/v2/top-headlines`, {
            params: {
                country: 'us',
                category: req.params.category,
                apiKey: process.env.NEWS_API_KEY
            }
        });
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch news data' });
    }
});

// Add a catch-all route to serve index.html for client-side routing
app.get('/', (req, res) => {
    res.sendFile('index.html', { root: 'public' });
});

// Health check for Render
app.get('/healthz', (req, res) => {
    res.status(200).json({ status: 'ok' });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    
    // Handle specific error types
    if (err.name === 'MongooseError' || err.name === 'MongoError') {
        return res.status(503).json({
            error: 'Database service unavailable',
            message: 'Please try again later'
        });
    }
    
    if (err.name === 'AuthenticationError') {
        return res.status(401).json({
            error: 'Authentication failed',
            message: err.message || 'Please try logging in again'
        });
    }
    
    // Default error response
    res.status(500).json({
        error: 'Something went wrong',
        message: process.env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred'
    });
});

// Add a catch-all route handler for undefined routes
app.use((req, res) => {
    res.status(404).json({
        error: 'Not Found',
        message: 'The requested resource was not found'
    });
});

// Start server
const PORT = process.env.PORT || 3000;
const startServer = (port) => {
    const server = app.listen(port, () => {
        console.log(`Server is running on port ${port}`);
        console.log(`OAuth callback URLs:`);
        console.log(`Base URL: ${BASE_URL}`);
        console.log(`Google: ${GOOGLE_CALLBACK}`);
        console.log(`GitHub: ${GITHUB_CALLBACK}`);
    }).on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.log(`Port ${port} is busy, trying ${port + 1}`);
            startServer(port + 1);
        } else {
            console.error('Server error:', err);
        }
    });
};

startServer(PORT); 