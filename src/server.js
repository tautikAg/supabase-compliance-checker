const express = require('express');
const cookieSession = require('cookie-session');
const path = require('path');
require('dotenv').config();

const app = express();

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(cookieSession({
  name: 'session',
  keys: [process.env.SESSION_SECRET || 'test'],
  maxAge: 24 * 60 * 60 * 1000, // 24 hours
  secure: false, // Set to true in production
  httpOnly: true,
  sameSite: 'lax'
}));

// Add request logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    if (req.session) {
        console.log('Session exists:', !!req.session.accessToken);
    }
    next();
});

// Add a root route handler for debugging
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Routes
app.use('/auth', require('./routes/auth'));
app.use('/compliance', require('./routes/compliance'));

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Static files being served from: ${path.join(__dirname, 'public')}`);
}); 