const userModel = require('../models/user.model');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { createHash, randomBytes, randomUUID } = require('crypto');
const { google } = require('googleapis');
const { getAuthCookieOptions, getClearAuthCookieOptions } = require('../utils/cookies');
const { blacklistToken } = require('../utils/tokenBlacklist');
const { isEmailConfigured, sendPasswordResetEmail } = require('../services/emailService');

const PASSWORD_RESET_RESPONSE =
    'If an account exists for that email, a password reset link has been sent.';
const passwordResetAttempts = new Map();

function getJwtSecret() {
    const secret = process.env.JWT_SECRET || "dev-secret-change-me";
    return String(secret).replace(/\s+/g, "").trim();
}

function getFrontendOrigin() {
    return process.env.FRONTEND_URL || "http://localhost:5173";
}

function sanitizeUser(user) {
    if (!user) return null;
    const plainUser = user.toObject ? user.toObject() : user;
    delete plainUser.password;
    delete plainUser.passwordResetTokenHash;
    delete plainUser.passwordResetExpiresAt;
    delete plainUser.tokenVersion;
    return plainUser;
}

function getPasswordResetTtlMinutes() {
    return Math.min(
        Math.max(Number(process.env.PASSWORD_RESET_TTL_MINUTES) || 30, 10),
        120
    );
}

function isPasswordResetRequestAllowed(email, ipAddress) {
    const key = createHash('sha256')
        .update(`${email}|${ipAddress || 'unknown'}`)
        .digest('hex');
    const now = Date.now();
    const windowMs = 15 * 60 * 1000;
    const current = passwordResetAttempts.get(key);

    if (!current || current.expiresAt <= now) {
        if (passwordResetAttempts.size >= 5000) {
            passwordResetAttempts.delete(passwordResetAttempts.keys().next().value);
        }
        passwordResetAttempts.set(key, { count: 1, expiresAt: now + windowMs });
        return true;
    }

    if (current.count >= 3) return false;
    current.count += 1;
    return true;
}

function waitForMinimumDuration(startedAt, minimumMs = 350) {
    const remainingMs = minimumMs - (Date.now() - startedAt);
    return remainingMs > 0
        ? new Promise((resolve) => setTimeout(resolve, remainingMs))
        : Promise.resolve();
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
            tokenVersion: user.tokenVersion || 0,
        }, getJwtSecret(), { expiresIn: '1d', jwtid: randomUUID() });

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
            tokenVersion: user.tokenVersion || 0,
        }, getJwtSecret(), { expiresIn: '1d', jwtid: randomUUID() });

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

// ================= FORGOT / RESET PASSWORD =================
async function forgotPassword(req, res) {
    const startedAt = Date.now();
    res.set('Cache-Control', 'no-store');
    const email = String(req.body?.email || '').trim().toLowerCase();
    const isProduction = process.env.NODE_ENV === 'production';
    let previewResetUrl;
    let emailJob;

    try {
        if (isPasswordResetRequestAllowed(email, req.ip)) {
            const escapedEmail = email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const user = await userModel.findOne({
                email: { $regex: `^${escapedEmail}$`, $options: 'i' },
            });

            if (user && (isEmailConfigured() || !isProduction)) {
                const rawToken = randomBytes(32).toString('hex');
                const tokenHash = createHash('sha256').update(rawToken).digest('hex');
                const expiresAt = new Date(
                    Date.now() + getPasswordResetTtlMinutes() * 60 * 1000
                );
                const resetUrl = `${getFrontendOrigin()}/reset-password?token=${encodeURIComponent(rawToken)}`;

                user.passwordResetTokenHash = tokenHash;
                user.passwordResetExpiresAt = expiresAt;
                await user.save();

                if (isEmailConfigured()) {
                    emailJob = async () => {
                        try {
                            await sendPasswordResetEmail({ to: user.email, resetUrl });
                        } catch (emailError) {
                            console.error('Password reset email failed:', emailError.message);
                            await userModel.updateOne(
                                { _id: user._id, passwordResetTokenHash: tokenHash },
                                { $unset: { passwordResetTokenHash: '', passwordResetExpiresAt: '' } }
                            ).catch(() => {});
                        }
                    };
                } else {
                    previewResetUrl = resetUrl;
                }
            } else if (user && !isEmailConfigured()) {
                console.error('Password reset requested, but SMTP is not configured.');
            }
        }

        await waitForMinimumDuration(startedAt);
        const response = { message: PASSWORD_RESET_RESPONSE };
        if (!isProduction && previewResetUrl) response.previewResetUrl = previewResetUrl;
        res.status(200).json(response);

        if (emailJob) setImmediate(emailJob);
    } catch (error) {
        console.error('Forgot password error:', error);
        await waitForMinimumDuration(startedAt);
        return res.status(200).json({ message: PASSWORD_RESET_RESPONSE });
    }
}

async function resetPassword(req, res) {
    try {
        res.set('Cache-Control', 'no-store');
        const tokenHash = createHash('sha256')
            .update(String(req.body.token))
            .digest('hex');
        const passwordHash = await bcrypt.hash(req.body.password, 12);
        const user = await userModel.findOneAndUpdate(
            {
                passwordResetTokenHash: tokenHash,
                passwordResetExpiresAt: { $gt: new Date() },
            },
            {
                $set: { password: passwordHash },
                $unset: { passwordResetTokenHash: '', passwordResetExpiresAt: '' },
                $inc: { tokenVersion: 1 },
            },
            { new: true }
        );

        if (!user) {
            return res.status(400).json({
                message: 'This password reset link is invalid or has expired.',
            });
        }

        res.clearCookie('token', getClearAuthCookieOptions());
        return res.status(200).json({
            message: 'Password reset successfully. You can now sign in.',
        });
    } catch (error) {
        console.error('Reset password error:', error);
        return res.status(500).json({ message: 'Could not reset password' });
    }
}

// ================= LOGOUT =================
async function logoutUser(req, res) {
    try {
        const token = req.cookies?.token;

        if (token) {
            try {
                await blacklistToken(token);
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
            return res.redirect(`${getFrontendOrigin()}/dashboard?calendar=error`);
        }

        await userModel.findByIdAndUpdate(decoded.id, {
            calendarTokens: {
                accessToken: tokens.access_token,
                refreshToken: tokens.refresh_token || user.calendarTokens?.refreshToken,
                expiryDate: tokens.expiry_date ? new Date(tokens.expiry_date) : undefined,
            },
        });

        // Refresh the SHS session before returning from the external OAuth flow.
        // This keeps cookie-based Google logins authenticated after the full-page redirect.
        const sessionToken = jwt.sign({
            id: user._id,
            username: user.username,
            email: user.email,
            tokenVersion: user.tokenVersion || 0,
        }, getJwtSecret(), { expiresIn: '1d', jwtid: randomUUID() });

        res.cookie('token', sessionToken, getAuthCookieOptions());
        return res.redirect(`${getFrontendOrigin()}/dashboard?calendar=connected`);
    } catch (err) {
        console.error("Google calendar callback error:", err);
        return res.redirect(`${getFrontendOrigin()}/dashboard?calendar=error`);
    }
}

const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      classLevel,
      subjects,
      learningGoals,
      explanationLevel,
      dailyStudyGoalMinutes,
      onboardingCompleted,
      fullName,
    } = req.body || {};

    const updates = {};
    if (classLevel) updates.classLevel = classLevel;
    if (Array.isArray(subjects)) updates.subjects = subjects;
    if (Array.isArray(learningGoals)) updates.learningGoals = learningGoals;
    if (explanationLevel) updates.explanationLevel = explanationLevel;
    if (dailyStudyGoalMinutes) updates.dailyStudyGoalMinutes = Number(dailyStudyGoalMinutes);
    if (onboardingCompleted !== undefined) updates.onboardingCompleted = Boolean(onboardingCompleted);
    if (fullName) updates.fullName = fullName;

    const user = await userModel.findByIdAndUpdate(
      userId,
      { $set: updates },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({
      message: "Profile updated successfully",
      user: sanitizeUser(user),
    });
  } catch (err) {
    console.error("Update profile error:", err);
    return res.status(500).json({ message: "Could not update profile" });
  }
};

// ================= EXPORT =================
module.exports = {
    registerUser,
    loginUser,
    forgotPassword,
    resetPassword,
    logoutUser,
    getGoogleAuthUrl,
    googleCallback,
    getMe,
    updateProfile,
};
