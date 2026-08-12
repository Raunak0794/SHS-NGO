require('dotenv').config();

const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { Strategy: GoogleStrategy } = require('passport-google-oauth20');
const userModel = require('./models/user.model');
const { getAuthCookieOptions } = require('./utils/cookies');

const authRoutes = require('./routes/auth.route');
const dashboardRoutes = require("./routes/dashboard");
const aiRoutes = require("./routes/ai.route");
const microgoalsRoutes = require("./routes/microgoals.route");
const calendarRoutes = require("./routes/calendar.route");
const studyRoutes = require("./routes/study.route");

const app = express();
app.set('trust proxy', 1);

// ================= CORS CONFIGURATION =================
const allowedOrigins = [
  'http://localhost:5173',
  process.env.FRONTEND_URL,
  ...(process.env.FRONTEND_URLS || '').split(',').map(origin => origin.trim())
].filter(Boolean);

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);

    const isAllowed = allowedOrigins.some((allowed) =>
      allowed instanceof RegExp ? allowed.test(origin) : allowed === origin
    );

    const isLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);

    if (isAllowed || isLocalhost) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));
app.options(/(.*)/, cors(corsOptions));

app.use(express.json({ limit: "200mb" }));
app.use(express.urlencoded({ extended: true, limit: "200mb" }));
app.use(cookieParser());
app.use(passport.initialize());


// Test route
app.get('/', (req, res) => {
  res.status(200).json({ message: "Auth service is running" });
});

app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
  });
});

// ================= GOOGLE OAUTH =================
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: `${process.env.BACKEND_URL || 'http://localhost:3000'}/auth/google/callback`,
}, async (accessToken, refreshToken, profile, done) => {
  try {
    let user = await userModel.findOne({ email: profile.emails[0].value });
    if (!user) {
      const email = profile.emails[0].value;
      const baseUsername = email.split('@')[0].replace(/[^a-z0-9_]/gi, '').toLowerCase() || 'googleuser';
      const existingUsername = await userModel.findOne({ username: baseUsername });
      user = await userModel.create({
        username: existingUsername ? `${baseUsername}${Date.now()}` : baseUsername,
        email,
        fullName: {
          firstName: profile.name?.givenName || profile.displayName || 'Google',
          lastName: profile.name?.familyName || 'User',
        },
      });
    }
    return done(null, user);
  } catch (err) {
    return done(err, null);
  }
}));

app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

app.get('/auth/google/callback',
  passport.authenticate('google', { session: false }),
  (req, res) => {
    const user = req.user;
    const token = jwt.sign(
      { id: user._id, username: user.username, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );
    res.cookie('token', token, getAuthCookieOptions());
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth/google/success`);
  }
);

// ================= ROUTES =================
app.use('/api', (req, res, next) => {
  if (req.path === '/health') return next();

  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      error: 'Database unavailable',
      message: 'MongoDB is not connected. Check MONGO_URI in backend/.env and restart the backend.',
    });
  }

  next();
});

app.use("/api/auth", authRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/microgoals", microgoalsRoutes);
app.use("/api/calendar", calendarRoutes);
app.use("/api/study", studyRoutes);

module.exports = app;

