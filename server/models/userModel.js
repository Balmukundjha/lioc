let mongoose = require('mongoose');
let Schema = mongoose.Schema;

let UserSchema = new Schema({
  user_name: {
    type: String,
  },

  user_image: {
    type: String,
  },

  phone_no: {
    type: Number,
    unique: true,
    required: true
  },

  country_code: {
    type: Number,
    required: true
  },

  about: {
    type: String,
  },

  privacy_last_seen: {
    type: String,
  },

  privacy_profile_image: {
    type: String,
  },

  privacy_about: {
    type: String,
  },
  token: {
    type: String
  },
  livestatus: {
    type: String /* online (or) offline */
  },
  status: {
    type: String
  },
  contactstatus: {
    type: String
  },
  join_at: {
    type: Date,
    default: Date.now
  }
});
module.exports = mongoose.model('User', UserSchema);
