const express = require('express');
const app = express();
const PORT = 3000;

// Middleware — parse incoming JSON bodies
app.use(express.json());

// Route 1 — Home
app.get('/', (req, res) => {
    res.json({
        app: 'Synapse',
        status: 'running',
        message: 'Welcome to Synapse API'
    });
});

// Route 2 — Health check (standard in every real DevOps deployment)
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    });
});

// Route 3 — Echo (accepts POST, returns what you sent)
app.post('/echo', (req, res) => {
    res.json({
        received: req.body,
        echo: true
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`Synapse running on port ${PORT}`);
});