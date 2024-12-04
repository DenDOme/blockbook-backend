require('dotenv').config();

if (!process.env.CLIENT_ID || !process.env.CLIENT_SECRET) {
    console.error("Missing environment variables CLIENT_ID or CLIENT_SECRET");
    process.exit(1);
}

module.exports = {
    clientId: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    frontendUrl: process.env.FRONTEND_URL,
    port: process.env.PORT || 4000,
};