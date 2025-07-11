const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

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

// Store connected users with their rooms
const connectedUsers = new Map();
const chatRooms = new Set(['general', 'random', 'tech']);
const roomUsers = new Map();
const messageReactions = new Map(); // Store message reactions
const registeredUsers = new Map(); // Simple user storage (use database in production)

// Initialize room user counts
chatRooms.forEach(room => {
  roomUsers.set(room, 0);
});

// JWT Secret (use environment variable in production)
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// User Registration Endpoint
app.post('/api/register', async (req, res) => {
  try {
    const { username, password, email } = req.body;

    // Check if user already exists
    if (registeredUsers.has(username)) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Store user
    registeredUsers.set(username, {
      username,
      password: hashedPassword,
      email,
      createdAt: new Date(),
      isOnline: false
    });

    // Generate JWT token
    const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '24h' });

    res.json({
      message: 'User registered successfully',
      token,
      user: { username, email }
    });
  } catch (error) {
    res.status(500).json({ error: 'Registration failed' });
  }
});

// User Login Endpoint
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Check if user exists
    const user = registeredUsers.get(username);
    if (!user) {
      return res.status(400).json({ error: 'User not found' });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(400).json({ error: 'Invalid password' });
    }

    // Generate JWT token
    const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '24h' });

    // Update online status
    user.isOnline = true;
    registeredUsers.set(username, user);

    res.json({
      message: 'Login successful',
      token,
      user: { username, email: user.email }
    });
  } catch (error) {
    res.status(500).json({ error: 'Login failed' });
  }
});

// Guest Login Endpoint
app.post('/api/guest-login', (req, res) => {
  try {
    const { username } = req.body;

    // Check if guest username is taken
    if (registeredUsers.has(username)) {
      return res.status(400).json({ error: 'Username already taken by registered user' });
    }

    // Generate JWT token for guest
    const token = jwt.sign({ username, isGuest: true }, JWT_SECRET, { expiresIn: '24h' });

    res.json({
      message: 'Guest login successful',
      token,
      user: { username, isGuest: true }
    });
  } catch (error) {
    res.status(500).json({ error: 'Guest login failed' });
  }
});

// Middleware to verify JWT token
const authenticateToken = (socket, next) => {
  const token = socket.handshake.auth.token;
  
  if (!token) {
    return next(new Error('Authentication error'));
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return next(new Error('Authentication error'));
    }
    socket.user = user;
    next();
  });
};

// File upload setup
const storage = multer.diskStorage({
  destination: './uploads/',
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|pdf|txt|docx|mp4|mp3/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

// File upload endpoint
app.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  
  res.json({
    filename: req.file.filename,
    originalname: req.file.originalname,
    size: req.file.size,
    mimetype: req.file.mimetype,
    url: `/uploads/${req.file.filename}`
  });
});

// Serve uploaded files
app.use('/uploads', express.static('uploads'));

// Socket.io with authentication
io.use(authenticateToken);

io.on('connection', (socket) => {
  console.log('New client connected:', socket.id, 'User:', socket.user.username);

  // Store user info but don't join any room yet
  connectedUsers.set(socket.id, {
    username: socket.user.username,
    socketId: socket.id,
    currentRoom: null, // No room initially
    joinedAt: new Date(),
    isGuest: socket.user.isGuest || false
  });

  // Send current room list
  socket.emit('roomList', Array.from(chatRooms));

  // Send updated user list to all clients
  const userList = Array.from(connectedUsers.values()).map(user => user.username);
  io.emit('userList', userList);

  // Handle joining a specific room
  socket.on('joinRoom', (data) => {
    const { roomName } = data;
    const user = connectedUsers.get(socket.id);
    
    if (user && chatRooms.has(roomName)) {
      // If user is already in a room, leave it first
      if (user.currentRoom) {
        socket.leave(user.currentRoom);
        roomUsers.set(user.currentRoom, Math.max(0, (roomUsers.get(user.currentRoom) || 0) - 1));
        
        // Notify old room about user leaving
        socket.to(user.currentRoom).emit('userLeft', { 
          username: user.username, 
          room: user.currentRoom 
        });
      }

      // Join new room
      socket.join(roomName);
      user.currentRoom = roomName;
      connectedUsers.set(socket.id, user);
      
      // Update room user count
      roomUsers.set(roomName, (roomUsers.get(roomName) || 0) + 1);

      // Send updated room users to all clients
      const roomUserCounts = Object.fromEntries(roomUsers);
      io.emit('roomUsers', roomUserCounts);

      // Notify new room about user joining (THIS IS WHERE THE NOTIFICATION HAPPENS)
      socket.to(roomName).emit('userJoined', { 
        username: user.username, 
        room: roomName 
      });

      // Confirm room join to the user
      socket.emit('roomJoined', { 
        room: roomName,
        message: `You joined #${roomName}` 
      });
      
      console.log(`User ${user.username} joined room ${roomName}`);
    }
  });

  // Handle switching rooms
  socket.on('switchRoom', (data) => {
    const { roomName } = data;
    const user = connectedUsers.get(socket.id);
    
    if (user && chatRooms.has(roomName)) {
      const oldRoom = user.currentRoom;
      
      if (oldRoom) {
        // Leave old room
        socket.leave(oldRoom);
        roomUsers.set(oldRoom, Math.max(0, (roomUsers.get(oldRoom) || 0) - 1));
        
        // Notify old room
        socket.to(oldRoom).emit('userLeft', { 
          username: user.username, 
          room: oldRoom 
        });
      }
      
      // Join new room
      socket.join(roomName);
      roomUsers.set(roomName, (roomUsers.get(roomName) || 0) + 1);
      
      // Update user's current room
      user.currentRoom = roomName;
      connectedUsers.set(socket.id, user);
      
      // Send updated room users to all clients
      const roomUserCounts = Object.fromEntries(roomUsers);
      io.emit('roomUsers', roomUserCounts);
      
      // Notify new room about user joining
      socket.to(roomName).emit('userJoined', { 
        username: user.username, 
        room: roomName 
      });
      
      console.log(`User ${user.username} switched to room ${roomName}`);
    }
  });

  // Handle creating new rooms
  socket.on('createRoom', (data) => {
    const { roomName } = data;
    const user = connectedUsers.get(socket.id);
    
    if (user && !chatRooms.has(roomName)) {
      chatRooms.add(roomName);
      roomUsers.set(roomName, 0);
      
      // Send updated room list to all clients
      io.emit('roomList', Array.from(chatRooms));
      
      // Send updated room users
      const roomUserCounts = Object.fromEntries(roomUsers);
      io.emit('roomUsers', roomUserCounts);
      
      // Notify about room creation
      io.emit('roomCreated', { roomName, creator: user.username });
      
      console.log(`Room ${roomName} created by ${user.username}`);
    }
  });

  // Handle sending messages to rooms
  socket.on('sendMessage', (messageData) => {
    const user = connectedUsers.get(socket.id);
    if (user && user.currentRoom) {
      const message = {
        username: user.username,
        message: messageData.message,
        timestamp: new Date().toISOString(),
        room: user.currentRoom
      };
      
      console.log(`Message from ${user.username} in room ${message.room}:`, message.message);
      
      // Broadcast to all users in the room
      io.to(message.room).emit('message', message);
    }
  });

  // Handle file messages
  socket.on('file_message', (data) => {
    const user = connectedUsers.get(socket.id);
    if (user && user.currentRoom) {
      const message = {
        username: user.username,
        type: 'file',
        file: data.file,
        timestamp: new Date().toISOString(),
        room: user.currentRoom
      };
      
      console.log(`File message from ${user.username} in room ${message.room}:`, message.file.originalname);
      
      // Broadcast to all users in the room
      io.to(message.room).emit('message', message);
    }
  });

  // Handle message reactions
  socket.on('addReaction', (data) => {
    const { messageId, emoji, room } = data;
    const user = connectedUsers.get(socket.id);
    
    if (user) {
      // Get existing reactions for this message
      const reactions = messageReactions.get(messageId) || {};
      
      // Get users who reacted with this emoji
      const usersWithEmoji = reactions[emoji] || [];
      
      // Toggle reaction (add if not present, remove if present)
      if (usersWithEmoji.includes(user.username)) {
        // Remove reaction
        reactions[emoji] = usersWithEmoji.filter(u => u !== user.username);
        if (reactions[emoji].length === 0) {
          delete reactions[emoji];
        }
      } else {
        // Add reaction
        reactions[emoji] = [...usersWithEmoji, user.username];
      }
      
      // Update reactions
      messageReactions.set(messageId, reactions);
      
      // Broadcast to all users in the room
      io.to(room).emit('reactionUpdate', {
        messageId,
        reactions
      });
      
      console.log(`Reaction ${emoji} by ${user.username} on message ${messageId}`);
    }
  });

  // Handle private messages
  socket.on('privateMessage', (messageData) => {
    const sender = connectedUsers.get(socket.id);
    if (sender) {
      const message = {
        sender: sender.username,
        receiver: messageData.receiver,
        message: messageData.message,
        timestamp: messageData.timestamp,
        type: 'private'
      };
      
      console.log(`Private message from ${sender.username} to ${messageData.receiver}:`, message.message);
      
      // Find receiver's socket
      const receiverSocket = Array.from(connectedUsers.entries())
        .find(([id, user]) => user.username === messageData.receiver);
      
      if (receiverSocket) {
        // Send to receiver
        io.to(receiverSocket[0]).emit('privateMessage', message);
        // Send back to sender (so they see their own message)
        socket.emit('privateMessage', message);
      }
    }
  });

  // Handle typing indicators for rooms
  socket.on('typing', (data) => {
    const user = connectedUsers.get(socket.id);
    if (user && user.currentRoom) {
      socket.to(user.currentRoom).emit('userTyping', { 
        username: user.username,
        room: user.currentRoom
      });
    }
  });

  socket.on('stopTyping', (data) => {
    const user = connectedUsers.get(socket.id);
    if (user && user.currentRoom) {
      socket.to(user.currentRoom).emit('userStoppedTyping', { 
        username: user.username,
        room: user.currentRoom
      });
    }
  });

  // Handle user disconnection
  socket.on('disconnect', () => {
    const user = connectedUsers.get(socket.id);
    if (user) {
      // Update room user count if user was in a room
      if (user.currentRoom) {
        roomUsers.set(user.currentRoom, Math.max(0, (roomUsers.get(user.currentRoom) || 0) - 1));
        
        // Notify others about user leaving
        socket.to(user.currentRoom).emit('userLeft', { 
          username: user.username,
          room: user.currentRoom
        });
      }
      
      // Update user's online status if they're registered
      if (registeredUsers.has(user.username)) {
        const registeredUser = registeredUsers.get(user.username);
        registeredUser.isOnline = false;
        registeredUsers.set(user.username, registeredUser);
      }
      
      // Remove user from connected users
      connectedUsers.delete(socket.id);
      
      // Send updated user list to all clients
      const userList = Array.from(connectedUsers.values()).map(user => user.username);
      io.emit('userList', userList);
      
      // Send updated room users
      const roomUserCounts = Object.fromEntries(roomUsers);
      io.emit('roomUsers', roomUserCounts);
      
      console.log(`User ${user.username} disconnected`);
    }
    console.log('Client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});