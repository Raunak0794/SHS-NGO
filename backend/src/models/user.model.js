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
    passwordResetTokenHash: {
        type: String,
        select: false,
        index: true,
    },
    passwordResetExpiresAt: {
        type: Date,
        select: false,
    },
    tokenVersion: {
        type: Number,
        default: 0,
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
    classLevel: {
        type: String,
        enum: ['Class 5', 'Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10'],
        default: 'Class 8',
    },
    subjects: {
        type: [String],
        default: ['Mathematics', 'Science', 'English', 'Social Science'],
    },
    learningGoals: {
        type: [String],
        default: ['understanding_concepts', 'homework', 'exam_prep'],
    },
    explanationLevel: {
        type: String,
        enum: ['simple', 'normal', 'detailed', 'teach_me'],
        default: 'simple',
    },
    dailyStudyGoalMinutes: {
        type: Number,
        default: 30,
        min: 10,
        max: 240,
    },
    streak: {
        type: Number,
        default: 0,
    },
    lastActiveDate: {
        type: Date,
        default: Date.now,
    },
    onboardingCompleted: {
        type: Boolean,
        default: false,
    },
}, { timestamps: true })

const userModel = mongoose.model('user', userSchema);

module.exports = userModel;
