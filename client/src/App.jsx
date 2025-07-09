import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';

const ChatApp = () => {
  const [socket, setSocket] = useState(null);
  const [username, setUsername] = useState('');
  const [isJoined, setIsJoined] = useState(false);
  const [messages, setMessages] = useState([]);
  const [privateChats, setPrivateChats] = useState({});
  const [messageInput, setMessageInput] = useState('');
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [activeChat, setActiveChat] = useState('global');
  const [unreadCounts, setUnreadCounts] = useState({});
  
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    // Initialize socket connection
    const newSocket = io('http://localhost:5000');
    setSocket(newSocket);

    // Listen for incoming messages
    newSocket.on('message', (message) => {
      setMessages(prev => [...prev, message]);
    });

    // Listen for private messages
    newSocket.on('privateMessage', (data) => {
      const chatKey = data.from === username ? data.to : data.from;
      
      setPrivateChats(prev => ({
        ...prev,
        [chatKey]: [...(prev[chatKey] || []), {
          ...data,
          timestamp: new Date().toISOString()
        }]
      }));

      // Add unread count if not in active chat
      if (activeChat !== chatKey) {
        setUnreadCounts(prev => ({
          ...prev,
          [chatKey]: (prev[chatKey] || 0) + 1
        }));
      }
    });

    // Listen for user list updates
    newSocket.on('userList', (users) => {
      setOnlineUsers(users);
    });

    // Listen for typing indicators
    newSocket.on('userTyping', (data) => {
      setTypingUsers(prev => {
        if (data.isTyping) {
          return [...prev.filter(user => user !== data.username), data.username];
        } else {
          return prev.filter(user => user !== data.username);
        }
      });
    });

    // Listen for user join/leave notifications
    newSocket.on('userJoined', (data) => {
      setMessages(prev => [...prev, {
        type: 'notification',
        message: `${data.username} joined the chat`,
        timestamp: new Date().toISOString()
      }]);
    });

    newSocket.on('userLeft', (data) => {
      setMessages(prev => [...prev, {
        type: 'notification',
        message: `${data.username} left the chat`,
        timestamp: new Date().toISOString()
      }]);
    });

    return () => {
      newSocket.close();
    };
  }, [username, activeChat]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, privateChats, activeChat]);

  const handleJoinChat = (e) => {
    e.preventDefault();
    if (username.trim() && socket) {
      socket.emit('joinChat', { username });
      setIsJoined(true);
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (messageInput.trim() && socket && username) {
      if (activeChat === 'global') {
        const messageData = {
          username,
          message: messageInput.trim(),
          timestamp: new Date().toISOString()
        };
        
        socket.emit('sendMessage', messageData);
      } else {
        // Send private message
        const privateMessageData = {
          from: username,
          to: activeChat,
          message: messageInput.trim(),
          timestamp: new Date().toISOString()
        };
        
        socket.emit('privateMessage', privateMessageData);
        
        // Add to local private chat
        setPrivateChats(prev => ({
          ...prev,
          [activeChat]: [...(prev[activeChat] || []), privateMessageData]
        }));
      }
      
      setMessageInput('');
      
      // Stop typing indicator
      if (isTyping) {
        socket.emit('stopTyping', { username });
        setIsTyping(false);
      }
    }
  };

  const handleTyping = (e) => {
    setMessageInput(e.target.value);
    
    if (!isTyping && socket && username) {
      setIsTyping(true);
      socket.emit('startTyping', { username });
    }
    
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Set new timeout to stop typing
    typingTimeoutRef.current = setTimeout(() => {
      if (socket && username) {
        socket.emit('stopTyping', { username });
        setIsTyping(false);
      }
    }, 1000);
  };

  const startPrivateChat = (targetUser) => {
    if (targetUser !== username) {
      setActiveChat(targetUser);
      // Clear unread count
      setUnreadCounts(prev => ({
        ...prev,
        [targetUser]: 0
      }));
    }
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getTypingMessage = () => {
    if (typingUsers.length === 0) return '';
    if (typingUsers.length === 1) return `${typingUsers[0]} is typing...`;
    if (typingUsers.length === 2) return `${typingUsers[0]} and ${typingUsers[1]} are typing...`;
    return `${typingUsers.slice(0, -1).join(', ')} and ${typingUsers[typingUsers.length - 1]} are typing...`;
  };

  const getCurrentMessages = () => {
    if (activeChat === 'global') {
      return messages;
    }
    return privateChats[activeChat] || [];
  };

  const getChatTitle = () => {
    if (activeChat === 'global') {
      return 'Global Chat';
    }
    return `Private Chat with ${activeChat}`;
  };

  if (!isJoined) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Welcome to Advanced Chat</h1>
            <p className="text-gray-600">Enter your username to join the conversation</p>
          </div>
          
          <div className="space-y-4">
            <div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors"
                onKeyPress={(e) => e.key === 'Enter' && handleJoinChat(e)}
              />
            </div>
            <button
              onClick={handleJoinChat}
              className="w-full bg-indigo-600 text-white py-3 px-4 rounded-lg hover:bg-indigo-700 transition-colors font-medium focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              Join Chat
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Sidebar with online users and chat tabs */}
      <div className="w-64 bg-white shadow-lg border-r border-gray-200">
        {/* Chat Tabs */}
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Chats</h2>
          <div className="space-y-2">
            {/* Global Chat Tab */}
            <button
              onClick={() => setActiveChat('global')}
              className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                activeChat === 'global' 
                  ? 'bg-indigo-100 text-indigo-700 font-medium' 
                  : 'hover:bg-gray-100 text-gray-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span>🌍 Global Chat</span>
                {activeChat !== 'global' && unreadCounts.global > 0 && (
                  <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1">
                    {unreadCounts.global}
                  </span>
                )}
              </div>
            </button>
            
            {/* Private Chat Tabs */}
            {Object.keys(privateChats).map(chatUser => (
              <button
                key={chatUser}
                onClick={() => startPrivateChat(chatUser)}
                className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                  activeChat === chatUser 
                    ? 'bg-indigo-100 text-indigo-700 font-medium' 
                    : 'hover:bg-gray-100 text-gray-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span>💬 {chatUser}</span>
                  {activeChat !== chatUser && unreadCounts[chatUser] > 0 && (
                    <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1">
                      {unreadCounts[chatUser]}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Online Users */}
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">Online Users</h3>
          <p className="text-xs text-gray-600 mb-3">{onlineUsers.length} online</p>
          <div className="space-y-2">
            {onlineUsers.map((user, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className={`text-sm ${user === username ? 'font-semibold text-indigo-600' : 'text-gray-700'}`}>
                    {user} {user === username && '(You)'}
                  </span>
                </div>
                {user !== username && (
                  <button
                    onClick={() => startPrivateChat(user)}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                  >
                    Chat
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white shadow-sm border-b border-gray-200 p-4">
          <div className="flex justify-between items-center">
            <h1 className="text-xl font-semibold text-gray-900">{getChatTitle()}</h1>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm text-gray-600">Connected as {username}</span>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {getCurrentMessages().map((msg, index) => (
            <div key={index} className={`flex ${msg.type === 'notification' ? 'justify-center' : msg.username === username || msg.from === username ? 'justify-end' : 'justify-start'}`}>
              {msg.type === 'notification' ? (
                <div className="bg-gray-100 text-gray-600 text-xs px-3 py-1 rounded-full">
                  {msg.message}
                </div>
              ) : (
                <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                  msg.username === username || msg.from === username
                    ? 'bg-indigo-600 text-white' 
                    : 'bg-white text-gray-900 shadow-sm border border-gray-200'
                }`}>
                  <div className="flex items-center space-x-2 mb-1">
                    <span className={`text-xs font-medium ${
                      msg.username === username || msg.from === username ? 'text-indigo-200' : 'text-gray-500'
                    }`}>
                      {msg.username || msg.from}
                    </span>
                    <span className={`text-xs ${
                      msg.username === username || msg.from === username ? 'text-indigo-200' : 'text-gray-400'
                    }`}>
                      {formatTime(msg.timestamp)}
                    </span>
                  </div>
                  <p className="text-sm">{msg.message}</p>
                </div>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Typing indicator */}
        {activeChat === 'global' && typingUsers.length > 0 && (
          <div className="px-4 py-2 text-sm text-gray-600 italic">
            {getTypingMessage()}
          </div>
        )}

        {/* Message input */}
        <div className="bg-white border-t border-gray-200 p-4">
          <div className="flex space-x-2">
            <input
              type="text"
              value={messageInput}
              onChange={handleTyping}
              placeholder={activeChat === 'global' ? 'Type a message...' : `Message ${activeChat}...`}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage(e)}
            />
            <button
              onClick={handleSendMessage}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
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