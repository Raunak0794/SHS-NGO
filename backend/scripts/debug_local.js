const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('../src/models/user.model');
const Conversation = require('../src/models/Conversation');
const Message = require('../src/models/Message');
const { sendMessage, deleteConversation } = require('../src/controllers/chat.controller');
const { registerUser } = require('../src/controllers/auth.controller');

(async () => {
  try {
    console.log('Connecting to:', process.env.MONGO_URI?.substring(0, 30) + '...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected locally');

    // 1. Test registerUser
    console.log('\n--- 1. Debugging registerUser ---');
    const mockReq = {
      body: {
        username: 'debug_user_' + Date.now(),
        email: 'debug_user_' + Date.now() + '@example.com',
        password: 'Password123!',
        fullName: { firstName: 'Debug', lastName: 'User' },
      }
    };
    let capturedRes = {};
    const mockRes = {
      cookie: (name, val, opts) => { capturedRes.cookie = { name, val, opts }; },
      status: (code) => {
        capturedRes.status = code;
        return {
          json: (data) => {
            capturedRes.body = data;
            console.log('registerUser result:', code, data);
          }
        };
      }
    };

    await registerUser(mockReq, mockRes);

    const user = await User.findOne({ email: mockReq.body.email });
    console.log('User created:', user?._id);

    // 2. Test sendMessage
    console.log('\n--- 2. Debugging sendMessage ---');
    const mockChatReq = {
      user: { id: user._id.toString() },
      body: {
        message: 'Explain photosynthesis simply in 2 lines',
        mode: 'general',
        subject: 'Science'
      }
    };
    let chatRes = {};
    const mockChatRes = {
      status: (code) => {
        chatRes.status = code;
        return {
          json: (data) => {
            chatRes.body = data;
            console.log('sendMessage result:', code, data);
          }
        };
      }
    };

    await sendMessage(mockChatReq, mockChatRes);

    // 3. Test deleteConversation
    console.log('\n--- 3. Debugging deleteConversation ---');
    const conv = await Conversation.findOne({ userId: user._id });
    console.log('Found conv:', conv?._id);
    if (conv) {
      const mockDelReq = {
        user: { id: user._id.toString() },
        params: { id: conv._id.toString() }
      };
      let delRes = {};
      const mockDelRes = {
        status: (code) => {
          delRes.status = code;
          return {
            json: (data) => {
              delRes.body = data;
              console.log('deleteConversation result:', code, data);
            }
          };
        }
      };
      await deleteConversation(mockDelReq, mockDelRes);
    }

    // Cleanup
    await User.deleteOne({ _id: user._id });
    await Conversation.deleteMany({ userId: user._id });
    await Message.deleteMany({ userId: user._id });

    console.log('\nDebug script finished cleanly.');
    process.exit(0);
  } catch (err) {
    console.error('Debug script fatal error:', err);
    process.exit(1);
  }
})();
