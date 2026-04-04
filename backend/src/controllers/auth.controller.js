const userModel = require('../models/user.model');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const redis = require('../db/redis');

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
        }, process.env.JWT_SECRET, { expiresIn: '1d' });

        res.cookie("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'none',
            maxAge: 24 * 60 * 60 * 1000,
        });

        res.status(201).json({
            message: "User registered successfully",
            user
        });

    } catch (err) {
        console.error("Error in registerUser:", err);
        res.status(500).json({ message: "Internal server error" });
    }
}

// ================= LOGIN =================
async function loginUser(req, res) {
    try {
        const { username, email, password } = req.body;

        const user = await userModel
            .findOne({ $or: [{ email }, { username }] })
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
        }, process.env.JWT_SECRET, { expiresIn: '1d' });

        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'none',
            maxAge: 24 * 60 * 60 * 1000,
        });

        return res.status(200).json({
            message: 'Logged in successfully',
            user
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

        if (token) {
            try {
                await redis.set(`blacklist:${token}`, 'true', 'EX', 24 * 60 * 60);
            } catch (err) {
                console.error("Redis error:", err);
            }
        }

        res.clearCookie('token', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'none',
        });

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
    res.json({ user });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};
// ================= GOOGLE =================
function getGoogleAuthUrl(req, res) {
    res.send("Google auth URL route working");
}

function googleCallback(req, res) {
    res.send("Google callback working");
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