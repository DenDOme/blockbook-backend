require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const helmet = require('helmet');
const apiRoutes = require('./routes/api');

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;

if (!CLIENT_ID || !CLIENT_SECRET) {
    console.error('CLIENT_ID or CLIENT_SECRET is not set. Please check your environment variables.');
    process.exit(1);
}

const app = express();

app.use(helmet());
app.use(cors({
    origin: process.env.FRONTEND_URL,
    credentials: true, 
}));
app.use(bodyParser.json());

app.use(apiRoutes);

module.exports = app;