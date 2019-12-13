let mongoose = require('mongoose');
let Schema = mongoose.Schema;

let MychannelSchema = new Schema({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  channel_image: {
    type: String,
    required: true
  },
  created_time: {
    type: String,
    required: true
  },
  created_at: {
    type: Date,
    default: Date.now
  },
});

module.exports = mongoose.model('Mychannel', MychannelSchema);
