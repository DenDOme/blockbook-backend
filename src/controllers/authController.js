const { clientId, clientSecret } = require('../config/environment');
const { requestGitHub } = require('../services/githubService');

async function getAccessToken(req, res, next) {
    try {
        const { code } = req.query;
        if (!code) return res.status(400).json({ error: "Code is required" });

        const url = `https://github.com/login/oauth/access_token?client_id=${clientId}&client_secret=${clientSecret}&code=${code}`;
        const data = await requestGitHub(url, { method: "POST", headers: { Accept: "application/json" } });
        res.json({ token: data.access_token });
    } catch (error) {
        next(error);
    }
}

module.exports = { getAccessToken };
