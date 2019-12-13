const FCM = require("fcm-push"),
  apn = require("apn");

/* MODELS */
let Sitesettings = require("../models/sitesettingModel");
let UserDevices = require("../models/userdeviceModel");

/* COMPOSE PUSH NOTIFICATIONS */
sendNotification = function(member, message, data) {
  UserDevices.findOne({
    user_id: member
  }).exec(function(err, chatdevices) {
    if (chatdevices && !err) {
      if (
        typeof chatdevices.device_token != "undefined" &&
        chatdevices.device_token != null
      ) {
        if (chatdevices.device_type == 0) {
          sendIos(
            chatdevices.device_token,
            message,
            data,
            chatdevices.device_mode
          );
        } else {
          sendAndroid(chatdevices.device_token, data, "single");
        }
      }
    }
  });
};

/* COMPOSE CALL NOTIFICATIONS */
callNotification = function(member, message, data) {
  UserDevices.findOne({
    user_id: member
  }).exec(function(err, chatdevices) {
    if (chatdevices && !err) {
      if (
        typeof chatdevices.device_token != "undefined" &&
        chatdevices.device_token != null
      ) {
        if (chatdevices.device_type == 0) {
          sendIos(
            chatdevices.device_token,
            message,
            data,
            chatdevices.device_mode
          );
        } else {
          callAndroid(chatdevices.device_token, data, "single");
        }
      }
    }
  });
};

/* COMPOSE MULTI PUSH NOTIFICATIONS */
sendNotifications = function(members, message, data) {
  /* send ios notifications */
  UserDevices.find({
    device_type: "0"
  })
    .where("user_id")
    .in(members)
    .exec(function(err, records) {
      let sendnotifications = [];
      if (records != "" && typeof records != "undefined") {
        records.forEach(function(rec) {
          sendnotifications.push(rec.device_token);
        });
        sendIos(sendnotifications, message, data);
      }
    });

  /* send android notifications */
  UserDevices.find({
    device_type: "1"
  })
    .where("user_id")
    .in(members)
    .exec(function(err, records) {
      let sendnotifications = [];
      if (records != "" && typeof records != "undefined") {
        records.forEach(function(rec) {
          sendnotifications.push(rec.device_token);
        });
        sendAndroid(sendnotifications, data, "multiple");
      }
    });
};

/* COMPOSE ADMIN PUSH NOTIFICATIONS */
sendAdminNotifications = function(message, data) {
  /* send ios notifications */
  UserDevices.find({
    device_type: "0"
  }).exec(function(err, records) {
    let sendnotifications = [];
    if (records != "" && typeof records != "undefined") {
      records.forEach(function(rec) {
        sendnotifications.push(rec.device_token);
      });
      sendIos(sendnotifications, message, data);
    }
  });

  /* send android notifications */
  UserDevices.find({
    device_type: "1"
  }).exec(function(err, records) {
    if (records != "" && typeof records != "undefined") {
      let sendnotifications = [];
      records.forEach(function(rec) {
        sendnotifications.push(rec.device_token);
      });
      sendAndroid(sendnotifications, data, "multiple");
    }
  });
};

/* iOS PUSH NOTIFICTIONS */
sendIos = function(devicetoken, message, message_data, mode) {
  Sitesettings.findOne(function(err, sitedata) {
    let apns_passphrase = sitedata.voip_passpharse;
    if (typeof apns_passphrase != "undefined" && apns_passphrase != null) {
      let options = {};
      options.cert = __dirname + "/apns/cert.pem";
      options.key = __dirname + "/apns/key.pem";
      options.passphrase = apns_passphrase;
      options.production = false;
      if (mode == "1") {
        options.production = true;
      }
      let apnProvider = new apn.Provider(options);
      let notification = new apn.Notification();
      notification.payload = message_data;
      notification.sound = "ping.aiff";
      notification.badge = 1;
      notification.alert = message;
      apnProvider.send(notification, devicetoken).then(result => {
        // console.log("iOS Pushnotification log" + JSON.stringify(result));
      });
    }
  });
};

/* ANDROID FCM PUSH NOTIFICATIONS */
sendAndroid = function(devicetokens, data, notify_mode) {
  Sitesettings.findOne(function(err, sitedata) {
    if (typeof sitedata.fcm_key != "undefined" && sitedata.fcm_key != null) {
      let fcmkey = sitedata.fcm_key;
      let fcm = new FCM(fcmkey);
      let message = {};
      message.data = data;
      message.priority = "high";
      if (notify_mode == "multiple") {
        message.registration_ids = devicetokens;
      } else {
        message.to = devicetokens;
      }
      fcm
        .send(message)
        .then(function(response) {
          // console.log("Android Pushnotification log" + response);
        })
        .catch(function(err) {
          // consoleerror("Android Pushnotificaiton error" + err);
        });
    }
  });
};

/* ANDROID CALL NOTIFICATIONS */
callAndroid = function(devicetokens, data, notify_mode) {
  Sitesettings.findOne(function(err, sitedata) {
    if (typeof sitedata.fcm_key != "undefined" && sitedata.fcm_key != null) {
      let fcmkey = sitedata.fcm_key;
      let fcm = new FCM(fcmkey);
      let message = {};
      message.data = data;
      message.android = {
        priority: "urgent",
        ttl: "0s"
      };
      message.apns = {
        headers: {
          "apns-priority": "5"
        }
      };
      message.webpush = {
        headers: {
          Urgency: "high"
        }
      };
      if (notify_mode == "multiple") {
        message.registration_ids = devicetokens;
      } else {
        message.to = devicetokens;
      }
      fcm
        .send(message)
        .then(function(response) {
          console.log("Android Pushnotification log" + response);
        })
        .catch(function(err) {
          consoleerror("Android Pushnotificaiton error" + err);
        });
    }
  });
};

module.exports = {
  sendIos: sendIos,
  sendAndroid: sendAndroid,
  sendNotification: sendNotification,
  sendNotifications: sendNotifications,
  sendAdminNotifications: sendAdminNotifications,
  callNotification: callNotification
};
