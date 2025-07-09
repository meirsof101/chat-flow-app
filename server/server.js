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

// Store connected users with their rooms
const connectedUsers = new Map();
const chatRooms = new Set(['general', 'random', 'tech']);
const roomUsers = new Map();
const messageReactions = new Map(); // Store message reactions

// Initialize room user counts
chatRooms.forEach(room => {
  roomUsers.set(room, 0);
});

io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  // Handle user joining chat
  socket.on('joinChat', (data) => {
    const { username } = data;
    
    // Store user info with default room
    connectedUsers.set(socket.id, {
      username,
      socketId: socket.id,
      currentRoom: 'general',
      joinedAt: new Date()
    });

    // Join the default room
    socket.join('general');
    
    // Update room user count
    roomUsers.set('general', (roomUsers.get('general') || 0) + 1);

    // Send current room list
    socket.emit('roomList', Array.from(chatRooms));

    // Send updated user list to all clients
    const userList = Array.from(connectedUsers.values()).map(user => user.username);
    io.emit('userList', userList);

    // Send updated room users
    const roomUserCounts = Object.fromEntries(roomUsers);
    io.emit('roomUsers', roomUserCounts);

    // Notify others about new user joining the room
    socket.to('general').emit('userJoined', { 
      username, 
      room: 'general'
    });

    console.log(`User ${username} joined general room`);
  });

  // Handle switching rooms
  socket.on('switchRoom', (data) => {
    const { username, room } = data;
    const user = connectedUsers.get(socket.id);
    
    if (user) {
      const oldRoom = user.currentRoom;
      
      // Leave old room
      socket.leave(oldRoom);
      roomUsers.set(oldRoom, Math.max(0, (roomUsers.get(oldRoom) || 0) - 1));
      
      // Join new room
      socket.join(room);
      roomUsers.set(room, (roomUsers.get(room) || 0) + 1);
      
      // Update user's current room
      user.currentRoom = room;
      connectedUsers.set(socket.id, user);
      
      // Send updated room users to all clients
      const roomUserCounts = Object.fromEntries(roomUsers);
      io.emit('roomUsers', roomUserCounts);
      
      // Notify room changes
      socket.to(oldRoom).emit('userLeft', { username, room: oldRoom });
      socket.to(room).emit('userJoined', { username, room });
      
      console.log(`User ${username} switched from ${oldRoom} to ${room}`);
    }
  });

  // Handle creating new rooms
  socket.on('createRoom', (data) => {
    const { roomName, creator } = data;
    
    if (!chatRooms.has(roomName)) {
      chatRooms.add(roomName);
      roomUsers.set(roomName, 0);
      
      // Send updated room list to all clients
      io.emit('roomList', Array.from(chatRooms));
      
      // Send updated room users
      const roomUserCounts = Object.fromEntries(roomUsers);
      io.emit('roomUsers', roomUserCounts);
      
      // Notify about room creation
      io.emit('roomCreated', { roomName, creator });
      
      console.log(`Room ${roomName} created by ${creator}`);
    }
  });

  // Handle sending messages to rooms
  socket.on('sendMessage', (messageData) => {
    const user = connectedUsers.get(socket.id);
    if (user) {
      const message = {
        username: user.username,
        message: messageData.message,
        timestamp: new Date().toISOString(),
        room: messageData.room || user.currentRoom
      };
      
      console.log(`Message from ${user.username} in room ${message.room}:`, message.message);
      
      // Broadcast to all users in the room
      io.to(message.room).emit('message', message);
    }
  });

  // Handle message reactions
  socket.on('addReaction', (data) => {
    const { messageId, emoji, username, room } = data;
    
    // Get existing reactions for this message
    const reactions = messageReactions.get(messageId) || {};
    
    // Get users who reacted with this emoji
    const usersWithEmoji = reactions[emoji] || [];
    
    // Toggle reaction (add if not present, remove if present)
    if (usersWithEmoji.includes(username)) {
      // Remove reaction
      reactions[emoji] = usersWithEmoji.filter(user => user !== username);
      if (reactions[emoji].length === 0) {
        delete reactions[emoji];
      }
    } else {
      // Add reaction
      reactions[emoji] = [...usersWithEmoji, username];
    }
    
    // Update reactions
    messageReactions.set(messageId, reactions);
    
    // Broadcast to all users in the room
    io.to(room).emit('reactionUpdate', {
      messageId,
      reactions
    });
    
    console.log(`Reaction ${emoji} by ${username} on message ${messageId}`);
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
    if (user) {
      socket.to(data.room || user.currentRoom).emit('userTyping', { 
        username: data.username,
        room: data.room || user.currentRoom
      });
    }
  });

  socket.on('stopTyping', (data) => {
    const user = connectedUsers.get(socket.id);
    if (user) {
      socket.to(data.room || user.currentRoom).emit('userStoppedTyping', { 
        username: data.username,
        room: data.room || user.currentRoom
      });
    }
  });

  // Handle user disconnection
  socket.on('disconnect', () => {
    const user = connectedUsers.get(socket.id);
    if (user) {
      // Update room user count
      roomUsers.set(user.currentRoom, Math.max(0, (roomUsers.get(user.currentRoom) || 0) - 1));
      
      // Remove user from connected users
      connectedUsers.delete(socket.id);
      
      // Send updated user list to all clients
      const userList = Array.from(connectedUsers.values()).map(user => user.username);
      io.emit('userList', userList);
      
      // Send updated room users
      const roomUserCounts = Object.fromEntries(roomUsers);
      io.emit('roomUsers', roomUserCounts);
      
      // Notify others about user leaving
      socket.to(user.currentRoom).emit('userLeft', { 
        username: user.username,
        room: user.currentRoom
      });
      
      console.log(`User ${user.username} disconnected from ${user.currentRoom}`);
    }
    console.log('Client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});