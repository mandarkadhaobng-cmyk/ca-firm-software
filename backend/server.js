require('dotenv').config();
require('express-async-errors');

const express    = require('express');
const http       = require('http');
const cors       = require('cors');
const helmet     = require('helmet');
const compression= require('compression');
const morgan     = require('morgan');
const path       = require('path');
const cookieParser = require('cookie-parser');

const corsConfig     = require('./config/cors');
const routes         = require('./routes/index');
const errorHandler   = require('./middleware/errorHandler');
const { apiLimiter } = require('./middleware/rateLimit');
const { initSocket } = require('./sockets/socket.server');
const logger         = require('./utils/logger');

const app    = express();
const server = http.createServer(app);

// ── Security & Parsing ────────────────────────────────────────────────────────
app.set('trust proxy', 1);
app.use(helmet());
app.use(cors(corsConfig));
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
app.use(morgan('combined', { stream: { write: (msg) => logger.info(msg.trim()) } }));

// ── Rate Limiting ─────────────────────────────────────────────────────────────
app.use('/api/', apiLimiter);

// ── Static uploads (fallback if not using R2) ─────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── API Routes ────────────────────────────────────────────────────────────────
app.use('/api', routes);

// ── 404 handler ───────────────────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ success: false, message: 'Route not found' }));

// ── Global Error Handler ──────────────────────────────────────────────────────
app.use(errorHandler);

// ── Socket.IO ─────────────────────────────────────────────────────────────────
initSocket(server);

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  logger.info(`🚀 CA Firm Backend running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
  logger.info(`📡 API: http://localhost:${PORT}/api`);
  logger.info(`❤️  Health: http://localhost:${PORT}/api/health`);
});

// ── Graceful Shutdown ─────────────────────────────────────────────────────────
process.on('SIGTERM', () => {
  logger.info('SIGTERM received — shutting down gracefully');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

module.exports = { app, server };
