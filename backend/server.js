require("dotenv").config();
const app = require('./src/app');
const connectDB = require('./src/db/db');

const PORT = process.env.PORT || 5000;

// Connect to database with error handling
const startServer = async () => {
    let dbConnected = false;

    try {
        await connectDB();
        dbConnected = true;
    } catch (err) {
        console.error('Failed to connect to database:', err.message);
        console.error('Starting server without database connection. API routes that require MongoDB will return 503.');
    }

    app.locals.dbConnected = dbConnected;

    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
};

startServer();
