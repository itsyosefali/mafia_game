// ============================================================
// index.js — Express + Socket.IO Server Entry Point
// ============================================================

const express = require('express');
const fs = require('fs');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const { setupSockets } = require('./sockets');

const clientDist = process.env.CLIENT_DIST
  ? path.resolve(process.env.CLIENT_DIST)
  : path.join(__dirname, '..', 'client', 'dist');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' ? false : 'http://localhost:5173',
    methods: ['GET', 'POST'],
  },
});

// Serve static files from client build (production)
app.use(express.static(clientDist));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// SPA fallback for production
const indexHtml = path.join(clientDist, 'index.html');
app.get('*', (req, res) => {
  res.sendFile(indexHtml);
});

// Set up Socket.IO handlers
setupSockets(io);

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`\n🧙‍♀️  السحارة (Al-Sahara) server running on http://localhost:${PORT}`);
  console.log(`   Waiting for connections...\n`);
  if (!fs.existsSync(indexHtml)) {
    console.error(
      `Missing client build: ${indexHtml}\n` +
        '  In Docker, rebuild the image. On the host, run: cd client && npm ci && npm run build\n',
    );
  }
});
