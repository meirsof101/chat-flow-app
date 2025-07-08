const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

// Configure Socket.IO with CORS
const io = socketIo(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Store connected users
const connectedUsers = new Map();

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  // Handle user joining
  socket.on('join', (userData) => {
    console.log('User joined:', userData);
    
    // Store user information
    connectedUsers.set(socket.id, {
      id: socket.id,
      username: userData.username,
      joinedAt: new Date()
    });

    // Notify all clients about the new user
    socket.broadcast.emit('user_joined', {
      username: userData.username,
      message: `${userData.username} has joined the chat`
    });

    // Send current online users to the new user
    const onlineUsers = Array.from(connectedUsers.values());
    socket.emit('online_users', onlineUsers);
    
    // Broadcast updated online users list
    io.emit('users_update', onlineUsers);
  });

  // Handle chat messages
  socket.on('send_message', (messageData) => {
    const user = connectedUsers.get(socket.id);
    if (user) {
      const message = {
        id: Date.now(),
        username: user.username,
        message: messageData.message,
        timestamp: new Date(),
        socketId: socket.id
      };
      
      console.log('Message received:', message);
      
      // Broadcast message to all clients
      io.emit('receive_message', message);
    }
  });

  // Handle typing indicators
  socket.on('typing', (data) => {
    const user = connectedUsers.get(socket.id);
    if (user) {
      socket.broadcast.emit('user_typing', {
        username: user.username,
        isTyping: data.isTyping
      });
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    
    const user = connectedUsers.get(socket.id);
    if (user) {
      // Remove user from connected users
      connectedUsers.delete(socket.id);
      
      // Notify all clients about user leaving
      socket.broadcast.emit('user_left', {
        username: user.username,
        message: `${user.username} has left the chat`
      });
      
      // Broadcast updated online users list
      const onlineUsers = Array.from(connectedUsers.values());
      io.emit('users_update', onlineUsers);
    }
  });
});

// Basic route for testing
app.get('/', (req, res) => {
  res.json({ message: 'Chat server is running!' });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    connectedUsers: connectedUsers.size,
    timestamp: new Date()
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Socket.IO server ready for connections`);
});