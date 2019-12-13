let mongoose = require('mongoose');
let Schema = mongoose.Schema;
let HelpSchema = new Schema({
  title: {
    type: String,
    required: true
  },
  type: {
    type: String, // Help or terms
    required: true
  },
  description: {
    type: String,
    required: true
  } /* blocked user id */
});
module.exports = mongoose.model('Help', HelpSchema);
