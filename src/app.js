import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import db from './config/db.js';
import userRoutes from './routes/user.routes.js';
import authRoutes from './routes/auth.routes.js';
import fiveM1ERoutes from './routes/fiveM1E.routes.js';
import mnrRoutes from './routes/mnr.routes.js';
import masterDataRoutes from './routes/masterData.routes.js';
import ogiRoutes from './routes/ogi.routes.js';
import npiRoutes from './routes/npi.routes.js';
import sqprRoutes from './routes/sqpr.routes.js';
import sqmpRoutes from './routes/sqmp.routes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/users', userRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/5m1e', fiveM1ERoutes);
app.use('/api/mnr', mnrRoutes);
app.use('/api/master', masterDataRoutes);
app.use('/api/ogi', ogiRoutes);
app.use('/api/npi', npiRoutes);
app.use('/api/sqpr', sqprRoutes);
app.use('/api/sqm-plan', sqmpRoutes);

// Health check
app.get('/health', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT 1');
    res.json({ status: 'ok', database: 'connected' });
  } catch (error) {
    res.status(500).json({ status: 'error', database: 'disconnected', error: error.message });
  }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

export default app;
