// ============================================================
// index.js — Express + Socket.IO Server Entry Point
// ============================================================

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const { setupSockets } = require('./sockets');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' ? false : 'http://localhost:5173',
    methods: ['GET', 'POST'],
  },
});

// Serve static files from client build (production)
app.use(express.static(path.join(__dirname, '..', 'client', 'dist')));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// SPA fallback for production
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'client', 'dist', 'index.html'));
});

// Set up Socket.IO handlers
setupSockets(io);

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`\n🕵️  Mafia Game Server running on http://localhost:${PORT}`);
  console.log(`   Waiting for connections...\n`);
});
