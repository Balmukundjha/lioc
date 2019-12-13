let mongoose = require('mongoose');
let Schema = mongoose.Schema;

let UserdevicesSchema = new Schema({
  user_id: {
    type: String,
    unique: true,
    required: true,
  },
  device_token: {
    type: String,
    required: true
  },
  device_type: {
    type: String,
    required: true,
  },
  device_id: {
    type: String,
    required: true,
  },
  device_mode: {
    type: String,
  },
  notified_at: {
    type: String,
  },
});

module.exports = mongoose.model('Userdevices', UserdevicesSchema);
