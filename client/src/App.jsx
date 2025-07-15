  import React, { useState, useEffect, useRef } from 'react';
  import { io } from 'socket.io-client';
  import { useTheme } from './ThemeContext.jsx';

  const ChatApp = () => {
    const { theme, toggleTheme, isDark } = useTheme();
    const [socket, setSocket] = useState(null);
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null);
    const [authMode, setAuthMode] = useState('login');
    const [authData, setAuthData] = useState({
      username: '',
      password: '',
      email: ''
    });
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [messages, setMessages] = useState({});
    const [message, setMessage] = useState('');
    const [onlineUsers, setOnlineUsers] = useState([]);
    const [typingUsers, setTypingUsers] = useState([]);
    const [privateChats, setPrivateChats] = useState([]);
    const [activeChat, setActiveChat] = useState('global');
    const [unreadCounts, setUnreadCounts] = useState({});
    const [chatRooms, setChatRooms] = useState([]);
    const [messageReactions, setMessageReactions] = useState({});
    const [activeRoom, setActiveRoom] = useState(null);
    const [newRoomName, setNewRoomName] = useState('');
    const [showCreateRoom, setShowCreateRoom] = useState(false);
    const [roomUsers, setRoomUsers] = useState({});
    const [selectedFile, setSelectedFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [authError, setAuthError] = useState('');
    const [loading, setLoading] = useState(false);
    const [hasJoinedRoom, setHasJoinedRoom] = useState(false);
    const messagesEndRef = useRef(null);
    const typingTimeoutRef = useRef(null);
    const fileInputRef = useRef(null);
    const [notificationsEnabled, setNotificationsEnabled] = useState(true);
    const [notificationPermission, setNotificationPermission] = useState(false);
    const [messageLimit, setMessageLimit] = useState(50);
    const [loadingOlderMessages, setLoadingOlderMessages] = useState(false);
    const [hasMoreMessages, setHasMoreMessages] = useState(true);
    const [connectionStatus, setConnectionStatus] = useState('connected');
    const [reconnectAttempts, setReconnectAttempts] = useState(0);
    const [searchQuery, setSearchQuery] = useState('');
const [searchResults, setSearchResults] = useState([]);
const [isSearching, setIsSearching] = useState(false);  
const [pendingMessages, setPendingMessages] = useState(new Map());
    const scrollToBottom = () => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
      scrollToBottom();
    }, [messages, activeChat, activeRoom]);

    // Request notification permission on component mount
    useEffect(() => {
      if ('Notification' in window) {
        Notification.requestPermission().then(permission => {
          setNotificationPermission(permission === 'granted');
        });
      }
    }, []);

    const playNotificationSound = () => {
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmsdBTuHzvHchjMGHm678+yOPwkRV67p8LNlHgg2jdX3zoNMAy2DyvLZiTYIG2m98+OaOAcYabLn8blTEAw+oOHswWUjBjqBzvHehjQHHmu79+yOPwkRV67p8LNlHgg2jdX3zoNMAy2DyvLZiTYIG2m98+OaOAcYabLn8blTEAw+oOHswWUjBjqBzvHehjQHHmu79+yOPwkRV67p8LNlHgg2jdX3zoNMAy2DyvLZiTYIG2m98+OaOA==');
      audio.play().catch(e => console.log('Audio play failed:', e));
    };

    const showBrowserNotification = (title, body, icon) => {
      if (notificationPermission && document.hidden && notificationsEnabled) {
        new Notification(title, {
          body: body,
          icon: icon || '/favicon.ico',
          badge: '/favicon.ico'
        });
      }
      };
    const searchMessages = (query) => {
      if (!query.trim()) {
        setSearchResults([]);
        return;
      }
      
      setIsSearching(true);
      const currentMessages = getCurrentMessages();
      const results = currentMessages.filter(msg => 
        msg.message && msg.message.toLowerCase().includes(query.toLowerCase())
      );
    setSearchResults(results);
    setIsSearching(false);
  };
    const handleAuth = async (e) => {
      e.preventDefault();
      setLoading(true);
      setAuthError('');

      try {
        let endpoint = '/api/login';
        let payload = { username: authData.username, password: authData.password };

        if (authMode === 'register') {
          endpoint = '/api/register';
          payload.email = authData.email;
        } else if (authMode === 'guest') {
          endpoint = '/api/guest-login';
          payload = { username: authData.username };
        }

        const response = await fetch(`https://week-5-web-sockets-assignment-meirsof101.onrender.com${endpoint}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (response.ok) {
          setToken(data.token);
          setUser(data.user);
          setIsAuthenticated(true);
          connectSocket(data.token);
        } else {
          setAuthError(data.error || 'Authentication failed');
        }
      } catch (error) {
        setAuthError('Network error. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    const connectSocket = (authToken) => {
      const newSocket = io('https://week-5-web-sockets-assignment-meirsof101.onrender.com', {
        auth: { token: authToken },
        transports: ['websocket', 'polling']
      });

      setSocket(newSocket);

      newSocket.on('message', (data) => {
        setMessages(prev => ({
          ...prev,
          [data.room || 'general']: [...(prev[data.room || 'general'] || []), data]
        }));
        newSocket.on('olderMessages', (data) => {
      const { room, messages, hasMore } = data;
      setMessages(prev => ({
        ...prev,
        [room]: [...messages, ...(prev[room] || [])]
      }));
      setHasMoreMessages(hasMore);
      setLoadingOlderMessages(false);
    });
        newSocket.on('roomHistory', (data) => {
      setMessages(prev => ({
        ...prev,
        [data.room]: data.messages
      }));
    });
        // Handle notifications for new messages
        if (data.sender && user && data.sender !== user.username) {
          playNotificationSound();
          showBrowserNotification(
            `New message from ${data.sender}`,
            data.message,
            '/user-icon.png'
          );
        }
      });

      newSocket.on('privateMessage', (data) => {
        const chatId = data.sender === user?.username ? data.receiver : data.sender;
        setMessages(prev => ({
          ...prev,
          [chatId]: [...(prev[chatId] || []), data]
        }));

        setPrivateChats(prev => {
          if (!prev.includes(chatId)) {
            return [...prev, chatId];
          }
          return prev;
        });

        if (activeChat !== chatId) {
          setUnreadCounts(prev => ({
            ...prev,
            [chatId]: (prev[chatId] || 0) + 1
          }));
        }

        // Handle notifications for private messages
        if (data.sender && user && data.sender !== user.username) {
          playNotificationSound();
          showBrowserNotification(
            `Private message from ${data.sender}`,
            data.message,
            '/user-icon.png'
          );
        }
      });

      newSocket.on('roomJoined', (data) => {
        setActiveRoom(data.room);
        setActiveChat('global');
        setHasJoinedRoom(true);
        setMessages(prev => ({
          ...prev,
          [data.room]: [...(prev[data.room] || []), {
            type: 'notification',
            message: data.message,
            timestamp: new Date().toISOString()
          }]
        }));
      });

      newSocket.on('reactionUpdate', (data) => {
        setMessageReactions(prev => ({
          ...prev,
          [data.messageId]: data.reactions
        }));
      });

      newSocket.on('userList', (users) => {
        setOnlineUsers(users);
      });

      newSocket.on('roomUsers', (data) => {
        setRoomUsers(data);
      });

      newSocket.on('userTyping', (data) => {
        setTypingUsers(prev => {
          if (!prev.includes(data.username)) {
            return [...prev, data.username];
          }
          return prev;
        });
      });

      newSocket.on('userStoppedTyping', (data) => {
        setTypingUsers(prev => prev.filter(user => user !== data.username));
      });

      newSocket.on('userJoined', (data) => {
        setMessages(prev => ({
          ...prev,
          [data.room || 'general']: [...(prev[data.room || 'general'] || []), {
            type: 'notification',
            message: `${data.username} joined the room`,
            timestamp: new Date().toISOString()
          }]
        }));
        
        showBrowserNotification(
          'User Joined',
          `${data.username} joined the chat`,
          '/user-icon.png'
        );
      });

      newSocket.on('userLeft', (data) => {
        setMessages(prev => ({
          ...prev,
          [data.room || 'general']: [...(prev[data.room || 'general'] || []), {
            type: 'notification',
            message: `${data.username} left the room`,
            timestamp: new Date().toISOString()
          }]
        }));
        
        showBrowserNotification(
          'User Left',
          `${data.username} left the chat`,
          '/user-icon.png'
        );
      });
      newSocket.on('disconnect', () => {
        setConnectionStatus('disconnected');
      });

      newSocket.on('reconnect', () => {
        setConnectionStatus('connected');
        setReconnectAttempts(0);
      });

      newSocket.on('reconnect_attempt', (attemptNumber) => {
        setConnectionStatus('reconnecting');
        setReconnectAttempts(attemptNumber);
      });

      newSocket.on('reconnect_failed', () => {
        setConnectionStatus('failed');
      });
            newSocket.on('roomList', (rooms) => {
        setChatRooms(rooms);
      });

      newSocket.on('roomCreated', (data) => {
        if (activeRoom) {
          setMessages(prev => ({
            ...prev,
            [activeRoom]: [...(prev[activeRoom] || []), {
              type: 'notification',
              message: `Room #${data.roomName} created by ${data.creator}`,
              timestamp: new Date().toISOString()
            }]
          }));
        }
      });
      newSocket.on('connect', () => {
  setConnectionStatus('connected');
  setReconnectAttempts(0);
});

      // Handle message read receipts
      newSocket.on('messageRead', (data) => {
        setReadReceipts(prev => ({
          ...prev,
          [data.messageId]: [...(prev[data.messageId] || []), {
            username: data.username,
            readAt: data.readAt
          }]
        }));
      });

      // Handle read receipts response
      newSocket.on('readReceipts', (data) => {
        setReadReceipts(prev => ({
          ...prev,
          [data.messageId]: data.receipts
        }));
      });

      // Handle theme updates
      newSocket.on('themeUpdated', (data) => {
        // Theme is handled by ThemeContext
      });


      return () => {
        newSocket.disconnect();
      };
    };

    const handleJoinRoom = (roomName) => {
      if (socket && roomName) {
        socket.emit('joinRoom', { roomName });
      }
    };

    const handleFileUpload = async (file) => {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', file);
      
      try {
        const response = await fetch('http://localhost:5000/upload', {
          method: 'POST',
          body: formData
        });
        
        const fileData = await response.json();
        
        socket.emit('file_message', {
          file: fileData,
          room: activeRoom
        });
        
        setSelectedFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } catch (error) {
        console.error('File upload failed:', error);
      } finally {
        setUploading(false);
      }
    };

    const handleFileSelect = (e) => {
      const file = e.target.files[0];
      if (file) {
        handleFileUpload(file);
      }
    };

    const handleReaction = (messageId, emoji) => {
      if (socket && activeRoom) {
        socket.emit('addReaction', {
          messageId,
          emoji,
          room: activeRoom
        });
      }
    };

const sendMessage = () => {
  if (message.trim() && socket) {
    const messageId = `${Date.now()}_${Math.random()}`;
    const messageData = {
      id: messageId,
      message,
      username: user?.username,
      timestamp: new Date().toISOString(),
      status: 'sending'
    };

    if (activeChat === 'global') {
      socket.emit('sendMessage', { 
        ...messageData,
        room: activeRoom 
      }, (acknowledgment) => {
        if (acknowledgment.success) {
          setPendingMessages(prev => {
            const newMap = new Map(prev);
            newMap.delete(messageId);
            return newMap;
          });
        }
      });
    } else {
      socket.emit('privateMessage', {
        ...messageData,
        receiver: activeChat
      }, (acknowledgment) => {
        if (acknowledgment.success) {
          setPendingMessages(prev => {
            const newMap = new Map(prev);
            newMap.delete(messageId);
            return newMap;
          });
        }
      });
    }

    setPendingMessages(prev => new Map(prev).set(messageId, messageData));
    setMessage('');
  }
};

    const handleTyping = (e) => {
      setMessage(e.target.value);
      
      if (socket && activeChat === 'global' && activeRoom) {
        socket.emit('typing', { username: user?.username, room: activeRoom });
        
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
          socket.emit('stopTyping', { username: user?.username, room: activeRoom });
        }, 1000);
      }
    };

    const startPrivateChat = (targetUser) => {
      if (targetUser !== user?.username) {
        setActiveChat(targetUser);
        if (!privateChats.includes(targetUser)) {
          setPrivateChats(prev => [...prev, targetUser]);
        }
      }
    };

    // Update unread count when messages arrive
    const updateUnreadCount = (roomOrUser) => {
      if (document.hidden) { // Only count if window is not active
        setUnreadCounts(prev => ({
          ...prev,
          [roomOrUser]: (prev[roomOrUser] || 0) + 1
        }));
      }
    };

    // Clear unread count when user switches to a room/chat
    const clearUnreadCount = (roomOrUser) => {
      setUnreadCounts(prev => ({
        ...prev,
        [roomOrUser]: 0
      }));
    };

    // Update document title with total unread count
    useEffect(() => {
      const totalUnread = Object.values(unreadCounts).reduce((sum, count) => sum + count, 0);
      document.title = totalUnread > 0 ? `(${totalUnread}) Chat App` : 'Chat App';
    }, [unreadCounts]);

    const createRoom = () => {
      if (newRoomName.trim() && socket) {
        socket.emit('createRoom', { roomName: newRoomName, creator: user?.username });
        setNewRoomName('');
        setShowCreateRoom(false);
      }
    };

    const logout = () => {
      setToken(null);
      setUser(null);
      setIsAuthenticated(false);
      setHasJoinedRoom(false);
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      setMessages({});
      setActiveRoom(null);
      setActiveChat('global');
      setPrivateChats([]);
      setOnlineUsers([]);
      setTypingUsers([]);
      setUnreadCounts({});
      setChatRooms([]);
      setMessageReactions({});
      setRoomUsers({});
      setAuthData({ username: '', password: '', email: '' });
      setAuthError('');
    };

    const getCurrentMessages = () => {
      if (activeChat === 'global') {
        return messages[activeRoom] || [];
      }
      return messages[activeChat] || [];
    };

    const getCurrentTypingUsers = () => {
      if (activeChat === 'global') {
        return typingUsers.filter(u => u !== user?.username);
      }
      return [];
    };
    const loadOlderMessages = () => {
      if (socket && !loadingOlderMessages && hasMoreMessages) {
        setLoadingOlderMessages(true);
        socket.emit('loadOlderMessages', {
          room: activeChat === 'global' ? activeRoom : activeChat,
          offset: getCurrentMessages().length,
          limit: 50
        });
      }
    };
    const formatTime = (timestamp) => {
      return new Date(timestamp).toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    };

   const renderMessage = (msg, index) => {
    const messageId = msg.id || `${msg.timestamp}_${index}`;
    const reactions = messageReactions[messageId] || {};
    const messageReadReceipts = readReceipts[messageId] || [];
    const isAI = msg.username === 'ChatGPT Bot' || msg.type === 'ai';

      if (msg.type === 'notification') {
        return (
          <div key={index} className="flex justify-center my-2">
            <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
              {msg.message}
            </span>
          </div>
        );
      }
      if (msg.type === 'file') {
        const isOwnMessage = msg.username === user?.username || msg.sender === user?.username;
        
        return (
          <div key={index} className="mb-4 p-3 bg-white rounded-lg shadow">
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-blue-600">{msg.username}</span>
              <span className="text-xs text-gray-500">{formatTime(msg.timestamp)}</span>
            </div>
            <div className="bg-gray-50 p-3 rounded border">
              <div className="flex items-center space-x-2">
                <span className="text-2xl">📎</span>
                <div>
                  <p className="font-medium">{msg.file.originalname}</p>
                  <p className="text-sm text-gray-500">{(msg.file.size / 1024).toFixed(1)} KB</p>
                </div>
              </div>
              <a 
                href={`http://localhost:5000${msg.file.url}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="mt-2 inline-block bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600 transition-colors"
              >
                Download
              </a>
            </div>
            <div className="flex items-center space-x-2 mt-2">
              {['👍', '❤️', '😂', '😮', '😢', '😡'].map(emoji => (
                <button
                  key={emoji}
                  onClick={() => handleReaction(messageId, emoji)}
                  className="text-sm hover:scale-110 transition-transform"
                >
                  {emoji} {reactions[emoji]?.length || 0}
                </button>
              ))}
            </div>
          </div>
        );
      }

      const isOwnMessage = msg.username === user?.username || msg.sender === user?.username;
      
      return (
        <div key={index} className={`mb-4 ${isOwnMessage ? 'text-right' : 'text-left'}`}>
          <div className={`inline-block max-w-xs lg:max-w-md p-3 rounded-lg ${
            isOwnMessage 
              ? 'bg-blue-500 text-white' 
              : 'bg-gray-200 text-gray-800'
          }`}>
            <div className="font-semibold text-sm mb-1">
              {msg.username || msg.sender}
            </div>
            <div className="break-words">{msg.message}</div>
            <div className="text-xs opacity-75 mt-1">
              {formatTime(msg.timestamp)}
            </div>
          </div>
          <div className="flex items-center space-x-2 mt-1 justify-center">
            {['👍', '❤️', '😂', '😮', '😢', '😡'].map(emoji => (
              <button
                key={emoji}
                onClick={() => handleReaction(messageId, emoji)}
                className="text-sm hover:scale-110 transition-transform"
              >
                {emoji} {reactions[emoji]?.length || 0}
              </button>
            ))}
          </div>
        </div>
      );
    };

  // Authentication Screen
  if (!isAuthenticated) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-4 ${
        isDark 
          ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-black'
          : 'bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500'
      }`}>
        <div className={`backdrop-blur-lg rounded-2xl p-8 shadow-2xl border w-full max-w-md ${
          isDark 
            ? 'bg-gray-800/90 border-gray-600'
            : 'bg-white/10 border-white/20'
        }`}>
          <div className="text-center">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-4xl font-bold text-white">💬 Advanced Chat</h1>
              <button
                onClick={handleThemeChange}
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
              >
                {isDark ? '☀️' : '🌙'}
              </button>
            </div>
            <p className="text-white/80 mb-8">Secure real-time messaging</p>
            
            {/* Auth Mode Selector */}
            <div className="flex space-x-1 mb-6 bg-white/10 rounded-lg p-1">
              {['login', 'register', 'guest'].map((mode) => (
                <button
                  key={mode}
                  onClick={() => setAuthMode(mode)}
                  className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                    authMode === mode
                      ? 'bg-white text-blue-600'
                      : 'text-white/70 hover:text-white'
                  }`}
                >
                  {mode.charAt(0).toUpperCase() + mode.slice(1)}
                </button>
              ))}
            </div>

            <form onSubmit={handleAuth} className="space-y-4">
              <div>
                <input
                  type="text"
                  placeholder="Username"
                  value={authData.username}
                  onChange={(e) => setAuthData({ ...authData, username: e.target.value })}
                  autoComplete="username"
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/30"
                  required
                />
              </div>
              
              {authMode !== 'guest' && (
                <div>
                  <input
                    type="password"
                    placeholder="Password"
                    value={authData.password}
                    onChange={(e) => setAuthData({ ...authData, password: e.target.value })}
                    autoComplete={authMode === 'login' ? 'current-password' : 'new-password'}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/30"
                    required
                  />
                </div>
              )}
              
              {authMode === 'register' && (
                <div>
                  <input
                    type="email"
                    placeholder="Email"
                    value={authData.email}
                    onChange={(e) => setAuthData({ ...authData, email: e.target.value })}
                    autoComplete="email"
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/30"
                    required
                  />
                </div>
              )}

              {authError && (
                <div className="text-red-300 text-sm bg-red-500/20 p-3 rounded-lg">
                  {authError}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-white text-blue-600 rounded-lg font-semibold hover:bg-white/90 transition-colors disabled:opacity-50"
              >
                {loading ? 'Please wait...' : 
                  authMode === 'login' ? 'Sign In' :
                  authMode === 'register' ? 'Create Account' :
                  'Join as Guest'
                }
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }
    // Room Selection Screen (shown after authentication but before joining a room)
    if (isAuthenticated && !hasJoinedRoom) {
      return (
        <div className={`min-h-screen flex items-center justify-center p-4 ${
          isDark 
            ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-black'
            : 'bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500'
        }`}>
          <div className={`backdrop-blur-lg rounded-2xl p-8 shadow-2xl border w-full max-w-md ${
            isDark 
              ? 'bg-gray-800/90 border-gray-600'
              : 'bg-white/10 border-white/20'
          }`}>
            <div className="text-center">
              <div className="flex items-center justify-between mb-6">
                <h1 className="text-3xl font-bold text-white">Welcome, {user?.username}!</h1>
                <button
                  onClick={handleThemeChange}
                  className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                >
                  {isDark ? '☀️' : '🌙'}
                </button>
              </div>
              <p className="text-white/80 mb-6">Choose a room to start chatting</p>
              
              {/* Room List */}
              <div className="space-y-3 mb-6">
                {chatRooms.map((room) => (
                  <button
                    key={room}
                    onClick={() => handleJoinRoom(room)}
                    className="w-full p-4 bg-white/10 border border-white/20 rounded-lg text-white hover:bg-white/20 transition-colors text-left"
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-semibold">#{room}</div>
                        <div className="text-sm text-white/70">
                          {roomUsers[room] || 0} users online
                        </div>
                      </div>
                      <div className="text-2xl">
                        {room === 'general' ? '🌐' : 
                        room === 'random' ? '🎲' : 
                        room === 'tech' ? '💻' : '💬'}
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              {/* Create Room */}
              <div className="border-t border-white/20 pt-4">
                {showCreateRoom ? (
                  <div className="space-y-3">
                    <input
                      type="text"
                      placeholder="Room name"
                      value={newRoomName}
                      onChange={(e) => setNewRoomName(e.target.value)}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/30"
                    />
                    <div className="flex space-x-2">
                      <button
                        onClick={createRoom}
                        className="flex-1 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                      >
                        Create
                      </button>
                      <button
                        onClick={() => setShowCreateRoom(false)}
                        className="flex-1 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowCreateRoom(true)}
                    className="w-full py-3 bg-white/10 border border-white/20 rounded-lg text-white hover:bg-white/20 transition-colors"
                  >
                    ➕ Create New Room
                  </button>
                )}
              </div>

              {/* Logout */}
              <button
                onClick={logout}
                className="mt-4 text-white/70 hover:text-white transition-colors text-sm"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      );
    }

    // Main Chat Interface
    return (
      <div className="h-screen bg-gray-100 flex">
        {/* Sidebar */}
        <div className="w-80 bg-white shadow-lg flex flex-col">
          {/* Header */}
          <div className="p-4 border-b bg-gradient-to-r from-blue-500 to-purple-600 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
                  {user?.username?.[0]?.toUpperCase()}
                </div>
                <div>
                  <h3 className={`font-semibold ${
                    isDark ? 'text-white' : 'text-gray-900'
                  }`}>
                    {user?.username}
                  </h3>
                  <div className="flex items-center space-x-2 text-sm">
                    <div className={`w-2 h-2 rounded-full ${
                      connectionStatus === 'connected' ? 'bg-green-500' : 
                      connectionStatus === 'reconnecting' ? 'bg-yellow-500' : 'bg-red-500'
                    }`}></div>
                    <span className={`${
                      isDark ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      {connectionStatus === 'connected' ? 'Online' :
                      connectionStatus === 'reconnecting' ? 'Reconnecting...' :
                      'Offline'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setNotificationsEnabled(!notificationsEnabled)}
                  className={`p-2 rounded-lg transition-colors ${
                    isDark 
                      ? 'hover:bg-gray-700 text-gray-400 hover:text-white' 
                      : 'hover:bg-gray-100 text-gray-500 hover:text-gray-700'
                  }`}
                  title="Toggle notifications"
                >
                  {notificationsEnabled ? '🔔' : '🔕'}
                </button>
                <button
                  onClick={handleThemeChange}
                  className={`p-2 rounded-lg transition-colors ${
                    isDark 
                      ? 'hover:bg-gray-700 text-gray-400 hover:text-white' 
                      : 'hover:bg-gray-100 text-gray-500 hover:text-gray-700'
                  }`}
                  title="Toggle theme"
                >
                  {isDark ? '☀️' : '🌙'}
                </button>
                <button
                  onClick={logout}
                  className={`p-2 rounded-lg transition-colors ${
                    isDark 
                      ? 'hover:bg-gray-700 text-gray-400 hover:text-white' 
                      : 'hover:bg-gray-100 text-gray-500 hover:text-gray-700'
                  }`}
                  title="Logout"
                >
                  🚪
                </button>
              </div>
            </div>
          </div>

          {/* Search */}
          <div className="p-4">
            <div className="relative">
              <input
                type="text"
                placeholder="Search messages..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  searchMessages(e.target.value);
                }}
                className={`w-full px-4 py-3 rounded-xl border-2 transition-all ${
                  isDark 
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500' 
                    : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-500 focus:border-blue-500'
                } focus:outline-none focus:ring-0`}
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              {searchResults.length > 0 && (
                <div className={`absolute top-full left-0 right-0 mt-1 rounded-xl shadow-lg max-h-60 overflow-y-auto z-10 ${
                  isDark ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'
                } border`}>
                  {searchResults.map((msg, index) => (
                    <div key={index} className={`p-3 hover:bg-gray-100 border-b ${
                      isDark ? 'hover:bg-gray-600 border-gray-600' : 'border-gray-100'
                    }`}>
                      <div className="text-sm font-medium">{msg.username}</div>
                      <div className="text-sm text-gray-500">{msg.message}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setNotificationsEnabled(!notificationsEnabled)}
                  className="text-white/80 hover:text-white transition-colors text-sm"
                >
                  {notificationsEnabled ? '🔔' : '🔕'}
                </button>
                <button
                  onClick={logout}
                  className="text-white/80 hover:text-white transition-colors"
                >
                  🚪
                </button>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${
                connectionStatus === 'connected' ? 'bg-green-500' : 
                connectionStatus === 'reconnecting' ? 'bg-yellow-500' : 'bg-red-500'
              }`}></div>
              <span className="text-sm text-gray-600">
                {connectionStatus === 'connected' ? 'Connected' :
                connectionStatus === 'reconnecting' ? `Reconnecting... (${reconnectAttempts})` :
                connectionStatus === 'failed' ? 'Connection failed' : 'Disconnected'}
              </span>
            </div>
          </div>

          {/* Chat List */}
          <div className="flex-1 overflow-y-auto">
            {/* Room Section */}
            <div className="p-4 border-b">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-gray-700">Rooms</h2>
                <button
                  onClick={() => setShowCreateRoom(true)}
                  className="text-blue-500 hover:text-blue-600 text-sm"
                >
                  ➕
                </button>
              </div>
              
              {/* Current Room */}
              {activeRoom && (
                <div className="mb-2 p-2 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center justify-between">
                    <div className="font-medium text-blue-700">#{activeRoom}</div>
                    <div className="text-sm text-blue-600">
                      {roomUsers[activeRoom] || 0} users
                    </div>
                  </div>
                </div>
              )}

              {/* Switch Room */}
              <button
                onClick={() => setHasJoinedRoom(false)}
                className="w-full p-2 text-left text-sm text-gray-600 hover:bg-gray-50 rounded"
              >
                🔄 Switch Room
              </button>
            </div>

            {/* Private Chats */}
            <div className="p-4 border-b">
              <h2 className="font-semibold text-gray-700 mb-3">Private Chats</h2>
              <div className="space-y-1">
                {privateChats.map((chat) => (
                  <button
                    key={chat}
                    onClick={() => setActiveChat(chat)}
                    className={`w-full p-3 rounded-xl transition-all text-left ${
                      activeChat === chat
                        ? 'bg-blue-100 text-blue-700'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-green-500 to-blue-500 flex items-center justify-center text-white font-bold text-sm">
                          {chat[0]?.toUpperCase()}
                        </div>
                        <span className={`font-medium ${
                          isDark ? 'text-white' : 'text-gray-900'
                        }`}>
                          {chat}
                        </span>
                      </div>
                      {unreadCounts[chat] > 0 && (
                        <span className="bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs rounded-full px-2 py-1 font-medium">
                          {unreadCounts[chat]}
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Online Users */}
            <div className="p-4">
              <h2 className="font-semibold text-gray-700 mb-3">
                Online Users ({onlineUsers.length})
              </h2>
              <div className="space-y-2">
                {onlineUsers.map((username) => (
                  <div
                    key={username}
                    className="flex items-center justify-between p-2 hover:bg-gray-50 rounded cursor-pointer"
                    onClick={() => startPrivateChat(username)}
                  >
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className={username === user?.username ? 'font-semibold' : ''}>
                        {username}
                      </span>
                    </div>
                    {username !== user?.username && (
                      <button className="text-blue-500 hover:text-blue-600 text-sm">
                        💬
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      );
    }

    {/* Main Chat Area */}
    <div className="flex-1 flex flex-col">
      {/* Chat Header */}
      <div className="p-4 border-b bg-white">
        <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-gray-800">
                  {activeChat === 'global' ? `#${activeRoom}` : `Chat with ${activeChat}`}
                </h2>
                {activeChat === 'global' && (
                  <p className="text-sm text-gray-600">
                    {roomUsers[activeRoom] || 0} users online
                  </p>
                )}
              </div>
              <button
                onClick={() => setActiveChat('global')}
                className={`px-3 py-1 rounded text-sm ${
                  activeChat === 'global'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Back to Room
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {hasMoreMessages && (
              <div className="text-center py-2">
                <button
                  onClick={loadOlderMessages}
                  disabled={loadingOlderMessages}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                >
                  {loadingOlderMessages ? 'Loading...' : 'Load Older Messages'}
                </button>
              </div>
            )}
            {getCurrentMessages().map((msg, index) => renderMessage(msg, index))}
            
            {/* Typing Indicator */}
            {getCurrentTypingUsers().length > 0 && (
              <div className="text-sm text-gray-500 italic">
                {getCurrentTypingUsers().join(', ')} {getCurrentTypingUsers().length === 1 ? 'is' : 'are'} typing...
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input */}
          <div className="p-4 border-t bg-white">
            <div className="flex items-center space-x-2">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                className="hidden"
                accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="p-2 text-gray-500 hover:text-gray-700 disabled:opacity-50"
              >
                {uploading ? '⏳' : '📎'}
              </button>
              <input
                type="text"
                value={message}
                onChange={handleTyping}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                placeholder={`Message ${activeChat === 'global' ? `#${activeRoom}` : activeChat}`}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={sendMessage}
                disabled={!message.trim()}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Send
              </button>
            </div>
          </div>
        </div>

        {/* Read Receipts Modal */}
        {showReadReceipts && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className={`p-6 rounded-lg shadow-xl max-w-md w-full m-4 ${
              isDark ? 'bg-gray-800' : 'bg-white'
            }`}>
              <div className="flex justify-between items-center mb-4">
                <h3 className={`text-lg font-semibold ${
                  isDark ? 'text-gray-200' : 'text-gray-800'
                }`}>
                  Read by ({readReceipts[selectedMessageId]?.length || 0})
                </h3>
                <button
                  onClick={() => setShowReadReceipts(false)}
                  className={`text-gray-400 hover:text-gray-600 ${
                    isDark ? 'hover:text-gray-200' : ''
                  }`}
                >
                  ✕
                </button>
              </div>
              <div className="max-h-64 overflow-y-auto">
                {readReceipts[selectedMessageId]?.map((receipt, index) => (
                  <div key={index} className={`flex items-center justify-between py-2 ${
                    isDark ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    <span>{receipt.username}</span>
                    <span className={`text-xs ${
                      isDark ? 'text-gray-400' : 'text-gray-500'
                    }`}>
                      {formatTime(receipt.readAt)}
                    </span>
                  </div>
                )) || (
                  <p className={`text-center py-4 ${
                    isDark ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                    No read receipts yet
                  </p>
                )}
              </div>
            </div>
          </div>
        )};


export default ChatApp;