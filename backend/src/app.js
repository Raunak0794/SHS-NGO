require('dotenv').config();

const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const { Strategy: GoogleStrategy } = require('passport-google-oauth20');
const userModel = require('./models/user.model');

const authRoutes = require('./routes/auth.route');
const dashboardRoutes = require("./routes/dashboard");
const aiRoutes = require("./routes/ai.route");
const microgoalsRoutes = require("./routes/microgoals.route");
const calendarRoutes = require("./routes/calendar.route");
const studyRoutes = require("./routes/study.route");

const app = express();

// ✅ CORS – allow frontend origin with credentials
// ================= CORS DYNAMIC CONFIGURATION =================
// ================= CORS CONFIGURATION =================
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  /^https:\/\/.*\.vercel\.app$/,  // allows any Vercel preview deployment
  process.env.FRONTEND_URL,        // optional: specific production URL
].filter(Boolean);

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);
    
    // Check if origin matches any allowed pattern
    const isAllowed = allowedOrigins.some(allowed => {
      if (allowed instanceof RegExp) {
        return allowed.test(origin);
      }
      return allowed === origin;
    });
    
    if (isAllowed) {
      callback(null, true);
    } else {
      console.log(`CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));

app.use(express.json());
app.use(cookieParser());
app.use(passport.initialize());

// Test route
app.get('/', (req, res) => {
  res.status(200).json({ message: "Auth service is running" });
});

// ================= GOOGLE OAUTH =================
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: '/auth/google/callback',
}, async (accessToken, refreshToken, profile, done) => {
  try {
    let user = await userModel.findOne({ email: profile.emails[0].value });
    if (!user) {
      user = await userModel.create({
        username: profile.displayName.replace(/\s/g, '').toLowerCase(),
        email: profile.emails[0].value,
        fullName: {
          firstName: profile.name.givenName,
          lastName: profile.name.familyName,
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
    res.cookie('token', token, {
      httpOnly: true,
      secure: false, // ✅ set false for local development (HTTP)
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000,
    });
    res.redirect('http://localhost:5173/auth/google/success');
  }
);

// ================= ROUTES =================
app.use("/api/auth", authRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/microgoals", microgoalsRoutes);
app.use("/api/calendar", calendarRoutes);
app.use("/api/study", studyRoutes);

module.exports = app;