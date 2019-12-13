let mongoose = require('mongoose');
let Schema = mongoose.Schema;

let SitesettingSchema = new Schema({
  site_title: {
    type: String,
  },
  banner_text: {
    type: String,
  },
  footer_text: {
    type: String,
  },
  android_store: {
    type: String,
  },
  ios_store: {
    type: String,
  },
  facebook_link: {
    type: String,
  },
  twitter_link: {
    type: String,
  },
  google_link: {
    type: String,
  },
  banner_image: {
    type: String,
  },
  logo: {
    type: String,
  },
  sliders: {
    type: Object,
  },
  fcm_key: {
    type: String,
  },
  mail_host: {
    type: String,
  },
  mail_port: {
    type: String,
  },
  mail_username: {
    type: String,
  },
  mail_password: {
    type: String,
  },
  mail_encryption: {
    type: String,
  },
  voip_certificate: {
    type: String,
  },
  voip_key: {
    type: String,
  },
  voip_passpharse: {
    type: String,
  },
  meta_title: {
    type: String,
  },
  meta_description: {
    type: String,
  },
  meta_url: {
    type: String,
  },
  meta_image: {
    type: String,
  },
  android_version: {
    type: String,
  },
  android_update: {
    type: Number,
    default: 0
    /* for force update "1" */
  },
  ios_version: {
    type: String,
  },
  ios_update: {
    type: Number,
    default: 0
    /* for force update "1" */
  }
});
module.exports = mongoose.model('Sitesetting', SitesettingSchema);
