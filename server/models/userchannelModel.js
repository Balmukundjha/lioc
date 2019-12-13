let mongoose = require("mongoose");
let Schema = mongoose.Schema;
let userChannelSchema = new Schema({
  channel_admin_id: {
    type: String,
    ref: "User",
    required: true
  },
  channel_admin: {
    type: String
  },
  channel_adminId: {
    type: String
  },
  channel_name: {
    type: String,
    required: true
  },
  channel_des: {
    type: String,
    required: true
  },
  channel_type: {
    type: String,
    required: true
  },
  channel_image: {
    type: String
  },
  created_time: {
    type: String,
    required: true
  },
  created_date: {
    type: Date,
    default: Date.now
  },
  total_subscribers: {
    type: Number,
    default: 0
  },
  left_status: {
    type: Number,
    default: 0
  },
  report_count: {
    type: Number,
    default: 0
  },
  block_status: {
    type: Number,
    default: 0
  }
});
module.exports = mongoose.model("Userchannels", userChannelSchema);
