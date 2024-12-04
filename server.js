require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const bodyParser = require('body-parser');
const helmet = require('helmet');

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

function validateGithubCode(code) {
    return typeof code === 'string' && /^[a-zA-Z0-9_-]+$/.test(code);
}

app.get('/getAccessToken', async function (req, res) {
    const code = req.query.code;

    if (!validateGithubCode(code)) {
        return res.status(400).json({ error: 'Invalid authorization code' });
    }

    const params = `?client_id=${CLIENT_ID}&client_secret=${CLIENT_SECRET}&code=${code}`;

    try {
        const response = await fetch("https://github.com/login/oauth/access_token" + params, {
            method: "POST",
            headers: {
                "Accept": "application/json"
            }
        });

        const data = await response.json();
        if (data.error) {
            return res.status(400).json({ error: data.error });
        }

        const checkVaultResponse = await checkForVault(data.access_token);

        if (checkVaultResponse.exists) {
            return res.json({
                message: 'Repository already exists.',
                token: data.access_token,
                repo: checkVaultResponse.repo,
            });
        }

        const repoInitResponse = await initRepository(data.access_token);

        if (repoInitResponse.error) {
            return res.status(500).json({ error: repoInitResponse.error });
        }

        res.json({ message: 'Access token obtained and repository initialized.', repo: repoInitResponse, token: data.access_token });
    } catch (error) {
        console.error('Error during authorization:', error.message);
        res.status(500).json({ error: 'Failed to obtain access token.' });
    }
});

async function initRepository(token) {
    try {
        const repoCheckResponse = await checkForVault(token);

        if (repoCheckResponse.exists) {
            return { message: 'Repository already exists.' };
        }

        const response = await fetch('https://api.github.com/user/repos', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/vnd.github+json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                name: 'test-blockbook-vault',
                private: true,
                auto_init: true,
            }),
        });

        if (!response.ok) {
            const error = await response.json();
            return { error: error.message };
        }

        const repoData = await response.json();
        return repoData;
    } catch (error) {
        console.error('Error creating repository:', error.message);
        return { error: 'Failed to create repository.' };
    }
}

async function checkForVault(token) {
    try {
        const repos = await getAllRepos(token);
        const existingRepo = repos.find(repo => repo.name === 'test-blockbook-vault');

        return { exists: !!existingRepo, repo: existingRepo };
    } catch (error) {
        console.error('Error checking repository:', error.message);
        return { error: 'Failed to check repository.' };
    }
}

async function getAllRepos(token) {
    let allRepos = [];
    let page = 1;
    let hasNextPage = true;

    while (hasNextPage) {
        const response = await fetch(`https://api.github.com/user/repos?visibility=all&page=${page}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/vnd.github+json',
            },
        });

        if (!response.ok) {
            const error = await response.json();
            console.error('GitHub API Error (Check Vault):', error.message);
            return [];
        }

        const repos = await response.json();
        allRepos = allRepos.concat(repos);

        const linkHeader = response.headers.get('link');
        hasNextPage = linkHeader && linkHeader.includes('rel="next"');

        page++;
    }

    return allRepos;
}

async function getAllFilesFromRepo(owner, repo, token) {
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/`;
    const headers = token
        ? { Authorization: `Bearer ${token}`, 'Accept': 'application/vnd.github+json' }
        : { 'Accept': 'application/vnd.github+json' };

    let idCounter = 0; 

    async function fetchContents(path = '') {
        const response = await fetch(`${apiUrl}${path}`, { headers });

        if (!response.ok) {
            throw new Error(`Error fetching contents: ${response.statusText}`);
        }

        const contents = await response.json();
        let files = [];

        for (const item of contents) {
            if (item.type === 'file' && item.name.endsWith('.md')) {
                const fileContent = await fetch(item.download_url, { headers }).then((res) => res.text());
                files.push({id: idCounter++, name: item.name, path: item.path, content: fileContent });
            } else if (item.type === 'dir') {
                const nestedFiles = await fetchContents(item.path);
                files = files.concat(nestedFiles);
            }
        }

        return files;
    }

    try {
        const allFiles = await fetchContents();
        return allFiles;
    } catch (error) {
        console.error('Error fetching repository contents:', error);
        return [];
    }
}

app.get('/getAllFiles', async function (req, res) {
    const { owner, repo, token } = req.query;

    if (!owner || !repo) {
        return res.status(400).json({ error: 'Owner and repo parameters are required.' });
    }

    try {
        const files = await getAllFilesFromRepo(owner, repo, token);
        res.json(files);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch files.', details: error.message });
    }
});

app.get('/getVaultRepository', async function(req, res)  {
    const { token } = req.query

    if (!token) {
        return res.status(400).json({ error: 'Token is required.' });
    }

    try {
        const checkVaultResponse = await checkForVault(token);

        if (checkVaultResponse.exists) {
            return res.json({
                message: 'Repository found',
                repo: checkVaultResponse.repo,
            });
        } else {
            return res.status(404).json({ message: 'Vault repository does not exist.' });
        }
    } catch (error) {
        console.error('Error finding vault repository:', error.message);
        res.status(500).json({ error: 'Failed to check vault repository.', details: error.message });
    }
})


const PORT = process.env.PORT || 4000;
app.listen(PORT, function () {
    console.log(`Server running on port ${PORT}`);
});

