import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import healthRouter from './routes/health.js';
import authRouter from './routes/auth.js';
import resourcesRouter from './routes/resources.js';
import devicesRouter from './routes/devices.js';
import accessRouter from './routes/access.js';
import { requireAuth } from './middleware/auth.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Routes
app.use(healthRouter);
app.use('/auth', authRouter);
app.use('/resources', resourcesRouter);
app.use('/devices', devicesRouter);
app.use('/access', accessRouter);

// Dummy protected route for auth middleware verification
app.get('/dummy-protected', requireAuth, (req, res) => {
  res.json({ message: 'protected access granted', user: req.user });
});

app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});

export default app;
