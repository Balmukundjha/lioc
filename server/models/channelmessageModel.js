let mongoose = require('mongoose');
let Schema = mongoose.Schema;

let ChannelmessagesSchema = new Schema({
  channel_id: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  message_type: {
    type: String,
    required: true
  },
  message_at: {
    type: String,
    required: true
  },
  message_date: {
    type: Date,
    default: Date.now
  },
  chat_type: {
    type: String,
    required: true
  },
  attachment: {
    type: String,
  },
  thumbnail: {
    type: String,
  },
});

module.exports = mongoose.model('Channelmessages', ChannelmessagesSchema);
