const { Server }       = require('socket.io');
const { verifyAccessToken } = require('../config/jwt');
const { setSocketIO }  = require('../notifications/notification.engine');
const logger           = require('../utils/logger');

const initSocket = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(','),
      credentials: true,
    },
    pingTimeout:  60000,
    pingInterval: 25000,
  });

  // Auth middleware — validate JWT before socket connects
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];
    if (!token) return next(new Error('Authentication required'));
    try {
      socket.user = verifyAccessToken(token);
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const { id: userId, firm_id: firmId } = socket.user;
    logger.debug(`Socket connected: user=${userId}`);

    // Join personal room + firm room
    socket.join(`user:${userId}`);
    socket.join(`firm:${firmId}`);

    socket.on('join:room', (room) => socket.join(room));
    socket.on('leave:room', (room) => socket.leave(room));

    socket.on('disconnect', () => {
      logger.debug(`Socket disconnected: user=${userId}`);
    });
  });

  setSocketIO(io);
  logger.info('✅ Socket.IO initialised');
  return io;
};

module.exports = { initSocket };
