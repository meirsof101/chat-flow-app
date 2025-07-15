const mongoose = require('mongoose');

const readReceiptSchema = new mongoose.Schema({
  messageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  username: {
    type: String,
    required: true
  },
  room: {
    type: String,
    required: true
  },
  readAt: {
    type: Date,
    default: Date.now
  }
});

// Compound index to ensure one read receipt per user per message
readReceiptSchema.index({ messageId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('ReadReceipt', readReceiptSchema);