# 💬 Advanced Real-Time Chat Application

A modern, full-featured real-time chat application built with React, Node.js, Express, Socket.io, and MongoDB. This application provides secure authentication, real-time messaging, file sharing, and advanced chat features.

### 🚀 Live Demo
Client (Frontend): https://blog-app-one-drab-13.vercel.app/
Server (Backend API): https://week-5-web-sockets-assignment-meirsof101.onrender.com

## 🚀 Features

### Core Features
- **Real-time messaging** with Socket.io
- **User authentication** (Register, Login, Guest mode)
- **Multiple chat rooms** with dynamic room creation
- **Private messaging** between users
- **File sharing** (images, videos, documents)
- **Message reactions** with emoji support
- **Typing indicators** in real-time
- **Online/offline status** tracking
- **Message history** with pagination

### Advanced Features
- **JWT-based authentication** with secure token management
- **MongoDB integration** for persistent data storage
- **Connection status monitoring** with reconnection logic
- **Browser notifications** with sound alerts
- **Message search functionality** across chat history
- **Unread message counters** for all chats
- **Responsive design** for desktop and mobile
- **Guest user support** for quick access
- **Room user counters** showing active participants
- **Message delivery acknowledgments**

## 🛠️ Technology Stack

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web application framework
- **Socket.io** - Real-time bidirectional communication
- **MongoDB** with **Mongoose** - Database and ODM
- **JWT** - JSON Web Token authentication
- **bcryptjs** - Password hashing
- **Multer** - File upload handling
- **CORS** - Cross-origin resource sharing

### Frontend
- **React** - UI library with hooks
- **Socket.io Client** - Real-time communication
- **Tailwind CSS** - Utility-first styling
- **Web Notifications API** - Browser notifications
- **File API** - File upload handling

## 📦 Installation & Setup

### Prerequisites
- Node.js (v18+ recommended)
- MongoDB (local or cloud instance)
- pnpm or yarn package manager

### Server Setup
1. Navigate to the project directory
2. Install server dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the root directory:
   ```env
   MONGO_URI=mongodb://localhost:27017/chatapp
   JWT_SECRET=your-super-secret-jwt-key
   PORT=5000
   ```
4. Create uploads directory:
   ```bash
   mkdir uploads
   ```

### Client Setup
1. The client code is integrated in the same file structure
2. Install client dependencies (if separated):
   ```bash
   npm install react react-dom socket.io-client
   ```

#### Start the application (Runs both server and client)
```bash pnpm run dev 
```

## 🎯 Usage

### Authentication
1. **Register**: Create a new account with username, email, and password
2. **Login**: Access your existing account
3. **Guest Mode**: Join quickly without registration

### Chat Features
1. **Join Rooms**: Select from available rooms (general, random, tech) or create new ones
2. **Send Messages**: Type and send real-time messages
3. **File Sharing**: Upload and share files (images, videos, documents)
4. **Private Chat**: Click on any user to start a private conversation
5. **Reactions**: Add emoji reactions to messages
6. **Search**: Search through message history
7. **Notifications**: Enable browser notifications for new messages

### Room Management
- **Switch Rooms**: Change between different chat rooms
- **Create Rooms**: Add new rooms for specific topics
- **User Count**: See how many users are in each room
- **Room History**: Access previous messages when joining

## 🏗️ Architecture

### Server Architecture
```
server.js
├── Express Server Setup
├── Socket.io Configuration
├── MongoDB Connection
├── User Authentication (JWT)
├── File Upload Handling
├── Real-time Event Handlers
└── API Endpoints
```

### Client Architecture
```
ChatApp Component
├── Authentication System
├── Room Selection Interface
├── Main Chat Interface
├── Message Components
├── File Upload System
├── Notification System
└── Connection Management
```

### Database Schema
```javascript
{
  username: String (unique),
  email: String (unique),
  password: String (hashed),
  isOnline: Boolean,
  lastSeen: Date,
  theme: String ('light' | 'dark'),
  createdAt: Date
}
```

// Message Schema
{
  username: String,
  message: String,
  room: String,
  type: String (text/file),
  file: Object,
  timestamp: Date
}
```

## 🔧 Configuration

### Environment Variables
```env
# Database
MONGO_URI=mongodb+srv://fidel:adminblogapp@blog-app.s9zlzrp.mongodb.net/chatapp?retryWrites=true&w=majority&appName=Blog-app


# Authentication
JWT_SECRET=your-jwt-secret-key

# Server
PORT=5000

# Optional: File Upload Limits
MAX_FILE_SIZE=10485760  # 10MB
```

### Socket.io Configuration
- **CORS**: Enabled for cross-origin requests
- **Transports**: WebSocket and polling
- **Ping Timeout**: 60 seconds
- **Ping Interval**: 25 seconds

## 📱 Responsive Design

The application is fully responsive and works seamlessly on:
- **Desktop** (1024px+)
- **Tablet** (768px - 1023px)
- **Mobile** (320px - 767px)

Key responsive features:
- Adaptive sidebar layout
- Touch-friendly message interface
- Optimized file upload on mobile
- Responsive message bubbles

## 🔐 Security Features

- **Password Hashing**: bcryptjs for secure password storage
- **JWT Authentication**: Secure token-based authentication
- **Input Validation**: Server-side validation for all inputs
- **File Upload Security**: Type checking and size limits
- **XSS Protection**: Sanitized message content
- **CORS Configuration**: Controlled cross-origin access

## 🚀 Performance Optimizations

- **Message Pagination**: Load older messages on demand
- **Connection Pooling**: Efficient database connections
- **File Upload Optimization**: Chunked file uploads
- **Memory Management**: Efficient Socket.io event handling
- **Reconnection Logic**: Automatic connection recovery
- **Message Caching**: In-memory message storage

## 🧪 Testing

### Manual Testing Checklist
- [ ] User registration and login
- [ ] Real-time message sending/receiving
- [ ] File upload and sharing
- [ ] Private messaging
- [ ] Room creation and switching
- [ ] Typing indicators
- [ ] Notification system
- [ ] Connection recovery
- [ ] Mobile responsiveness

### Test Users
Create test accounts to verify multi-user functionality:
1. Register multiple users
2. Test cross-user messaging
3. Verify notification delivery
4. Test file sharing between users

## 🌟 Future Enhancements

### Potential Features
- **Voice Messages**: Audio message support
- **Video Calls**: WebRTC integration
- **Message Encryption**: End-to-end encryption
- **User Profiles**: Avatar and status customization
- **Message Threading**: Reply to specific messages
- **Admin Controls**: Room moderation features
- **Dark Mode**: Theme customization
- **Message Translation**: Multi-language support

### Technical Improvements
- **Redis Integration**: For horizontal scaling
- **Message Queuing**: For reliable message delivery
- **CDN Integration**: For file storage and delivery
- **Progressive Web App**: PWA capabilities
- **WebRTC**: For peer-to-peer communication
- **GraphQL**: For efficient data fetching

## 📄 API Documentation

### Authentication Endpoints
```
POST /api/register     - Register new user
POST /api/login        - User login
POST /api/guest-login  - Guest access
```

### File Upload
```
POST /upload           - Upload files
GET /uploads/:filename - Access uploaded files
```

### Chat Data
```
GET /api/room/:roomName/messages  - Get room history
GET /api/users/online             - Get online users
```

### Socket.io Events
```
// Client to Server
joinRoom           - Join a chat room
sendMessage        - Send a message
file_message       - Send file message
typing             - Start typing
stopTyping         - Stop typing
addReaction        - Add message reaction
privateMessage     - Send private message
createRoom         - Create new room
loadOlderMessages  - Load message history

// Server to Client
message            - New message received
userJoined         - User joined room
userLeft           - User left room
userTyping         - User is typing
userStoppedTyping  - User stopped typing
reactionUpdate     - Message reaction update
roomList           - Available rooms
userList           - Online users
roomUsers          - Room user count
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request


## 🙏 Acknowledgments

- Socket.io team for excellent real-time communication library
- MongoDB team for robust database solution
- React team for powerful UI library
- Tailwind CSS for utility-first styling approach

---

## 📞 Support

For support, please open an issue in the GitHub repository or contact the development team.

**Happy Chatting! 💬✨**