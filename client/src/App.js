// Browser-compatible version of your React chat app
const { useState, useEffect, useRef } = React;

// Connect to the server
const socket = io('http://localhost:5000');

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
    return React.createElement('div', { className: 'app' },
      React.createElement('div', { className: 'join-container' },
        React.createElement('div', { className: 'join-form' },
          React.createElement('h2', null, 'Join Chat'),
          React.createElement('form', { onSubmit: joinChat },
            React.createElement('input', {
              type: 'text',
              placeholder: 'Enter your username',
              value: username,
              onChange: (e) => setUsername(e.target.value),
              maxLength: 20,
              required: true
            }),
            React.createElement('button', {
              type: 'submit',
              disabled: !isConnected
            }, isConnected ? 'Join Chat' : 'Connecting...')
          ),
          React.createElement('div', { className: 'connection-status' },
            `Status: ${isConnected ? '🟢 Connected' : '🔴 Disconnected'}`
          )
        )
      )
    );
  }

  return React.createElement('div', { className: 'app' },
    React.createElement('div', { className: 'chat-container' },
      React.createElement('div', { className: 'chat-header' },
        React.createElement('h2', null, 'Real-Time Chat'),
        React.createElement('div', { className: 'header-info' },
          React.createElement('span', { className: 'username' }, `Welcome, ${username}!`),
          React.createElement('span', { className: 'connection-status' },
            isConnected ? '🟢 Connected' : '🔴 Disconnected'
          )
        )
      ),
      React.createElement('div', { className: 'chat-body' },
        React.createElement('div', { className: 'messages-container' },
          React.createElement('div', { className: 'messages' },
            ...messages.map((msg) =>
              React.createElement('div', {
                key: msg.id,
                className: `message ${msg.isSystem ? 'system-message' : ''} ${msg.username === username ? 'own-message' : ''}`
              },
                !msg.isSystem && React.createElement('div', { className: 'message-header' },
                  React.createElement('span', { className: 'message-username' }, msg.username),
                  React.createElement('span', { className: 'message-time' }, formatTime(msg.timestamp))
                ),
                React.createElement('div', { className: 'message-content' }, msg.message)
              )
            ),
            typingUsers.length > 0 && React.createElement('div', { className: 'typing-indicator' },
              `${typingUsers.join(', ')} ${typingUsers.length === 1 ? 'is' : 'are'} typing...`
            ),
            React.createElement('div', { ref: messagesEndRef })
          )
        ),
        React.createElement('div', { className: 'online-users' },
          React.createElement('h3', null, `Online Users (${onlineUsers.length})`),
          React.createElement('ul', null,
            ...onlineUsers.map((user) =>
              React.createElement('li', {
                key: user.id,
                className: user.username === username ? 'current-user' : ''
              }, `🟢 ${user.username}`)
            )
          )
        )
      ),
      React.createElement('form', { className: 'message-form', onSubmit: sendMessage },
        React.createElement('input', {
          type: 'text',
          placeholder: 'Type a message...',
          value: currentMessage,
          onChange: handleTyping,
          disabled: !isConnected
        }),
        React.createElement('button', {
          type: 'submit',
          disabled: !isConnected || !currentMessage.trim()
        }, 'Send')
      )
    )
  );
}