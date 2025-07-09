const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Store connected users with their socket IDs
const connectedUsers = new Map();
const typingUsers = new Set();

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  // Handle user joining chat
  socket.on('joinChat', (data) => {
    const { username } = data;
    
    // Store user info with socket ID for private messaging
    connectedUsers.set(socket.id, {
      username,
      socketId: socket.id,
      joinedAt: new Date()
    });

    // Also create a reverse mapping for quick lookup
    connectedUsers.set(username, socket.id);

    // Join user to global room
    socket.join('global');
    
    // Notify OTHER users about new user joining
    socket.to('global').emit('userJoined', { username });
    
    // Send updated user list to ALL clients
    const userList = Array.from(connectedUsers.values())
      .filter(user => typeof user === 'object' && user.username)
      .map(user => user.username);
    
    io.emit('userList', userList);
    
    console.log(`${username} joined the chat`);
  });

  // Handle sending public messages
  socket.on('sendMessage', (messageData) => {
    console.log('Public message received:', messageData);
    
    const message = {
      username: messageData.username,
      message: messageData.message,
      timestamp: messageData.timestamp,
      type: 'message'
    };
    
    // Send message to ALL users
    io.emit('message', message);
    
    console.log(`Broadcasting message from ${messageData.username}: ${messageData.message}`);
  });

  // Handle sending private messages
  socket.on('privateMessage', (data) => {
    const { from, to, message } = data;
    console.log(`Private message from ${from} to ${to}: ${message}`);
    
    // Get the socket ID of the recipient
    const recipientSocketId = connectedUsers.get(to);
    
    if (recipientSocketId) {
      // Send to recipient
      io.to(recipientSocketId).emit('privateMessage', {
        from,
        to,
        message,
        timestamp: new Date().toISOString()
      });
      
      console.log(`Private message sent from ${from} to ${to}`);
    } else {
      console.log(`User ${to} not found for private message`);
      
      // Optionally send error back to sender
      socket.emit('privateMessageError', {
        error: 'User not found',
        targetUser: to
      });
    }
  });

  // Handle typing indicators for global chat
  socket.on('startTyping', (data) => {
    const user = connectedUsers.get(socket.id);
    if (user && user.username) {
      typingUsers.add(user.username);
      socket.to('global').emit('userTyping', {
        username: user.username,
        isTyping: true
      });
    }
  });

  socket.on('stopTyping', (data) => {
    const user = connectedUsers.get(socket.id);
    if (user && user.username) {
      typingUsers.delete(user.username);
      socket.to('global').emit('userTyping', {
        username: user.username,
        isTyping: false
      });
    }
  });

  // Handle user disconnection
  socket.on('disconnect', () => {
    const user = connectedUsers.get(socket.id);
    if (user && user.username) {
      console.log(`${user.username} disconnected`);
      
      // Remove from typing users
      typingUsers.delete(user.username);
      
      // Remove from connected users (both mappings)
      connectedUsers.delete(socket.id);
      connectedUsers.delete(user.username);
      
      // Notify OTHER users about user leaving
      socket.to('global').emit('userLeft', { username: user.username });
      
      // Send updated user list to ALL clients
      const userList = Array.from(connectedUsers.values())
        .filter(user => typeof user === 'object' && user.username)
        .map(user => user.username);
      
      io.emit('userList', userList);
    }
    
    console.log('Client disconnected:', socket.id);
  });

  // Handle connection errors
  socket.on('error', (error) => {
    console.error('Socket error:', error);
  });
});

// Basic route for health check
app.get('/health', (req, res) => {
  const userCount = Array.from(connectedUsers.values())
    .filter(user => typeof user === 'object' && user.username).length;
  
  res.json({ 
    status: 'OK', 
    connectedUsers: userCount,
    uptime: process.uptime()
  });
});

// Get connected users (REST endpoint)
app.get('/api/users', (req, res) => {
  const userList = Array.from(connectedUsers.values())
    .filter(user => typeof user === 'object' && user.username)
    .map(user => ({
      username: user.username,
      joinedAt: user.joinedAt
    }));
  
  res.json(userList);
});

// Get chat statistics
app.get('/api/stats', (req, res) => {
  const userCount = Array.from(connectedUsers.values())
    .filter(user => typeof user === 'object' && user.username).length;
  
  res.json({
    totalUsers: userCount,
    typingUsers: Array.from(typingUsers),
    uptime: process.uptime()
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log('Socket.IO server ready for connections');
  console.log('Features enabled:');
  console.log('- Global chat');
  console.log('- Private messaging');
  console.log('- Typing indicators');
  console.log('- User presence');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

module.exports = { app, server, io };