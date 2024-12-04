const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

async function requestGitHub(url, options) {
    const response = await fetch(url, options);
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "GitHub API error");
    }
    return await response.json();
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

module.exports = {
    requestGitHub,
    getAllRepos,
};
