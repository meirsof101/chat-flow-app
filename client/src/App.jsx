import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';

const ChatApp = () => {
  const [socket, setSocket] = useState(null);
  const [username, setUsername] = useState('');
  const [isJoined, setIsJoined] = useState(false);
  const [messages, setMessages] = useState({});
  const [message, setMessage] = useState('');
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const [privateChats, setPrivateChats] = useState([]);
  const [activeChat, setActiveChat] = useState('global');
  const [unreadCounts, setUnreadCounts] = useState({});
  const [chatRooms, setChatRooms] = useState(['general', 'random', 'tech']);
  const [messageReactions, setMessageReactions] = useState({});
  const [activeRoom, setActiveRoom] = useState('general');
  const [newRoomName, setNewRoomName] = useState('');
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [roomUsers, setRoomUsers] = useState({});
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, activeChat, activeRoom]);

  // Message reactions handler
  const handleReaction = (messageId, emoji) => {
    if (socket) {
      socket.emit('addReaction', {
        messageId,
        emoji,
        username,
        room: activeRoom
      });
    }
  };

  useEffect(() => {
    if (username) {
      const newSocket = io('http://localhost:5000');
      setSocket(newSocket);

      // Join chat
      newSocket.emit('joinChat', { username });

      // Listen for messages
      newSocket.on('message', (data) => {
        setMessages(prev => ({
          ...prev,
          [data.room || 'general']: [...(prev[data.room || 'general'] || []), data]
        }));
      });

      // Listen for private messages
      newSocket.on('privateMessage', (data) => {
        const chatId = data.sender === username ? data.receiver : data.sender;
        setMessages(prev => ({
          ...prev,
          [chatId]: [...(prev[chatId] || []), data]
        }));

        // Add to private chats if not already there
        setPrivateChats(prev => {
          if (!prev.includes(chatId)) {
            return [...prev, chatId];
          }
          return prev;
        });

        // Update unread count if not in active chat
        if (activeChat !== chatId) {
          setUnreadCounts(prev => ({
            ...prev,
            [chatId]: (prev[chatId] || 0) + 1
          }));
        }
      });

      // Listen for reaction updates
      newSocket.on('reactionUpdate', (data) => {
        setMessageReactions(prev => ({
          ...prev,
          [data.messageId]: data.reactions
        }));
      });

      // Listen for online users
      newSocket.on('userList', (users) => {
        setOnlineUsers(users);
      });

      // Listen for room users
      newSocket.on('roomUsers', (data) => {
        setRoomUsers(data);
      });

      // Listen for typing indicators
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

      // Listen for user join/leave notifications
      newSocket.on('userJoined', (data) => {
        setMessages(prev => ({
          ...prev,
          [data.room || 'general']: [...(prev[data.room || 'general'] || []), {
            type: 'notification',
            message: `${data.username} joined the chat`,
            timestamp: new Date().toISOString()
          }]
        }));
      });

      newSocket.on('userLeft', (data) => {
        setMessages(prev => ({
          ...prev,
          [data.room || 'general']: [...(prev[data.room || 'general'] || []), {
            type: 'notification',
            message: `${data.username} left the chat`,
            timestamp: new Date().toISOString()
          }]
        }));
      });

      // Listen for room updates
      newSocket.on('roomList', (rooms) => {
        setChatRooms(rooms);
      });

      newSocket.on('roomCreated', (data) => {
        setMessages(prev => ({
          ...prev,
          [activeRoom]: [...(prev[activeRoom] || []), {
            type: 'notification',
            message: `Room #${data.roomName} created by ${data.creator}`,
            timestamp: new Date().toISOString()
          }]
        }));
      });

      return () => {
        newSocket.disconnect();
      };
    }
  }, [username, activeRoom]);

  const joinChat = () => {
    if (username.trim()) {
      setIsJoined(true);
    }
  };

  const sendMessage = () => {
    if (message.trim() && socket) {
      if (activeChat === 'global') {
        // Send to current room
        socket.emit('sendMessage', { 
          message, 
          username, 
          room: activeRoom 
        });
      } else {
        // Send private message
        socket.emit('privateMessage', {
          message,
          sender: username,
          receiver: activeChat,
          timestamp: new Date().toISOString()
        });
      }
      setMessage('');
    }
  };

  const handleTyping = (e) => {
    setMessage(e.target.value);
    
    if (socket && activeChat === 'global') {
      socket.emit('typing', { username, room: activeRoom });
      
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('stopTyping', { username, room: activeRoom });
      }, 1000);
    }
  };

  const startPrivateChat = (targetUser) => {
    if (targetUser !== username) {
      setActiveChat(targetUser);
      if (!privateChats.includes(targetUser)) {
        setPrivateChats(prev => [...prev, targetUser]);
      }
      // Clear unread count
      setUnreadCounts(prev => ({
        ...prev,
        [targetUser]: 0
      }));
    }
  };

  const switchToRoom = (roomName) => {
    setActiveRoom(roomName);
    setActiveChat('global');
    if (socket) {
      socket.emit('switchRoom', { username, room: roomName });
    }
  };

  const createRoom = () => {
    if (newRoomName.trim() && socket) {
      socket.emit('createRoom', { roomName: newRoomName, creator: username });
      setNewRoomName('');
      setShowCreateRoom(false);
    }
  };

  const getCurrentMessages = () => {
    if (activeChat === 'global') {
      return messages[activeRoom] || [];
    }
    return messages[activeChat] || [];
  };

  const getCurrentTypingUsers = () => {
    if (activeChat === 'global') {
      return typingUsers.filter(user => user !== username);
    }
    return [];
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  if (!isJoined) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-2xl border border-white/20">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-white mb-2">💬 Advanced Chat</h1>
            <p className="text-white/80 mb-8">Join the conversation with rooms & private messaging</p>
            <div className="space-y-4">
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/40 backdrop-blur-sm"
                onKeyPress={(e) => e.key === 'Enter' && joinChat()}
              />
              <button
                onClick={joinChat}
                className="w-full bg-white/20 hover:bg-white/30 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 backdrop-blur-sm border border-white/20"
              >
                Join Chat
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex">
      {/* Sidebar */}
      <div className="w-80 bg-gray-800/50 backdrop-blur-sm border-r border-gray-700/50 flex flex-col">
        {/* Chat Rooms */}
        <div className="p-4 border-b border-gray-700/50">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white">🏠 Chat Rooms</h2>
            <button
              onClick={() => setShowCreateRoom(!showCreateRoom)}
              className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded-lg text-sm transition-colors"
            >
              +
            </button>
          </div>
          
          {showCreateRoom && (
            <div className="mb-4 space-y-2">
              <input
                type="text"
                value={newRoomName}
                onChange={(e) => setNewRoomName(e.target.value)}
                placeholder="Room name"
                className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                onKeyPress={(e) => e.key === 'Enter' && createRoom()}
              />
              <button
                onClick={createRoom}
                className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg text-sm transition-colors"
              >
                Create Room
              </button>
            </div>
          )}
          
          <div className="space-y-1">
            {chatRooms.map((room) => (
              <button
                key={room}
                onClick={() => switchToRoom(room)}
                className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center justify-between ${
                  activeRoom === room && activeChat === 'global'
                    ? 'bg-purple-600 text-white'
                    : 'text-gray-300 hover:bg-gray-700'
                }`}
              >
                <span># {room}</span>
                <span className="text-xs text-gray-400">
                  {roomUsers[room] || 0}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Private Chats */}
        <div className="p-4 border-b border-gray-700/50">
          <h2 className="text-xl font-bold text-white mb-4">💬 Private Chats</h2>
          <div className="space-y-1">
            {privateChats.map((chatUser) => (
              <button
                key={chatUser}
                onClick={() => setActiveChat(chatUser)}
                className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center justify-between ${
                  activeChat === chatUser
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-gray-700'
                }`}
              >
                <span>{chatUser}</span>
                {unreadCounts[chatUser] > 0 && (
                  <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1 min-w-[1.5rem] text-center">
                    {unreadCounts[chatUser]}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Online Users */}
        <div className="p-4 flex-1">
          <h2 className="text-xl font-bold text-white mb-4">
            👥 Online Users ({onlineUsers.length})
          </h2>
          <div className="space-y-2">
            {onlineUsers.map((user) => (
              <div key={user} className="flex items-center justify-between p-2 bg-gray-700/30 rounded-lg">
                <span className={`${user === username ? 'text-yellow-400 font-semibold' : 'text-gray-300'}`}>
                  {user === username ? `${user} (You)` : user}
                </span>
                {user !== username && (
                  <button
                    onClick={() => startPrivateChat(user)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-xs transition-colors"
                  >
                    Chat
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Chat Header */}
        <div className="bg-gray-800/50 backdrop-blur-sm border-b border-gray-700/50 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">
                {activeChat === 'global' ? `# ${activeRoom}` : `💬 ${activeChat}`}
              </h1>
              <p className="text-gray-400 text-sm">
                {activeChat === 'global' 
                  ? `${roomUsers[activeRoom] || 0} users in room`
                  : 'Private conversation'
                }
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setActiveChat('global')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  activeChat === 'global'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                🌍 Global
              </button>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 p-4 overflow-y-auto">
          <div className="space-y-4">
            {getCurrentMessages().map((msg, index) => {
              const messageId = `${msg.timestamp}_${msg.username || msg.sender}`;
              const reactions = messageReactions[messageId] || {};
              
              return (
                <div key={index} className={`flex items-start space-x-3 ${
                  msg.type === 'notification' ? 'justify-center' : ''
                }`}>
                  {msg.type === 'notification' ? (
                    <div className="bg-gray-600/50 text-gray-300 px-4 py-2 rounded-full text-sm">
                      {msg.message}
                    </div>
                  ) : (
                    <>
                      <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                        {(msg.username || msg.sender || 'U')[0].toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="font-semibold text-white">
                            {msg.username || msg.sender}
                          </span>
                          <span className="text-gray-400 text-xs">
                            {formatTime(msg.timestamp)}
                          </span>
                        </div>
                        <div className="bg-gray-700/50 backdrop-blur-sm rounded-lg px-4 py-2 text-gray-100 relative group">
                          {msg.message}
                          
                          {/* Reaction Button */}
                          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="flex space-x-1">
                              {['👍', '❤️', '😂', '😮', '😢', '😡'].map((emoji) => (
                                <button
                                  key={emoji}
                                  onClick={() => handleReaction(messageId, emoji)}
                                  className="hover:bg-gray-600 rounded px-1 py-0.5 text-sm transition-colors"
                                >
                                  {emoji}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                        
                        {/* Display Reactions */}
                        {Object.keys(reactions).length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {Object.entries(reactions).map(([emoji, users]) => (
                              <div
                                key={emoji}
                                className="bg-gray-600/50 rounded-full px-2 py-1 text-xs flex items-center space-x-1 cursor-pointer hover:bg-gray-600/70 transition-colors"
                                onClick={() => handleReaction(messageId, emoji)}
                                title={`${users.join(', ')}`}
                              >
                                <span>{emoji}</span>
                                <span className="text-gray-300">{users.length}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
            
            {getCurrentTypingUsers().length > 0 && (
              <div className="flex items-center space-x-2 text-gray-400 text-sm">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
                <span>
                  {getCurrentTypingUsers().join(', ')} {getCurrentTypingUsers().length === 1 ? 'is' : 'are'} typing...
                </span>
              </div>
            )}
          </div>
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <div className="bg-gray-800/50 backdrop-blur-sm border-t border-gray-700/50 p-4">
          <div className="flex items-center space-x-3">
            <input
              type="text"
              value={message}
              onChange={handleTyping}
              placeholder={
                activeChat === 'global' 
                  ? `Message #${activeRoom}...` 
                  : `Message ${activeChat}...`
              }
              className="flex-1 px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 backdrop-blur-sm"
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            />
            <button
              onClick={sendMessage}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-6 py-3 rounded-xl transition-all duration-200 font-semibold shadow-lg"
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