import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

const ChatApp = () => {
  const [socket, setSocket] = useState(null);
  const [username, setUsername] = useState('');
  const [isJoined, setIsJoined] = useState(false);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Join chat room
  const joinChat = (e) => {
    e.preventDefault();
    if (username.trim()) {
      const newSocket = io('http://localhost:5000');
      setSocket(newSocket);
      
      // Join with username
      newSocket.emit('join', username);
      
      // Listen for messages
      newSocket.on('message', (data) => {
        setMessages(prev => [...prev, data]);
      });
      
      // Listen for user list updates
      newSocket.on('userList', (users) => {
        setOnlineUsers(users);
      });
      
      // Listen for typing indicators
      newSocket.on('typing', (data) => {
        setTypingUsers(prev => {
          const filtered = prev.filter(user => user !== data.username);
          return data.isTyping ? [...filtered, data.username] : filtered;
        });
      });
      
      // Listen for user join/leave notifications
      newSocket.on('userJoined', (data) => {
        setMessages(prev => [...prev, {
          type: 'notification',
          text: `${data.username} joined the chat`,
          timestamp: new Date().toLocaleTimeString()
        }]);
      });
      
      newSocket.on('userLeft', (data) => {
        setMessages(prev => [...prev, {
          type: 'notification',
          text: `${data.username} left the chat`,
          timestamp: new Date().toLocaleTimeString()
        }]);
      });
      
      setIsJoined(true);
    }
  };

  // Send message
  const sendMessage = (e) => {
    e.preventDefault();
    if (newMessage.trim() && socket) {
      socket.emit('sendMessage', newMessage);
      setNewMessage('');
      
      // Stop typing indicator
      if (isTyping) {
        socket.emit('typing', { isTyping: false });
        setIsTyping(false);
      }
    }
  };

  // Handle typing
  const handleTyping = (e) => {
    setNewMessage(e.target.value);
    
    if (socket && e.target.value.length > 0) {
      if (!isTyping) {
        socket.emit('typing', { isTyping: true });
        setIsTyping(true);
      }
      
      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // Set new timeout to stop typing indicator
      typingTimeoutRef.current = setTimeout(() => {
        if (socket) {
          socket.emit('typing', { isTyping: false });
          setIsTyping(false);
        }
      }, 2000);
    } else if (isTyping && socket) {
      socket.emit('typing', { isTyping: false });
      setIsTyping(false);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (socket) {
        socket.disconnect();
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [socket]);

  // Login Screen
  if (!isJoined) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-2xl border border-white/20 max-w-md w-full">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">💬 Chat App</h1>
            <p className="text-white/80">Enter your username to join the conversation</p>
          </div>
          
          <div className="space-y-4">
            <div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                className="w-full p-4 bg-white/20 border border-white/30 rounded-xl text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                onKeyPress={(e) => e.key === 'Enter' && joinChat(e)}
              />
            </div>
            
            <button
              onClick={joinChat}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-500 text-white py-4 px-6 rounded-xl font-semibold hover:from-blue-600 hover:to-purple-600 transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              Join Chat
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Chat Interface
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex">
      {/* Sidebar - Online Users */}
      <div className="w-64 bg-black/20 backdrop-blur-lg border-r border-white/20 p-4">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-white mb-4">Online Users ({onlineUsers.length})</h2>
          <div className="space-y-2">
            {onlineUsers.map((user, index) => (
              <div key={index} className="flex items-center space-x-2 p-2 bg-white/10 rounded-lg">
                <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                <span className="text-white font-medium">{user}</span>
                {user === username && (
                  <span className="text-xs bg-blue-500 text-white px-2 py-1 rounded-full">You</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-black/20 backdrop-blur-lg border-b border-white/20 p-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-white">💬 Global Chat</h1>
            <div className="text-white/80">
              Welcome, <span className="font-semibold text-white">{username}</span>!
            </div>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 p-6 overflow-y-auto">
          <div className="space-y-4">
            {messages.map((message, index) => (
              <div key={index}>
                {message.type === 'notification' ? (
                  <div className="text-center">
                    <span className="bg-white/20 text-white/80 px-4 py-2 rounded-full text-sm">
                      {message.text}
                    </span>
                  </div>
                ) : (
                  <div className={`flex ${message.username === username ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-xs lg:max-w-md ${
                      message.username === username 
                        ? 'bg-gradient-to-r from-blue-500 to-purple-500' 
                        : 'bg-white/20 backdrop-blur-lg'
                    } rounded-2xl p-4 shadow-lg`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-semibold text-white">
                          {message.username}
                        </span>
                        <span className="text-xs text-white/70">
                          {message.timestamp}
                        </span>
                      </div>
                      <p className="text-white">{message.text}</p>
                    </div>
                  </div>
                )}
              </div>
            ))}
            
            {/* Typing Indicator */}
            {typingUsers.length > 0 && (
              <div className="flex justify-start">
                <div className="bg-white/20 backdrop-blur-lg rounded-2xl p-3 shadow-lg">
                  <div className="flex items-center space-x-2">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-white/70 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-white/70 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-white/70 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                    <span className="text-sm text-white/80">
                      {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
                    </span>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Message Input */}
        <div className="bg-black/20 backdrop-blur-lg border-t border-white/20 p-4">
          <div className="flex space-x-4">
            <input
              type="text"
              value={newMessage}
              onChange={handleTyping}
              placeholder="Type your message..."
              className="flex-1 p-4 bg-white/20 border border-white/30 rounded-xl text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
              onKeyPress={(e) => e.key === 'Enter' && sendMessage(e)}
            />
            <button
              onClick={sendMessage}
              className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-8 py-4 rounded-xl font-semibold hover:from-blue-600 hover:to-purple-600 transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatApp;