# 🚀 Advanced Real-Time Chat Application

A full-stack real-time chat application built with the MERN stack, enhanced with Socket.IO for instant messaging, OpenAI integration, and modern UI features.

## ✨ Features

### Core Features
- **🔐 User Authentication** - JWT-based authentication with login, register, and guest modes
- **💬 Real-time Messaging** - Instant messaging via Socket.IO with automatic reconnection
- **🏢 Group Chats** - Multiple chat rooms with dynamic room creation
- **👥 Private Messages** - One-on-one messaging with unread indicators
- **📚 Message History** - Persistent message storage with pagination
- **⌨️ Typing Indicators** - Real-time typing status with timeout detection
- **🔔 Notifications** - Browser notifications and sound alerts
- **📎 File Sharing** - Upload and share images, documents, and media files
- **😊 Message Reactions** - React to messages with emojis
- **🔍 Message Search** - Search through chat history

### 🔥 Enhanced Features
- **🤖 ChatGPT Integration** - AI assistant in group chats (mention @chatgpt)
- **👁️ Read Receipts** - See who has read your messages
- **🌙 Dark/Light Mode** - Toggle between themes with system preference detection
- **📱 Responsive Design** - Works seamlessly on desktop and mobile
- **🔌 Connection Status** - Real-time connection indicators
- **⚡ Auto-reconnection** - Automatic reconnection with retry counter
- **🎨 Modern UI** - Beautiful gradients and animations

## 🛠️ Tech Stack

### Frontend
- **React 18** - Modern React with hooks
- **Vite** - Lightning-fast build tool
- **Tailwind CSS** - Utility-first CSS framework
- **Socket.IO Client** - Real-time WebSocket client

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web application framework
- **Socket.IO** - Real-time bidirectional communication
- **MongoDB** - NoSQL database
- **Mongoose** - MongoDB object modeling

### Security & Authentication
- **JWT** - JSON Web Tokens for authentication
- **bcryptjs** - Password hashing
- **CORS** - Cross-Origin Resource Sharing

### AI Integration
- **OpenAI API** - ChatGPT integration for AI responses

## 🚀 Quick Start

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (local or Atlas)
- OpenAI API key (for ChatGPT features)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd advanced-chat-app
   ```

2. **Install dependencies**
   ```bash
   # Install root dependencies
   npm install
   
   # Install server dependencies
   cd server
   npm install
   
   # Install client dependencies
   cd ../client
   npm install
   ```

3. **Environment Setup**
   ```bash
   # In the server directory
   cp .env.example .env
   ```
   
   Edit the `.env` file with your configuration:
   ```env
   MONGO_URI=mongodb://localhost:27017/chat-app
   JWT_SECRET=your-super-secure-jwt-secret-key-here
   OPENAI_API_KEY=your-openai-api-key-here
   PORT=5000
   NODE_ENV=development
   ```

4. **Start the application**
   ```bash
   # From the root directory
   npm run dev
   ```

   This will start:
   - Server on http://localhost:5000
   - Client on http://localhost:5173

## 🎯 Usage

### Basic Chat
1. **Register/Login** - Create an account or join as guest
2. **Join Room** - Select from available rooms or create new ones
3. **Start Chatting** - Send messages, files, and reactions
4. **Private Messages** - Click on users to start private conversations

### Advanced Features
- **AI Assistant** - Type `@chatgpt` or mention `chatgpt` in your message
- **Read Receipts** - Click the 👁️ icon to see who read your message
- **Dark Mode** - Toggle with the 🌙/☀️ button
- **File Sharing** - Use the 📎 button to attach files
- **Message Search** - Use the search bar to find specific messages

## 🏗️ Architecture

### Database Schema

**Users Collection:**
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

**Messages Collection:**
```javascript
{
  username: String,
  message: String,
  room: String,
  type: String ('text' | 'file' | 'ai'),
  file: {
    filename: String,
    originalname: String,
    size: Number,
    mimetype: String,
    url: String
  },
  timestamp: Date,
  readBy: [{
    userId: ObjectId,
    username: String,
    readAt: Date
  }]
}
```

**Read Receipts Collection:**
```javascript
{
  messageId: ObjectId,
  userId: ObjectId,
  username: String,
  room: String,
  readAt: Date
}
```

### API Endpoints

#### Authentication
- `POST /api/register` - User registration
- `POST /api/login` - User login
- `POST /api/guest-login` - Guest login

#### Messaging
- `GET /api/room/:roomName/messages` - Get room messages
- `POST /upload` - File upload
- `GET /api/message/:messageId/receipts` - Get read receipts

#### User Management
- `GET /api/users/online` - Get online users
- `PUT /api/user/theme` - Update user theme

### Socket.IO Events

#### Client → Server
- `joinRoom` - Join a chat room
- `createRoom` - Create new room
- `sendMessage` - Send text message
- `file_message` - Send file message
- `markMessageAsRead` - Mark message as read
- `addReaction` - Add emoji reaction
- `privateMessage` - Send private message
- `typing` / `stopTyping` - Typing indicators
- `updateTheme` - Update user theme

#### Server → Client
- `message` - New message received
- `messageRead` - Message read receipt
- `readReceipts` - Read receipts data
- `privateMessage` - Private message received
- `roomJoined` - Room join confirmation
- `roomHistory` - Room message history
- `userList` - Online users update
- `userTyping` / `userStoppedTyping` - Typing indicators
- `reactionUpdate` - Reaction update

## 🔧 Development

### Project Structure
```
/
├── client/              # React frontend
│   ├── src/
│   │   ├── App.jsx      # Main application component
│   │   ├── ThemeContext.jsx  # Theme management
│   │   └── main.jsx     # Application entry point
│   └── package.json
├── server/              # Node.js backend
│   ├── models/          # Database models
│   ├── uploads/         # File uploads
│   ├── server.js        # Main server file
│   └── package.json
└── package.json         # Root package.json
```

### Key Components

#### Client
- **App.jsx** - Main application with chat interface
- **ThemeContext.jsx** - Theme management system
- **Responsive Design** - Mobile-first approach with Tailwind CSS

#### Server
- **server.js** - Express server with Socket.IO integration
- **Authentication** - JWT-based auth middleware
- **File Upload** - Multer for file handling
- **AI Integration** - OpenAI API for ChatGPT responses

## 🚀 Deployment

### Environment Variables
Set these in your production environment:

```env
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/chat-app
JWT_SECRET=your-production-jwt-secret
OPENAI_API_KEY=your-openai-api-key
PORT=5000
NODE_ENV=production
```

### Build Commands
```bash
# Build client
cd client
npm run build

# Server runs in production mode
cd server
npm start
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License.

## 🎉 Acknowledgments

- OpenAI for ChatGPT API
- Socket.IO for real-time communication
- MongoDB for data persistence
- Tailwind CSS for beautiful styling
- React team for the amazing framework

---

**🌟 Star this repository if you found it helpful!**