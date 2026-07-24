const { Server } = require('socket.io');

let io = null;

function init(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
    // Required when behind nginx in Docker — keeps the path stable
    path: '/socket.io',
  });

  io.on('connection', (socket) => {
    const { userId, roleName } = socket.handshake.auth;

    if (userId) socket.join(`user_${userId}`);
    if (roleName) socket.join(`role_${roleName}`);

    socket.on('disconnect', () => {});
  });

  return io;
}

function emitToUser(userId, event, data) {
  if (io && userId) io.to(`user_${userId}`).emit(event, data);
}

function emitToRole(roleName, event, data) {
  if (io && roleName) io.to(`role_${roleName}`).emit(event, data);
}

module.exports = { init, emitToUser, emitToRole };
