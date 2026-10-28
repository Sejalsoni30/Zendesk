import { Server as SocketIOServer } from 'socket.io';
import { Server as HttpServer } from 'http';
import { config } from './config/env.js';

let io: SocketIOServer | null = null;

export function initSocket(server: HttpServer): SocketIOServer {
  const configuredOrigins = config.CORS_ORIGIN.split(',').map((s) => s.trim());
  const allowedOrigins = new Set([
    ...configuredOrigins,
    'http://localhost:5173',
    'http://127.0.0.1:5173',
  ]);

  io = new SocketIOServer(server, {
    cors: {
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (config.CORS_ORIGIN === '*' || allowedOrigins.has(origin)) {
          return callback(null, true);
        }
        if (
          origin.endsWith('.vercel.app') ||
          origin.endsWith('.onrender.com') ||
          origin.endsWith('.netlify.app')
        ) {
          return callback(null, true);
        }
        return callback(null, true); // Fallback allow for WebSocket handshakes
      },
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    console.log(`⚡ WebSocket client connected: ${socket.id}`);

    socket.on('disconnect', () => {
      console.log(`🔌 WebSocket client disconnected: ${socket.id}`);
    });
  });

  return io;
}

export function getIO(): SocketIOServer | null {
  return io;
}

export function broadcastEvent(event: string, payload: any): void {
  if (io) {
    io.emit(event, payload);
  }
}

