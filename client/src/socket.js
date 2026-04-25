import { io } from 'socket.io-client';

// In production the client is served by the same Node server,
// so we connect to the current origin. In dev we target the local server.
const SOCKET_URL =
  import.meta.env.PROD
    ? window.location.origin
    : 'http://localhost:3001';

const socket = io(SOCKET_URL, {
  autoConnect: true,
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: 10,
});

socket.on('connect', () => {
  console.log('[Socket] Connected:', socket.id);
});

socket.on('disconnect', (reason) => {
  console.log('[Socket] Disconnected:', reason);
});

socket.on('connect_error', (err) => {
  console.error('[Socket] Connection error:', err.message);
});

export default socket;
