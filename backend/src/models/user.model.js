const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        select: false,
    },
    fullName: {
        firstName: { type: String, required: true },
        lastName: { type: String, required: true }
    },
    calendarTokens: {
        accessToken: String,
        refreshToken: String,
        expiryDate: Date,
    },
}, { timestamps: true })

const userModel = mongoose.model('user', userSchema);

module.exports = userModel;