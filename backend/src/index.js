import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';

// Import routers
import healthRouter from './routes/health.js';
import authRouter from './routes/auth.js';
import webauthnRouter from './routes/webauthn.js';
import authorizationRouter from './routes/authorization.js';
import resourcesRouter from './routes/resources.js';
import devicesRouter from './routes/devices.js';
import accessRouter from './routes/access.js';
import auditRouter from './routes/audit.js';
import actionsRouter from './routes/actions.js';
import approvalsRouter from './routes/approvals.js';
import socRouter from './routes/soc.js';
import copilotRouter from './routes/copilot.js';
import simulationRouter from './routes/simulation.js';
import adminRouter from './routes/admin.js';

dotenv.config();

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

// Initialize Socket.IO with permissive CORS for development
export const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  },
});

app.use(cors());
app.use(express.json());

// Track connected socket clients
io.on('connection', (socket) => {
  console.log(`[Socket.IO] Client connected: ${socket.id}`);

  socket.on('disconnect', () => {
    console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
  });
});

/**
 * Global helper to broadcast real-time events across the SOC platform
 * @param {string} eventName - e.g. 'risk.updated', 'security.event', 'session.revoked'
 * @param {Object} data
 */
export function broadcastSecurityEvent(eventName, data) {
  if (io) {
    io.emit(eventName, {
      ...data,
      timestamp: new Date().toISOString(),
    });
  }
}

// Make broadcast helper available on req.app
app.set('broadcastSecurityEvent', broadcastSecurityEvent);

// Route Bindings
app.use(healthRouter);
app.use('/auth', authRouter);
app.use('/api/auth', authRouter);
app.use('/api/auth/webauthn', webauthnRouter);
app.use('/api/authorization', authorizationRouter);
app.use('/resources', resourcesRouter);
app.use('/api/resources', resourcesRouter);
app.use('/devices', devicesRouter);
app.use('/api/devices', devicesRouter);
app.use('/access', accessRouter);
app.use('/api/access', accessRouter);
app.use('/audit-logs', auditRouter);
app.use('/api/audit', auditRouter);
app.use('/actions', actionsRouter);
app.use('/approvals', approvalsRouter);
app.use('/api/manager/approvals', approvalsRouter);
app.use('/soc', socRouter);
app.use('/api/security', socRouter);
app.use('/copilot', copilotRouter);
app.use('/api/simulation', simulationRouter);
app.use('/api/admin', adminRouter);

server.listen(PORT, () => {
  console.log(`[AdaptiveGuard] Server running on port ${PORT} with Socket.IO enabled`);
});

export default app;
