const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

// Socket.IO configuration
const io = socketIo(server, {
  cors: {
    origin: "https://blog-app-one-drab-13.vercel.app",
    methods: ["GET", "POST"],
    credentials: true
  },
  pingTimeout: 60000,
  pingInterval: 25000,
  transports: ['websocket', 'polling']
});

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
.then(() => console.log('✅ MongoDB connected successfully'))
.catch(err => console.error('❌ MongoDB connection error:', err));

// User Schema
const userSchema = new mongoose.Schema({
  username: { 
    type: String, 
    required: true, 
    unique: true 
  },
  email: { 
    type: String, 
    required: true, 
    unique: true 
  },
  password: { 
    type: String, 
    required: true 
  },
  isOnline: { 
    type: Boolean, 
    default: false 
  },
  lastSeen: { 
    type: Date, 
    default: Date.now 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

const User = mongoose.model('User', userSchema);

// Message Schema
const messageSchema = new mongoose.Schema({
  username: { 
    type: String, 
    required: true 
  },
  message: { 
    type: String, 
    required: true 
  },
  room: { 
    type: String, 
    required: true 
  },
  type: { 
    type: String, 
    default: 'text' 
  },
  file: {
    filename: String,
    originalname: String,
    size: Number,
    mimetype: String,
    url: String
  },
  timestamp: { 
    type: Date, 
    default: Date.now 
  }
});

const Message = mongoose.model('Message', messageSchema);

// Middleware
app.use(cors());
app.use(express.json());

// In-memory storage for active connections
const connectedUsers = new Map();
const chatRooms = new Set(['general', 'random', 'tech']);
const roomUsers = new Map();
const messageReactions = new Map();

// Initialize room user counts
chatRooms.forEach(room => {
  roomUsers.set(room, 0);
});

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

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

// API Endpoints

// User Registration
app.post('/api/register', async (req, res) => {
  try {
    const { username, password, email } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ 
      $or: [{ username }, { email }] 
    });
    
    if (existingUser) {
      return res.status(400).json({ 
        error: existingUser.username === username ? 'Username already exists' : 'Email already exists' 
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const newUser = new User({
      username,
      email,
      password: hashedPassword,
      isOnline: false
    });

    await newUser.save();

    // Generate JWT token
    const token = jwt.sign({ username, userId: newUser._id }, JWT_SECRET, { expiresIn: '24h' });

    res.json({
      message: 'User registered successfully',
      token,
      user: { username, email, userId: newUser._id }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// User Login
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Find user in database
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({ error: 'User not found' });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(400).json({ error: 'Invalid password' });
    }

    // Update online status
    user.isOnline = true;
    user.lastSeen = new Date();
    await user.save();

    // Generate JWT token
    const token = jwt.sign({ username, userId: user._id }, JWT_SECRET, { expiresIn: '24h' });

    res.json({
      message: 'Login successful',
      token,
      user: { username, email: user.email, userId: user._id }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Guest Login
app.post('/api/guest-login', async (req, res) => {
  try {
    const { username } = req.body;

    // Check if username is taken by registered user
    const existingUser = await User.findOne({ username });
    if (existingUser) {
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
    console.error('Guest login error:', error);
    res.status(500).json({ error: 'Guest login failed' });
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

// Get room history
app.get('/api/room/:roomName/messages', async (req, res) => {
  try {
    const { roomName } = req.params;
    const { page = 1, limit = 50 } = req.query;
    
    const messages = await Message.find({ room: roomName })
      .sort({ timestamp: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();
    
    res.json({
      messages: messages.reverse(),
      currentPage: page,
      hasMore: messages.length === limit
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Get online users
app.get('/api/users/online', async (req, res) => {
  try {
    const onlineUsers = await User.find({ isOnline: true })
      .select('username lastSeen')
      .exec();
    
    res.json(onlineUsers);
  } catch (error) {
    console.error('Error fetching online users:', error);
    res.status(500).json({ error: 'Failed to fetch online users' });
  }
});

// Serve uploaded files
app.use('/uploads', express.static('uploads'));

// JWT Authentication Middleware
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

// Apply authentication to Socket.IO
io.use(authenticateToken);

// Socket.IO Connection Handler
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id, 'User:', socket.user.username);

  // Store user info
  connectedUsers.set(socket.id, {
    username: socket.user.username,
    socketId: socket.id,
    currentRoom: null,
    joinedAt: new Date(),
    isGuest: socket.user.isGuest || false,
    userId: socket.user.userId || null
  });

  // Send current room list
  socket.emit('roomList', Array.from(chatRooms));

  // Send updated user list
  const userList = Array.from(connectedUsers.values()).map(user => user.username);
  io.emit('userList', userList);

  // Handle joining a room
  socket.on('joinRoom', async (data) => {
    const { roomName } = data;
    const user = connectedUsers.get(socket.id);
    
    if (user && chatRooms.has(roomName)) {
      // Leave previous room if any
      if (user.currentRoom) {
        socket.leave(user.currentRoom);
        roomUsers.set(user.currentRoom, Math.max(0, (roomUsers.get(user.currentRoom) || 0) - 1));
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

      // Send updated room users
      const roomUserCounts = Object.fromEntries(roomUsers);
      io.emit('roomUsers', roomUserCounts);

      // Notify room about user joining
      socket.to(roomName).emit('userJoined', { 
        username: user.username, 
        room: roomName 
      });

      // Confirm room join
      socket.emit('roomJoined', { 
        room: roomName,
        message: `You joined #${roomName}` 
      });

      // Load room history
      try {
        const recentMessages = await Message.find({ room: roomName })
          .sort({ timestamp: -1 })
          .limit(50)
          .exec();
        
        const formattedMessages = recentMessages.reverse().map(msg => ({
          id: msg._id,
          username: msg.username,
          message: msg.message,
          timestamp: msg.timestamp.toISOString(),
          room: msg.room,
          type: msg.type,
          file: msg.file
        }));
        
        socket.emit('roomHistory', { room: roomName, messages: formattedMessages });
      } catch (error) {
        console.error('Error loading room history:', error);
      }
      
      console.log(`User ${user.username} joined room ${roomName}`);
    }
  });

  // Handle creating new rooms
  socket.on('createRoom', (data) => {
    const { roomName } = data;
    const user = connectedUsers.get(socket.id);
    
    if (user && !chatRooms.has(roomName)) {
      chatRooms.add(roomName);
      roomUsers.set(roomName, 0);
      
      // Send updated room list
      io.emit('roomList', Array.from(chatRooms));
      
      // Send updated room users
      const roomUserCounts = Object.fromEntries(roomUsers);
      io.emit('roomUsers', roomUserCounts);
      
      // Notify about room creation
      io.emit('roomCreated', { roomName, creator: user.username });
      
      console.log(`Room ${roomName} created by ${user.username}`);
    }
  });

  // Handle sending messages
  socket.on('sendMessage', async (messageData, callback) => {
    const user = connectedUsers.get(socket.id);
    if (user && user.currentRoom) {
      const message = {
        id: messageData.id,
        username: user.username,
        message: messageData.message,
        timestamp: new Date().toISOString(),
        room: user.currentRoom
      };
      
      // Save message to database
      try {
        const newMessage = new Message({
          username: user.username,
          message: messageData.message,
          room: user.currentRoom,
          type: 'text'
        });
        await newMessage.save();
        
        // Broadcast to room
        io.to(message.room).emit('message', message);
        
        // Send acknowledgment
        if (callback) {
          callback({ success: true, messageId: message.id });
        }
      } catch (error) {
        console.error('Error saving message:', error);
        if (callback) {
          callback({ success: false, error: 'Failed to save message' });
        }
      }
    }
  });

  // Handle file messages
  socket.on('file_message', async (data) => {
    const user = connectedUsers.get(socket.id);
    if (user && user.currentRoom) {
      const message = {
        id: data.id || Date.now().toString(),
        username: user.username,
        type: 'file',
        file: data.file,
        timestamp: new Date().toISOString(),
        room: user.currentRoom
      };
      
      // Save file message to database
      try {
        const newMessage = new Message({
          username: user.username,
          message: data.file.originalname,
          room: user.currentRoom,
          type: 'file',
          file: data.file
        });
        await newMessage.save();
        
        // Broadcast to room
        io.to(message.room).emit('message', message);
        
        console.log(`File message from ${user.username} in room ${message.room}:`, message.file.originalname);
      } catch (error) {
        console.error('Error saving file message:', error);
      }
    }
  });

  // Handle message reactions
  socket.on('addReaction', (data) => {
    const { messageId, emoji, room } = data;
    const user = connectedUsers.get(socket.id);
    
    if (user) {
      const reactions = messageReactions.get(messageId) || {};
      const usersWithEmoji = reactions[emoji] || [];
      
      // Toggle reaction
      if (usersWithEmoji.includes(user.username)) {
        reactions[emoji] = usersWithEmoji.filter(u => u !== user.username);
        if (reactions[emoji].length === 0) {
          delete reactions[emoji];
        }
      } else {
        reactions[emoji] = [...usersWithEmoji, user.username];
      }
      
      messageReactions.set(messageId, reactions);
      
      // Broadcast reaction update
      io.to(room).emit('reactionUpdate', {
        messageId,
        reactions
      });
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
      
      // Find receiver's socket
      const receiverSocket = Array.from(connectedUsers.entries())
        .find(([id, user]) => user.username === messageData.receiver);
      
      if (receiverSocket) {
        io.to(receiverSocket[0]).emit('privateMessage', message);
        socket.emit('privateMessage', message);
      }
    }
  });

  // Handle typing indicators
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

  // Handle disconnection
  socket.on('disconnect', async () => {
    const user = connectedUsers.get(socket.id);
    if (user) {
      // Update room user count
      if (user.currentRoom) {
        roomUsers.set(user.currentRoom, Math.max(0, (roomUsers.get(user.currentRoom) || 0) - 1));
        socket.to(user.currentRoom).emit('userLeft', { 
          username: user.username,
          room: user.currentRoom
        });
      }
      
      // Update user's online status in database
      if (user.userId) {
        try {
          await User.findByIdAndUpdate(user.userId, {
            isOnline: false,
            lastSeen: new Date()
          });
        } catch (error) {
          console.error('Error updating user offline status:', error);
        }
      }
      
      // Remove from connected users
      connectedUsers.delete(socket.id);
      
      // Send updated lists
      const userList = Array.from(connectedUsers.values()).map(user => user.username);
      io.emit('userList', userList);
      
      const roomUserCounts = Object.fromEntries(roomUsers);
      io.emit('roomUsers', roomUserCounts);
      
      console.log(`User ${user.username} disconnected`);
    }
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});