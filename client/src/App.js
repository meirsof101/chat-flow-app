import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import './App.css';

// Connect to the server
const socket = io(process.env.REACT_APP_SERVER_URL || 'http://localhost:5000');

function App() {
  const [username, setUsername] = useState('');
  const [isJoined, setIsJoined] = useState(false);
  const [messages, setMessages] = useState([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Connection event handlers
    socket.on('connect', () => {
      console.log('Connected to server');
      setIsConnected(true);
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from server');
      setIsConnected(false);
    });

    // Message event handlers
    socket.on('receive_message', (message) => {
      setMessages(prev => [...prev, message]);
    });

    socket.on('user_joined', (data) => {
      setMessages(prev => [...prev, {
        id: Date.now(),
        username: 'System',
        message: data.message,
        timestamp: new Date(),
        isSystem: true
      }]);
    });

    socket.on('user_left', (data) => {
      setMessages(prev => [...prev, {
        id: Date.now(),
        username: 'System',
        message: data.message,
        timestamp: new Date(),
        isSystem: true
      }]);
    });

    socket.on('online_users', (users) => {
      setOnlineUsers(users);
    });

    socket.on('users_update', (users) => {
      setOnlineUsers(users);
    });

    socket.on('user_typing', (data) => {
      if (data.isTyping) {
        setTypingUsers(prev => {
          if (!prev.includes(data.username)) {
            return [...prev, data.username];
          }
          return prev;
        });
      } else {
        setTypingUsers(prev => prev.filter(user => user !== data.username));
      }
    });

    // Cleanup on unmount
    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('receive_message');
      socket.off('user_joined');
      socket.off('user_left');
      socket.off('online_users');
      socket.off('users_update');
      socket.off('user_typing');
    };
  }, []);

  const joinChat = (e) => {
    e.preventDefault();
    if (username.trim()) {
      socket.emit('join', { username: username.trim() });
      setIsJoined(true);
    }
  };

  const sendMessage = (e) => {
    e.preventDefault();
    if (currentMessage.trim()) {
      socket.emit('send_message', { message: currentMessage.trim() });
      setCurrentMessage('');
      
      // Stop typing indicator
      socket.emit('typing', { isTyping: false });
    }
  };

  const handleTyping = (e) => {
    setCurrentMessage(e.target.value);
    
    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Send typing indicator
    socket.emit('typing', { isTyping: true });
    
    // Stop typing indicator after 2 seconds of no typing
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('typing', { isTyping: false });
    }, 2000);
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  if (!isJoined) {
    return (
      <div className="app">
        <div className="join-container">
          <div className="join-form">
            <h2>Join Chat</h2>
            <form onSubmit={joinChat}>
              <input
                type="text"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                maxLength={20}
                required
              />
              <button type="submit" disabled={!isConnected}>
                {isConnected ? 'Join Chat' : 'Connecting...'}
              </button>
            </form>
            <div className="connection-status">
              Status: {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <div className="chat-container">
        <div className="chat-header">
          <h2>Real-Time Chat</h2>
          <div className="header-info">
            <span className="username">Welcome, {username}!</span>
            <span className="connection-status">
              {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
            </span>
          </div>
        </div>

        <div className="chat-body">
          <div className="messages-container">
            <div className="messages">
              {messages.map((msg) => (
                <div 
                  key={msg.id} 
                  className={`message ${msg.isSystem ? 'system-message' : ''} ${msg.username === username ? 'own-message' : ''}`}
                >
                  {!msg.isSystem && (
                    <div className="message-header">
                      <span className="message-username">{msg.username}</span>
                      <span className="message-time">{formatTime(msg.timestamp)}</span>
                    </div>
                  )}
                  <div className="message-content">{msg.message}</div>
                </div>
              ))}
              
              {typingUsers.length > 0 && (
                <div className="typing-indicator">
                  {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          </div>

          <div className="online-users">
            <h3>Online Users ({onlineUsers.length})</h3>
            <ul>
              {onlineUsers.map((user) => (
                <li key={user.id} className={user.username === username ? 'current-user' : ''}>
                  🟢 {user.username}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <form className="message-form" onSubmit={sendMessage}>
          <input
            type="text"
            placeholder="Type a message..."
            value={currentMessage}
            onChange={handleTyping}
            disabled={!isConnected}
          />
          <button type="submit" disabled={!isConnected || !currentMessage.trim()}>
            Send
          </button>
        </form>
      </div>
    </div>
  );
}

export default App;