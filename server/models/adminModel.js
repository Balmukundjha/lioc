const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// User Schema
const AdminSchema = mongoose.Schema({
  username: {
    type: String
  },
  password: {
    type: String
  },
  name: {
    type: String
  }
}, {
  collection: 'admin'
});

const User = module.exports = mongoose.model('Admin', AdminSchema);

module.exports.getUserByUsername = function (username, callback) {
  const query = {
    username: username
  };
  User.findOne(query, callback);
};

module.exports.comparePassword = function (candidatePassword, hash, callback) {
  bcrypt.compare(candidatePassword, hash, (err, isMatch) => {
    if (err) throw err;
    callback(null, isMatch);
  });
};
