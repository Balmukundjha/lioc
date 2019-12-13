let mongoose = require("mongoose");
let Schema = mongoose.Schema;

let ReportSchema = new Schema({
  user_id: {
    type: String,
    ref: "User",
    required: true
  },
  channel_id: {
    type: String,
    ref: "Userchannel",
    required: true
  },
  report: {
    type: String
  },
  reported_at: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("Reports", ReportSchema);
