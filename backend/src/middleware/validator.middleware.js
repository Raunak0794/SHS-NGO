const { body, validationResult } = require('express-validator');


const respondWithValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    next();
}


const registerUserValidations = [
    body("username")
        .isString()
        .withMessage("Username must be a string")
        .isLength({ min: 3 })
        .withMessage("Username must be at least 3 characters long"),
    body("email")
        .isEmail()
        .withMessage("Invalid email address"),
    body("password")
        .isLength({ min: 6 })
        .withMessage("Password must be at least 6 characters long"),
    body("fullName.firstName")
        .isString()
        .withMessage("First name must be a string")
        .notEmpty()
        .withMessage("First name is required"),
    body("fullName.lastName")
        .isString()
        .withMessage("Last name must be a string")
        .notEmpty()
        .withMessage("Last name is required"),
    body("role")
        .optional()
        .isIn([ 'user', 'seller' ])
        .withMessage("Role must be either 'user' or 'seller'"),
    respondWithValidationErrors
]

const loginUserValidations = [
    body('identifier')
        .optional({ values: 'falsy' })
        .isString()
        .withMessage('Identifier must be a string'),
    body('email')
        .optional({ values: 'falsy' })
        .isString()
        .withMessage('Email must be a string'),
    body('username')
        .optional({ values: 'falsy' })
        .isString()
        .withMessage('Username must be a string'),
    body('password')
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 characters long'),
    (req, res, next) => {
        const hasIdentifier = Boolean(req.body.identifier || req.body.email || req.body.username);
        if (!hasIdentifier) {
            return res.status(400).json({ errors: [ { msg: 'Either email, username, or identifier is required' } ] });
        }
        respondWithValidationErrors(req, res, next);
    }
]

const forgotPasswordValidations = [
    body('email')
        .trim()
        .isEmail()
        .withMessage('Enter a valid email address'),
    respondWithValidationErrors
]

const resetPasswordValidations = [
    body('token')
        .isString()
        .matches(/^[a-f0-9]{64}$/i)
        .withMessage('Password reset link is invalid'),
    body('password')
        .isLength({ min: 8, max: 128 })
        .withMessage('Password must be between 8 and 128 characters')
        .matches(/[a-z]/)
        .withMessage('Password must include a lowercase letter')
        .matches(/[A-Z]/)
        .withMessage('Password must include an uppercase letter')
        .matches(/[0-9]/)
        .withMessage('Password must include a number'),
    respondWithValidationErrors
]

module.exports = {
    registerUserValidations,
    loginUserValidations,
    forgotPasswordValidations,
    resetPasswordValidations
}
