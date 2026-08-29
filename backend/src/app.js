require('dotenv').config();

const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const { randomUUID } = require('crypto');
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
const chatRoutes = require("./routes/chat.route");
const materialsRoutes = require("./routes/materials.route");
const practiceRoutes = require("./routes/practice.route");
const progressRoutes = require("./routes/progress.route");

const app = express();
app.set("trust proxy", 1);

function getFrontendOrigin() {
  return (process.env.FRONTEND_URL || "http://localhost:5173").trim().replace(/\/+$/, "");
}

function getBackendOrigin() {
  return (process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 5000}`).trim().replace(/\/+$/, "");
}

// ================= CORS CONFIGURATION =================
const allowedOrigins = [
  "http://localhost:5173",
  process.env.FRONTEND_URL,
  ...(process.env.FRONTEND_URLS || "").split(","),
]
  .filter(Boolean)
  .map((origin) => (typeof origin === "string" ? origin.trim().replace(/\/+$/, "") : origin));

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);

    const normalizedOrigin = String(origin).trim().replace(/\/+$/, "");
    const isAllowed = allowedOrigins.some((allowed) =>
      allowed instanceof RegExp ? allowed.test(normalizedOrigin) : allowed === normalizedOrigin
    );

    const isLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(normalizedOrigin);

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

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
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
  callbackURL: `${getBackendOrigin()}/auth/google/callback`,
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
      {
        id: user._id,
        username: user.username,
        email: user.email,
        tokenVersion: user.tokenVersion || 0,
      },
      process.env.JWT_SECRET || "dev-secret-change-me",
      { expiresIn: '1d', jwtid: randomUUID() }
    );
    res.cookie('token', token, getAuthCookieOptions());
    res.redirect(`${getFrontendOrigin()}/auth/google/success`);
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
app.use("/api/chat", chatRoutes);
app.use("/api/materials", materialsRoutes);
app.use("/api/practice", practiceRoutes);
app.use("/api/progress", progressRoutes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

app.use((error, req, res, next) => {
  console.error("Unhandled app error:", error);
  res.status(500).json({
    success: false,
    message: "Internal server error",
  });
});

module.exports = app;

