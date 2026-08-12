const userModel = require('../models/user.model');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const redis = require('../db/redis');
const { google } = require('googleapis');
const { getAuthCookieOptions, getClearAuthCookieOptions } = require('../utils/cookies');

function getJwtSecret() {
    const secret = process.env.JWT_SECRET || "dev-secret-change-me";
    return String(secret).replace(/\s+/g, "").trim();
}

function sanitizeUser(user) {
    if (!user) return null;
    const plainUser = user.toObject ? user.toObject() : user;
    delete plainUser.password;
    return plainUser;
}

function getCalendarOAuthClient() {
    return new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_CALENDAR_REDIRECT_URI || process.env.GOOGLE_REDIRECT_URI
    );
}

// ================= REGISTER =================
async function registerUser(req, res) {
    try {
        const { username, email, password, fullName } = req.body;

        const firstName = fullName?.firstName;
        const lastName = fullName?.lastName;

        const isUserAlreadyExists = await userModel.findOne({
            $or: [{ username }, { email }]
        });

        if (isUserAlreadyExists) {
            return res.status(409).json({ message: "Username or email already exists" });
        }

        const hash = await bcrypt.hash(password, 10);

        const user = await userModel.create({
            username,
            email,
            password: hash,
            fullName: { firstName, lastName }
        });

        const token = jwt.sign({
            id: user._id,
            username: user.username,
            email: user.email,
        }, getJwtSecret(), { expiresIn: '1d' });

        res.cookie("token", token, getAuthCookieOptions());

        res.status(201).json({
            message: "User registered successfully",
            user: sanitizeUser(user),
            token
        });

    } catch (err) {
        console.error("Error in registerUser:", err);
        res.status(500).json({ message: "Internal server error" });
    }
}

// ================= LOGIN =================
async function loginUser(req, res) {
    try {
        const { username, email, password, identifier } = req.body;
        const loginIdentifier = identifier || username || email;

        const user = await userModel
            .findOne({
                $or: [
                    { email: loginIdentifier },
                    { username: loginIdentifier }
                ]
            })
            .select('+password');

        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const isMatch = await bcrypt.compare(password, user.password || '');
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign({
            id: user._id,
            username: user.username,
            email: user.email,
        }, getJwtSecret(), { expiresIn: '1d' });

        res.cookie('token', token, getAuthCookieOptions());

        return res.status(200).json({
            message: 'Logged in successfully',
            user: sanitizeUser(user),
            token
        });

    } catch (err) {
        console.error('Error in loginUser:', err);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

// ================= LOGOUT =================
async function logoutUser(req, res) {
    try {
        const token = req.cookies?.token;

        if (token && redis) {
            try {
                await redis.set(`blacklist:${token}`, 'true', 'EX', 24 * 60 * 60);
            } catch (err) {
                console.error("Redis blacklist error:", err.message);
            }
        }

        res.clearCookie('token', getClearAuthCookieOptions());

        return res.status(200).json({ message: "Logged out successfully" });

    } catch (err) {
        console.error("Error in logoutUser:", err);
        return res.status(500).json({ message: "Internal server error" });
    }
}
const getMe = async (req, res) => {
  try {
    // The user is attached by auth middleware (from cookie)
    const user = await userModel.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ user: sanitizeUser(user) });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};
// ================= GOOGLE CALENDAR =================
function getGoogleAuthUrl(req, res) {
    try {
        const oauth2Client = getCalendarOAuthClient();
        const state = jwt.sign(
            { id: req.user.id, purpose: 'calendar' },
            getJwtSecret(),
            { expiresIn: '10m' }
        );

        const url = oauth2Client.generateAuthUrl({
            access_type: 'offline',
            prompt: 'consent',
            scope: ['https://www.googleapis.com/auth/calendar.events'],
            state,
        });

        res.json({ url });
    } catch (err) {
        console.error("Error creating Google auth URL:", err);
        res.status(500).json({ message: "Could not create Google authorization URL" });
    }
}

async function googleCallback(req, res) {
    try {
        const { code, state } = req.query;
        if (!code || !state) {
            return res.status(400).json({ message: "Missing Google authorization response" });
        }

        const decoded = jwt.verify(state, getJwtSecret());
        if (decoded.purpose !== 'calendar') {
            return res.status(400).json({ message: "Invalid authorization state" });
        }

        const oauth2Client = getCalendarOAuthClient();
        const { tokens } = await oauth2Client.getToken(code);

        const user = await userModel.findById(decoded.id);
        if (!user) {
            return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard?calendar=error`);
        }

        await userModel.findByIdAndUpdate(decoded.id, {
            calendarTokens: {
                accessToken: tokens.access_token,
                refreshToken: tokens.refresh_token || user.calendarTokens?.refreshToken,
                expiryDate: tokens.expiry_date ? new Date(tokens.expiry_date) : undefined,
            },
        });

        res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard?calendar=connected`);
    } catch (err) {
        console.error("Google calendar callback error:", err);
        res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard?calendar=error`);
    }
}

// ================= EXPORT =================
module.exports = {
    registerUser,
    loginUser,
    logoutUser,
    getGoogleAuthUrl,
    googleCallback,
    getMe
};
