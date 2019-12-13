let mongoose = require('mongoose');
let Schema = mongoose.Schema;

let ChatgroupsSchema = new Schema({
  group_name: {
    type: String,
    required: true
  },
  group_admin_id: {
    type: String,
    required: true
  },
  group_members_count: {
    type: Number,
  },
  group_members: {
    type: Object
  },
  group_image: {
    type: String
  },
  created_at: {
    type: String
  },
  modified_at: {
    type: String
  },
  modified_by: {
    type: String
  },
});

module.exports = mongoose.model('Chatgroups', ChatgroupsSchema);
