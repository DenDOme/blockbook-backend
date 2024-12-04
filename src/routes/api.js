const express = require('express');
const { getAccessToken } = require('../controllers/authController');
const { getAllFilesFromRepo, getVaultRepository, addNewFileToVault } = require('../controllers/repoController');

const router = express.Router();

// Authentication Routes
router.get('/getAccessToken', getAccessToken);

// Repository Routes
router.get('/getVaultRepository', getVaultRepository);
router.get('/getAllFiles', getAllFilesFromRepo);
router.put('/addNewFileToVault', addNewFileToVault);

// File Routes


module.exports = router;