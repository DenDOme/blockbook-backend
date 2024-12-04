const { requestGitHub, getAllRepos } = require('../services/githubService');

async function getVaultRepository(req, res, next) {
    const { token } = req.query;
    if (!token) return res.status(400).json({ error: "Token is required" });

    try {
        const repos = await getAllRepos(token);
        const vaultExists = repos.find(repo => repo.name === "test-blockbook-vault");

        if (vaultExists) {
            return res.json({ message: "Repository already exists", repo: vaultExists });
        }

        const response = await requestGitHub('https://api.github.com/user/repos', {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: 'application/vnd.github+json',
            },
            body: JSON.stringify({ name: 'test-blockbook-vault', private: true, auto_init: true }),
        });
        res.json({ message: "Repository created successfully", repo: response });
    } catch (error) {
        next(error);
    }
}

async function getAllFilesFromRepo(req, res, next) {
    const { owner, repo, token } = req.query;
    if (!token) return res.status(400).json({ error: "Token is required" });

    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/`;
    const headers = {
        Authorization: `Bearer ${token}`,
        'Accept': 'application/vnd.github+json',
    };

    let idCounter = 0;

    async function fetchContents(path = '') {
        try {
            const contents = await requestGitHub(`${apiUrl}${path}`, { headers });

            let files = [];
            for (const item of contents) {
                if (item.type === 'file' && item.name.endsWith('.md')) {
                    const fileContent = await fetch(item.download_url, { headers }).then(res => res.text());
                    files.push({ id: idCounter++, name: item.name, path: item.path, content: fileContent });
                } else if (item.type === 'dir') {
                    const nestedFiles = await fetchContents(item.path);
                    files = files.concat(nestedFiles);
                }
            }

            return files;
        } catch (error) {
            throw new Error(`Error fetching contents: ${error.message}`);
        }
    }

    try {
        const allFiles = await fetchContents();
        res.json({ message: "Files fetched successfully", files: allFiles });
    } catch (error) {
        next(error);
    }
}

async function addNewFileToVault(req, res, next) {
    const { owner, repo, path, fileContent, token } = req.query;

    if (!token) {
        return res.status(400).json({ error: 'Token is required.' });
    }

    if (!owner || !repo || !path || !fileContent) {
        return res.status(400).json({ error: 'Owner, repo, file path, and file content are required.' });
    }

    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
    const base64Content = Buffer.from(fileContent).toString("base64");

    const body = JSON.stringify({
        message: "Adding a new file via API",
        content: base64Content,
        branch: "main",
    });

    const options = {
        method: "PUT",
        headers: {
            "Authorization": `Bearer ${token}`,
            "Accept": "application/vnd.github+json",
            "Content-Type": "application/json",
        },
        body,
    };

    try {
        const data = await requestGitHub(url, options);

        res.status(201).json({
            message: 'File added successfully',
            file: {
                name: data.content.name,
                path: data.content.path,
                sha: data.content.sha,
            },
        });
    } catch (error) {
       next(error);
    }
}

module.exports = {
    getVaultRepository,
    getAllFilesFromRepo,
    addNewFileToVault
};
