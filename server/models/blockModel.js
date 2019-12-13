let mongoose = require('mongoose');
let Schema = mongoose.Schema;

let BlockSchema = new Schema({
    user_id: {
        type: String,
        required: true
    },
    buser_id: {
        type: String,
        required: true
    } /* blocked user id */
});
module.exports = mongoose.model('Block', BlockSchema);