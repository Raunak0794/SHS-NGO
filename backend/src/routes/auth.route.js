const express = require('express');
const authController = require("../controllers/auth.controller");
const authMiddleware = require("../middleware/auth");
const validators = require('../middleware/validator.middleware');

const router = express.Router();

router.post('/register', validators.registerUserValidations, authController.registerUser);
router.post('/login', validators.loginUserValidations, authController.loginUser);
router.post("/logout", authController.logoutUser);
router.get('/me', authMiddleware, authController.getMe); // ✅

router.get("/google/url", authMiddleware, authController.getGoogleAuthUrl);
router.get("/google/callback", authController.googleCallback);

module.exports = router;