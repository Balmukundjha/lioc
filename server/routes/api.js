/*  NPM PACKAGES */
const express = require("express"),
  passport = require("passport"),
  jwt = require("jsonwebtoken"),
  config = require("../keys"),
  multer = require("multer"),
  path = require("path"),
  fs = require("fs"),
  groupArray = require("group-array"),
  service = express.Router();
require("../userjwt")(passport);

/* MODELS */
let User = require("../models/userModel");
let Block = require("../models/blockModel");
let UserDevices = require("../models/userdeviceModel");
let Chatgroups = require("../models/chatgroupModel");
let Helps = require("../models/helpModel");
let Userchannels = require("../models/userchannelModel");
let Channelmessages = require("../models/channelmessageModel");
let MyChannel = require("../models/mychannelModel");
let Sitesetting = require("../models/sitesettingModel");
let Reports = require("../models/reportModel");

/* CHAT SERVER */
let chatServer = require("./chat");

/* REDIS SERVER */
let redisServer = require("./redisServer");

/* SIGNUP OR SIGN USER */
service.post("/signin", function(req, res) {
  if (!req.body.phone_no || !req.body.country_code) {
    senderr(res);
  } else {
    let matchString = {
      phone_no: req.body.phone_no
    };
    User.findOne(matchString, function(err, userdata) {
      if (!userdata) {
        req.body.status = "true";
        req.body.privacy_last_seen = "everyone";
        req.body.privacy_profile_image = "everyone";
        req.body.privacy_about = "everyone";
        req.body.user_image = "";
        req.body.about = "Say hi";
        let newUser = new User(req.body);
        newUser.save(function(err, createduserdata) {
          if (!err) {
            res.json(createduserdata);
          } else {
            senderr(res);
          }
        });
      } else {
        let signintoken = jwt.sign(userdata.toObject(), config.secret);
        userdata.token = "Bearer " + signintoken;
        if (req.body.user_name) {
          User.findOneAndUpdate(
            {
              _id: userdata._id
            },
            {
              $set: {
                user_name: req.body.user_name
              }
            },
            {
              new: true
            }
          ).exec(function(err) {
            if (err) {
              senderr(res);
            } else {
              userdata.user_name = req.body.user_name;
              res.json(userdata);
            }
          });
        } else {
          res.json(userdata);
        }
      }
    });
  }
});

let userstorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, config.assets + "users/");
  },
  filename: (req, file, cb) => {
    cb(
      null,
      file.fieldname + "-" + Date.now() + path.extname(file.originalname)
    );
  }
});

/* USER PROFILE IMAGE UPLOAD */
service.post("/upmyprofile", function(req, res) {
  let userupload = multer({
    storage: userstorage
  }).single("user_image");
  userupload(req, res, function(err) {
    User.findOne(
      {
        _id: req.body.user_id
      },
      function(err, user) {
        if (user) {
          if (
            typeof user.user_image != "undefined" &&
            user.user_image != "user.png"
          ) {
            unlinkFile(config.assets + "users/" + user.user_image);
          }
          let imageFile =
            typeof res.req.file.filename !== "undefined"
              ? res.req.file.filename
              : "";
          user.user_image = imageFile;
          user.save(function(err, userdata) {
            if (!err) {
              res.json({
                status: "true",
                user_image: imageFile,
                message: "Image uploaded successfully"
              });
              let userdetails = {
                user_id: req.body.user_id,
                user_image: imageFile
              };
              chatServer.io.sockets.emit("changeuserimage", userdetails);
            } else {
              senderr(res);
            }
          });
        } else {
          senderr(res);
        }
      }
    );
  });
});

let chatstorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, config.assets + "chats/");
  },
  filename: (req, file, cb) => {
    cb(
      null,
      file.fieldname + "-" + Date.now() + path.extname(file.originalname)
    );
  }
});

/* USER CHAT UPLOAD */
service.post("/upmychat", function(req, res) {
  let chatupload = multer({
    storage: chatstorage
  }).single("attachment");
  chatupload(req, res, function(err) {
    User.findOne(
      {
        _id: req.body.user_id
      },
      function(err, userdata) {
        if (userdata) {
          res.json({
            status: "true",
            user_image:
              typeof res.req.file.filename !== "undefined"
                ? res.req.file.filename
                : "",
            message: "Message uploaded successfully"
          });
        } else {
          senderr(res);
        }
      }
    );
  });
});

/* UPDATE USER PROFILE */
service.post(
  "/updatemyprofile",
  passport.authenticate("jwt", {
    session: false
  }),
  function(req, res) {
    User.count(
      {
        _id: req.body.user_id
      },
      function(err, count) {
        if (count > 0) {
          User.findOneAndUpdate(
            {
              _id: req.body.user_id
            },
            {
              $set: req.body
            },
            {
              new: true
            }
          ).exec(function(err, userdata) {
            if (err) {
              senderr(res);
            } else {
              userdata.user_image = userdata.user_image;
              userdata.status = "true";
              res.json(userdata);
            }
          });
        } else {
          res.json({
            status: "false",
            message: "No user found"
          });
        }
      }
    );
  }
);

/* UPDATE USER PROFILE */
service.post(
  "/updatemyprivacy",
  passport.authenticate("jwt", {
    session: false
  }),
  function(req, res) {
    User.count(
      {
        _id: req.body.user_id
      },
      function(err, count) {
        if (count > 0) {
          User.findOneAndUpdate(
            {
              _id: req.body.user_id
            },
            {
              $set: req.body
            },
            {
              new: true
            }
          ).exec(function(err, userdata) {
            if (err) {
              senderr(res);
            } else {
              let userdetails = {
                user_id: req.body.user_id,
                privacy_last_seen: userdata.privacy_last_seen,
                privacy_about: userdata.privacy_about,
                privacy_profile_image: userdata.privacy_profile_image
              };
              chatServer.io.sockets.emit("makeprivate", userdetails);
            }
          });
        } else {
          res.json({
            status: "false",
            message: "No user found"
          });
        }
      }
    );
  }
);

/* VIEW USER PROFILE */
service.get(
  "/getuserprofile/:phone_no/:contact_id",
  passport.authenticate("jwt", {
    session: false
  }),
  function(req, res) {
    User.count(
      {
        _id: req.params.contact_id
      },
      function(err, count) {
        if (count > 0) {
          User.findOne(
            {
              _id: req.params.contact_id
            },
            function(err, userdata) {
              if (userdata) {
                userdata.contactstatus = "false";
                redisServer.redisClient.hget(
                  "contactlibrary",
                  req.params.contact_id.toString(),
                  function(err, contactcircle) {
                    if (!err && contactcircle != null) {
                      let contactObject = JSON.parse(contactcircle);
                      if (
                        contactObject != null &&
                        contactObject.toString().indexOf(req.params.phone_no) >=
                          0
                      ) {
                        userdata.contactstatus = "true";
                      }
                      res.json(userdata);
                    } else {
                      res.json(userdata);
                    }
                  }
                );
              } else {
                senderr(res);
              }
            }
          );
        } else {
          res.json({
            status: "false",
            message: "No user found"
          });
        }
      }
    );
  }
);

/* UPDATE MY CONTACTS */
service.post(
  "/updatemycontacts",
  passport.authenticate("jwt", {
    session: false
  }),
  function(req, res) {
    if (
      req.body.contacts !== null &&
      typeof req.body.contacts !== "undefined"
    ) {
      var contactList = JSON.parse(req.body.contacts);
      let nocontacts = {
        status: "false",
        message: "No contacts found"
      };
      User.find({
        _id: {
          $ne: req.body.user_id
        }
      })
        .where("phone_no")
        .in(contactList)
        .exec(function(err, contactrecords) {
          if (!err) {
            if (contactrecords.length > 0) {
              let phone = req.body.phone_no;
              let getmycontacts = myContacts(contactrecords, phone);
              getmycontacts.then(resdata => {
                res.json({
                  status: "true",
                  result: resdata
                });
              });
            } else {
              res.json(nocontacts);
            }
          } else {
            senderr(res);
          }
        });
    } else {
      res.json(nocontacts);
    }
  }
);

let myContacts = function(contactrecords, phone) {
  return new Promise(function(resolve, reject) {
    let contactData = [];
    for (let i = 0; i < contactrecords.length; i++) {
      let contactId = contactrecords[i]._id;
      contactrecords[i].contactstatus = "false";
      redisServer.redisClient.hget(
        "contactlibrary",
        contactId.toString(),
        function(err, contactcircle) {
          if (!err && contactcircle != null) {
            let contactObject = JSON.parse(contactcircle);
            if (
              contactObject != null &&
              contactObject.toString().indexOf(phone) >= 0
            ) {
              contactrecords[i].contactstatus = "true";
            }
          }
          contactData.push(contactrecords[i]);
          resolve(contactData);
        }
      );
    }
  });
};

/* SAVE MY CONTACTS */
service.post(
  "/savemycontacts",
  passport.authenticate("jwt", {
    session: false
  }),
  function(req, res) {
    if (
      req.body.contacts !== null &&
      typeof req.body.contacts !== "undefined"
    ) {
      var contactList = JSON.parse(req.body.contacts);
      User.find({
        _id: {
          $ne: req.body.user_id
        }
      })
        .where("phone_no")
        .in(contactList)
        .exec(function(err, contactrecords) {
          if (!err) {
            let contactList = CustomizeObject(contactrecords, "phone_no");
            redisServer.redisClient.hset(
              "contactlibrary",
              req.body.user_id,
              JSON.stringify(contactList)
            );
            res.json({
              status: "true",
              message: "Contacts saved successfully"
            });
          } else {
            senderr(res);
          }
        });
    } else {
      senderr(res);
    }
  }
);

/* GET USER BLOCK STATUS */
service.get(
  "/getblockstatus/:user_id",
  passport.authenticate("jwt", {
    session: false
  }),
  function(req, res) {
    let searchwhoblockedme = {
      buser_id: req.params.user_id
    };
    let searchiblocked = {
      user_id: req.params.user_id
    };
    let blockedme = [];
    let blockedbyme = [];
    Block.find(searchwhoblockedme).exec(function(err, blockedmelist) {
      if (!err) {
        blockedme = blockedmelist;
        Block.find(searchiblocked).exec(function(err, blockedlist) {
          if (!err) {
            blockedbyme = blockedlist;
            res.json({
              status: "true",
              blockedme: blockedme,
              blockedbyme: blockedbyme
            });
          } else {
            senderr(res);
          }
        });
      } else {
        senderr(res);
      }
    });
  }
);

/* RECENT CHATS WHEN BACK TO ONLINE */
service.get(
  "/recentchats/:user_id",
  passport.authenticate("jwt", {
    session: false
  }),
  function(req, res) {
    if (!req.params.user_id) {
      senderr(res);
    } else {
      let chatmessagesist = [];
      let groupchatresult;
      redisServer.redisClient.hgetall("privatechats", function(
        err,
        recentchatresult
      ) {
        if (!err) {
          const chatuserscount =
            typeof recentchatresult !== "undefined" && recentchatresult !== null
              ? Object.keys(recentchatresult).length
              : 0;
          if (chatuserscount > 0) {
            const chatmessages = Object.values(recentchatresult);
            for (i = 0; i < chatuserscount; i++) {
              let messagedata = JSON.parse(chatmessages[i]);
              chatmessagesist.push(messagedata);
            }
            const chatresult = groupArray(chatmessagesist, "receiver_id");
            groupchatresult = chatresult[req.params.user_id];
            if (
              typeof groupchatresult === "undefined" ||
              groupchatresult === null
            ) {
              groupchatresult = [];
            }
            if (groupchatresult.length > 0) {
              res.json({
                status: "true",
                result: groupchatresult
              });
            } else {
              res.json({
                status: "false",
                message: "No Chats found"
              });
            }
          } else {
            res.json({
              status: "false",
              message: "No Chats found"
            });
          }
        } else {
          senderr(res);
        }
      });
    }
  }
);

/* USER DEVICE REGISTER */
service.post(
  "/pushsignin",
  passport.authenticate("jwt", {
    session: false
  }),
  function(req, res) {
    if (
      !req.body.user_id ||
      !req.body.device_token ||
      !req.body.device_type ||
      !req.body.device_id
    ) {
      senderr(res);
    } else {
      UserDevices.count(
        {
          user_id: req.body.user_id
        },
        function(err, count) {
          if (count > 0) {
            UserDevices.findOneAndUpdate(
              {
                user_id: req.body.user_id
              },
              {
                $set: req.body
              }
            ).exec(function(err, userdevices) {
              if (err) {
                senderr(res);
              } else {
                res.json({
                  status: "true",
                  message: "Registered successfully"
                });
              }
            });
          } else {
            let newDevices = new UserDevices(req.body);
            newDevices.save(function(err) {
              if (!err) {
                res.json({
                  status: "true",
                  message: "Registered successfully"
                });
              } else {
                consoleerror(err);
              }
            });
          }
        }
      );
    }
  }
);

/* USER DEVICE UNREGISTER */
service.delete(
  "/pushsignout",
  passport.authenticate("jwt", {
    session: false
  }),
  function(req, res) {
    if (!req.body.device_id) {
      senderr(res);
    } else {
      UserDevices.count(
        {
          device_id: req.body.device_id
        },
        function(err, count) {
          if (count > 0) {
            UserDevices.findOneAndRemove(
              {
                device_id: req.body.device_id
              },
              function(err, count) {
                res.json({
                  status: "true",
                  message: "Unregistered successfully"
                });
              }
            );
          } else {
            senderr(res);
          }
        }
      );
    }
  }
);

/* VALIDATE USER BY DEVICE */
service.post(
  "/deviceinfo",
  passport.authenticate("jwt", {
    session: false
  }),
  function(req, res) {
    UserDevices.count(
      {
        user_id: req.body.user_id,
        device_id: req.body.device_id
      },
      function(err, count) {
        if (count > 0) {
          res.json({
            status: "true",
            message: "device exists"
          });
        } else {
          res.json({
            status: "false",
            message: "no device exists"
          });
        }
      }
    );
  }
);

/* CHAT RECEIVED STATUS */
service.post(
  "/chatreceived",
  passport.authenticate("jwt", {
    session: false
  }),
  function(req, res) {
    if (!req.body.message_id || !req.body.sender_id) {
      senderr(res);
    } else {
      if (
        typeof req.body.sender_id != "undefined" &&
        req.body.sender_id != null
      ) {
        redisServer.redisClient.hget("liveusers", req.body.sender_id, function(
          err,
          userresult
        ) {
          if (!err) {
            let chatresult = JSON.parse(userresult);
            if (typeof chatresult.socket != "undefined") {
              chatServer.io.sockets.connected[chatresult.socket].emit(
                "endchat",
                req.body
              );
            }
          }
        });
      }
    }
  }
);

/* UPDATE GROUP INFORMATION  */
service.post(
  "/modifyGroupinfo",
  passport.authenticate("jwt", {
    session: false
  }),
  function(req, res) {
    let query;
    Chatgroups.count(
      {
        _id: req.body.group_id
      },
      function(err, count) {
        if (count > 0) {
          if (req.body.group_members) {
            let updategroupmembers = JSON.parse(req.body.group_members);
            query = Chatgroups.findOneAndUpdate(
              {
                _id: req.body.group_id,
                "group_members.member_id": updategroupmembers[0].member_id
              },
              {
                $set: {
                  "group_members.$.member_role":
                    updategroupmembers[0].member_role,
                  modified_at: timeZone(),
                  modified_by: req.body.user_id
                }
              },
              {
                new: true
              }
            );
          } else {
            req.body.modified_at = timeZone();
            req.body.modified_by = req.body.user_id;
            query = Chatgroups.findOneAndUpdate(
              {
                _id: req.body.group_id
              },
              {
                $set: req.body
              },
              {
                new: true
              }
            );
          }
          query.exec(function(err, groupdata) {
            if (err) {
              senderr(res);
            } else {
              redisServer.redisClient.hget(
                "livegroups",
                req.body.group_id,
                function(err, groupcircle) {
                  if (!err && groupcircle != null) {
                    res.json({
                      status: "true",
                      result: groupdata
                    });
                  }
                }
              );
            }
          });
        } else {
          res.json({
            status: "false",
            message: "No Groups found"
          });
        }
      }
    );
  }
);

/* UPDATE GROUP MEMBERS INFORMATION  */
service.post(
  "/modifyGroupmembers",
  passport.authenticate("jwt", {
    session: false
  }),
  function(req, res) {
    Chatgroups.count(
      {
        _id: req.body.group_id
      },
      function(err, count) {
        if (count > 0) {
          req.body.group_members = JSON.parse(req.body.group_members);
          let query = {
              _id: req.body.group_id
            },
            update = {
              $set: {
                modified_at: timeZone(),
                modified_by: req.body.user_id
              },
              $push: {
                group_members: req.body.group_members
              }
            },
            options = {
              upsert: true,
              new: true
            };
          Chatgroups.findOneAndUpdate(query, update, options, function(
            err,
            groupdata
          ) {
            if (!err && !groupdata) {
              senderr(res);
            } else {
              redisServer.redisClient.hget(
                "livegroups",
                req.body.group_id,
                function(err, groupcircle) {
                  if (!err && groupcircle != null) {
                    res.json({
                      status: "true",
                      result: groupdata
                    });
                  } else {
                    senderr(res);
                  }
                }
              );
            }
          });
        } else {
          res.json({
            status: "false",
            message: "No Groups found"
          });
        }
      }
    );
  }
);

/* GET GROUPS INFO */
service.post(
  "/groupinfo",
  passport.authenticate("jwt", {
    session: false
  }),
  function(req, res) {
    var groupList = JSON.parse(req.body.group_list);
    Chatgroups.find()
      .where("_id")
      .in(groupList)
      .exec(function(err, grouprecords) {
        if (!err) {
          res.json({
            status: "true",
            result: grouprecords
          });
        } else {
          senderr(res);
        }
      });
  }
);

/* GET GROUP INVITES  */
service.get(
  "/groupinvites/:user_id",
  passport.authenticate("jwt", {
    session: false
  }),
  function(req, res) {
    redisServer.redisClient.hget("groupinvites", req.params.user_id, function(
      err,
      groupinvitations
    ) {
      if (!err && groupinvitations != null) {
        let groupinvitelist = JSON.parse(groupinvitations);
        let groupList = CustomizeObject(groupinvitelist.invites, "group_id");
        Chatgroups.find()
          .where("_id")
          .in(groupList)
          .exec(function(err, grouprecords) {
            if (!err) {
              redisServer.redisClient.hdel("groupinvites", req.params.user_id);
              res.json({
                status: "true",
                result: grouprecords
              });
            } else {
              senderr(res);
            }
          });
      } else {
        res.json({
          status: "false",
          message: "No Invites found"
        });
      }
    });
  }
);

let groupchatstorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, config.assets + "chats/");
  },
  filename: (req, file, cb) => {
    cb(
      null,
      file.fieldname + "-" + Date.now() + path.extname(file.originalname)
    );
  }
});

/* GROUP IMAGE UPLOAD */
service.post("/modifyGroupimage", function(req, res) {
  let groupchatupload = multer({
    storage: groupchatstorage
  }).single("group_image");
  groupchatupload(req, res, function(err) {
    req.body.modified_at = timeZone();
    req.body.modified_by = req.body.user_id;
    req.body.group_image = res.req.file.filename;
    Chatgroups.findOne(
      {
        _id: req.body.group_id
      },
      function(err, groupdata) {
        if (err) {
          senderr(res);
        } else {
          if (
            typeof groupdata.group_image != "undefined" &&
            groupdata.group_image != ""
          ) {
            unlinkFile(config.assets + "groupchats/" + groupdata.group_image);
          }
          Chatgroups.findOneAndUpdate(
            {
              _id: req.body.group_id
            },
            {
              $set: req.body
            },
            function(err) {
              if (err) {
                senderr(res);
              } else {
                res.json({
                  status: "true",
                  group_image:
                    typeof res.req.file.filename !== "undefined"
                      ? res.req.file.filename
                      : "",
                  message: "Group Image uploaded successfully"
                });
              }
            }
          );
        }
      }
    );
  });
});

/* GROUP CHAT UPLOAD */
service.post("/upmygroupchat", function(req, res) {
  let chatupload = multer({
    storage: groupchatstorage
  }).single("group_attachment");
  chatupload(req, res, function(err) {
    User.findOne(
      {
        _id: req.body.user_id
      },
      function(err, userdata) {
        if (userdata) {
          res.json({
            status: "true",
            user_image:
              typeof res.req.file.filename !== "undefined"
                ? res.req.file.filename
                : "",
            message: "Group Chat uploaded successfully"
          });
        } else {
          senderr(res);
        }
      }
    );
  });
});

/* RECENT GROUP CHATS WHEN BACK TO ONLINE */
service.get(
  "/recentgroupchats/:user_id",
  passport.authenticate("jwt", {
    session: false
  }),
  function(req, res) {
    if (!req.params.user_id) {
      senderr(res);
    } else {
      redisServer.redisClient.hget("groupchats", req.params.user_id, function(
        err,
        recentchatresult
      ) {
        if (!err && recentchatresult != null) {
          let recentChats = JSON.parse(recentchatresult);
          redisServer.redisClient.hdel("groupchats", req.params.user_id);
          res.json({
            status: "true",
            result: recentChats.chats
          });
        } else {
          res.json({
            status: "false",
            message: "No Chats found"
          });
        }
      });
    }
  }
);

service.get(
  "/recentcalls/:user_id",
  passport.authenticate("jwt", {
    session: false
  }),
  function(req, res) {
    if (!req.params.user_id) {
      senderr(res);
    } else {
      redisServer.redisClient.hget("livecalls", req.params.user_id, function(
        err,
        recentchatresult
      ) {
        if (!err && recentchatresult != null) {
          let recentChats = JSON.parse(recentchatresult);
          redisServer.redisClient.hdel("livecalls", req.params.user_id);
          res.json({
            status: "true",
            result: recentChats.missedcalls
          });
        } else {
          res.json({
            status: "false",
            message: "No Calls found"
          });
        }
      });
    }
  }
);

/* HELPS */
service.get("/helps", function(req, res) {
  let result = {};
  result.status = "true";
  Helps.find(
    {
      type: "terms"
    },
    function(err, helpterms) {
      result.terms = [];
      if (!err) {
        result.terms = helpterms;
      }
      Helps.find(
        {
          type: "helps"
        },
        function(err, faqterms) {
          result.faq = faqterms;
          res.json(result);
        }
      );
    }
  );
});

/* GET CHANNEL INFO */
service.post(
  "/channelinfo",
  passport.authenticate("jwt", {
    session: false
  }),
  function(req, res) {
    if (
      req.body.channel_list !== null &&
      typeof req.body.channel_list !== "undefined"
    ) {
      var channelList = JSON.parse(req.body.channel_list);
      let selectquery = {
        user_name: 1
      };
      Userchannels.find()
        .where("_id")
        .in(channelList)
        .populate("channel_admin_id", selectquery)
        .exec(function(err, channelrecords) {
          if (!err) {
            let allchannels = [];
            for (let i = 0; i < channelrecords.length; i++) {
              if ("channel_admin_id" in channelrecords[i]) {
                channelrecords[i].channel_adminId =
                  channelrecords[i].channel_admin_id._id;
                channelrecords[i].channel_admin =
                  channelrecords[i].channel_admin_id.user_name;
                channelrecords[i].channel_admin_id = "";
              }
              allchannels.push(channelrecords[i]);
            }
            res.json({
              status: "true",
              result: allchannels
            });
          } else {
            senderr(res);
          }
        });
    } else {
      senderr(res);
    }
  }
);

/* UPDATE CHANNEL INFO */
service.post(
  "/updatemychannel",
  passport.authenticate("jwt", {
    session: false
  }),
  function(req, res) {
    Userchannels.count(
      {
        _id: req.body.channel_id
      },
      function(err, count) {
        if (count > 0) {
          Userchannels.findOneAndUpdate(
            {
              _id: req.body.channel_id
            },
            {
              $set: req.body
            },
            {
              new: true
            }
          ).exec(function(err, channeldata) {
            if (err) {
              senderr(res);
            } else {
              let resultdata = channeldata;
              resultdata.status = "true";
              res.json(resultdata);
            }
          });
        } else {
          res.json({
            status: "false",
            message: "No channel found"
          });
        }
      }
    );
  }
);

let channelstorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, config.assets + "chats/");
  },
  filename: (req, file, cb) => {
    cb(
      null,
      file.fieldname + "-" + Date.now() + path.extname(file.originalname)
    );
  }
});

/* GROUP IMAGE UPLOAD */
service.post("/modifyChannelimage", function(req, res) {
  let channelupload = multer({
    storage: channelstorage
  }).single("channel_attachment");
  channelupload(req, res, function(err) {
    req.body.modified_at = timeZone();
    req.body.modified_by = req.body.user_id;
    req.body.channel_image =
      typeof res.req.file.filename !== "undefined" ? res.req.file.filename : "";
    Userchannels.findOne(
      {
        _id: req.body.channel_id
      },
      function(err, channeldata) {
        if (err) {
          if (
            typeof channeldata.channel_image != "undefined" &&
            channeldata.channel_image != ""
          ) {
            unlinkFile(config.assets + "channels/" + channeldata.channel_image);
          }
        } else {
          Userchannels.findOneAndUpdate(
            {
              _id: req.body.channel_id
            },
            {
              $set: req.body
            },
            function(err) {
              if (err) {
                senderr(res);
              } else {
                res.json({
                  status: "true",
                  channel_image: req.body.channel_image,
                  message: "Channel Image uploaded successfully"
                });
              }
            }
          );
        }
      }
    );
  });
});

/* GROUP CHAT UPLOAD */
service.post("/upmychannelchat", function(req, res) {
  let channelupload = multer({
    storage: channelstorage
  }).single("channel_attachment");
  channelupload(req, res, function(err) {
    User.findOne(
      {
        _id: req.body.user_id
      },
      function(err, userdata) {
        if (userdata) {
          res.json({
            status: "true",
            user_image:
              typeof res.req.file.filename !== "undefined"
                ? res.req.file.filename
                : "",
            message: "Channel Chat uploaded successfully"
          });
        } else {
          senderr(res);
        }
      }
    );
  });
});

/* RECENT CHANNEL CHATS WHEN BACK TO ONLINE */
service.get(
  "/recentChannelChats/:user_id",
  passport.authenticate("jwt", {
    session: false
  }),
  function(req, res) {
    if (!req.params.user_id) {
      senderr(res);
    } else {
      let result = redisServer.getRedis("userchannelchats", req.params.user_id);
      result.then(channelChats => {
        let recentChats = JSON.parse(channelChats);
        if (recentChats.length > 0) {
          res.json({
            status: "true",
            result: recentChats
          });
          redisServer.deleteRedis("userchannelchats", req.params.user_id);
        } else {
          res.json({
            status: "false",
            message: "No Chats found"
          });
        }
      });
    }
  }
);

/* RECENT CHANNEL INVITES WHEN BACK TO ONLINE */
service.get(
  "/recentChannelInvites/:user_id",
  passport.authenticate("jwt", {
    session: false
  }),
  function(req, res) {
    if (!req.params.user_id) {
      senderr(res);
    } else {
      let result = redisServer.getRedis(
        "userchannelinvites",
        req.params.user_id
      );
      result.then(Channels => {
        let recentChannels = JSON.parse(Channels);
        if (recentChannels.length > 0) {
          Userchannels.find()
            .where("_id")
            .in(recentChannels)
            .exec(function(err, records) {
              if (!err) {
                res.json({
                  status: "true",
                  result: records
                });
                redisServer.deleteRedis(
                  "userchannelinvites",
                  req.params.user_id
                );
              } else {
                senderr(res);
              }
            });
        } else {
          res.json({
            status: "false",
            message: "No Chats found"
          });
        }
      });
    }
  }
);

/* RECENT ADMIN CHANNEL CHATS  */
service.get(
  "/msgfromadminchannels/:timestamp",
  passport.authenticate("jwt", {
    session: false
  }),
  function(req, res) {
    if (!req.params.timestamp) {
      senderr(res);
    } else {
      Channelmessages.count(
        {
          message_at: {
            $gte: req.params.timestamp
          }
        },
        function(err, channelcount) {
          if (channelcount > 0) {
            Channelmessages.find({
              message_at: {
                $gte: req.params.timestamp
              }
            }).exec(function(err, channelrecords) {
              if (!err) {
                res.json({
                  status: "true",
                  result: channelrecords
                });
              } else {
                senderr(res);
              }
            });
          } else {
            res.json({
              status: "false",
              messsage: "No Channel Messages found"
            });
          }
        }
      );
    }
  }
);

/* USER'S OWN CHANNELS */
service.get(
  "/MyChannels/:user_id",
  passport.authenticate("jwt", {
    session: false
  }),
  function(req, res) {
    if (!req.params.user_id) {
      senderr(res);
    } else {
      let searchquery = {
        channel_admin_id: req.params.user_id,
        left_status: 0
      };
      Userchannels.count(searchquery, function(err, channelcount) {
        if (channelcount > 0) {
          Userchannels.find(searchquery).exec(function(err, channelrecords) {
            if (!err) {
              res.json({
                status: "true",
                result: channelrecords
              });
            } else {
              senderr(res);
            }
          });
        } else {
          res.json({
            status: "false",
            messsage: "No Channels found"
          });
        }
      });
    }
  }
);

/* USER'S SUBSCRIBED CHANNELS */
service.get(
  "/MySubscribedChannels/:user_id",
  passport.authenticate("jwt", {
    session: false
  }),
  function(req, res) {
    if (!req.params.user_id) {
      senderr(res);
    } else {
      let result = redisServer.getRedis("userchannels", req.params.user_id);
      result.then(Channels => {
        let recentChannels = JSON.parse(Channels);
        if (recentChannels.length > 0) {
          Userchannels.find()
            .where("_id")
            .in(recentChannels)
            .exec(function(err, records) {
              if (!err) {
                res.json({
                  status: "true",
                  result: records
                });
              } else {
                senderr(res);
              }
            });
        } else {
          res.json({
            status: "false",
            message: "No Channels found"
          });
        }
      });
    }
  }
);

/* ALL PUBLIC CHANNELS */
service.get(
  "/AllPublicChannels/:user_id/:search_string/:offset/:limit",
  passport.authenticate("jwt", {
    session: false
  }),
  function(req, res) {
    if (!req.params.user_id) {
      senderr(res);
    } else {
      let searchquery;
      searchquery = {
        channel_type: "public",
        left_status: 0,
        channel_name: {
          $regex: req.params.search_string,
          $options: "i"
        }
      };
      if (req.params.search_string == "all") {
        searchquery = {
          channel_type: "public",
          left_status: 0
        };
      }
      const limit = parseInt(req.params.limit);
      const offset = parseInt(req.params.offset);
      Userchannels.count(searchquery)
        .limit(limit)
        .skip(offset)
        .sort({
          _id: -1
        })
        .exec(function(err, channelcount) {
          if (channelcount > 0) {
            Userchannels.find(searchquery)
              .limit(limit)
              .skip(offset)
              .sort({
                _id: -1
              })
              .exec(function(err, channelrecords) {
                if (!err) {
                  res.json({
                    status: "true",
                    result: channelrecords
                  });
                } else {
                  senderr(res);
                }
              });
          } else {
            res.json({
              status: "false",
              messsage: "No Channels found"
            });
          }
        });
    }
  }
);

/* CHANNEL'S SUBSCRIBERS */
service.get(
  "/channelSubscribers/:channel_id/:phone_no/:offset/:limit",
  passport.authenticate("jwt", {
    session: false
  }),
  function(req, res) {
    if (!req.params.channel_id || !req.params.phone_no) {
      senderr(res);
    } else {
      let result = redisServer.getRedis("livechannels", req.params.channel_id);
      let noresult = {
        status: "false",
        message: "No Subscribers found"
      };
      result.then(Subscribers => {
        let TotalSubscribers = JSON.parse(Subscribers);
        if (TotalSubscribers.length > 0) {
          let from = parseInt(req.params.offset);
          let userlimit = parseInt(req.params.limit);
          let to = from + userlimit;
          limitSubscribers = TotalSubscribers.slice(from, to);
          User.find()
            .where("_id")
            .in(limitSubscribers)
            .exec(function(err, records) {
              if (!err) {
                if (records != null) {
                  let phone = req.params.phone_no;
                  let getmycontacts = myContacts(records, phone);
                  getmycontacts.then(resdata => {
                    res.json({
                      status: "true",
                      result: resdata
                    });
                  });
                } else {
                  res.json(noresult);
                }
              } else {
                senderr(res);
              }
            });
        } else {
          res.json(noresult);
        }
      });
    }
  }
);

/* RECENT ADMIN CHANNEL CHATS  */
service.get(
  "/adminchannels/:user_id",
  passport.authenticate("jwt", {
    session: false
  }),
  function(req, res) {
    if (!req.params.user_id) {
      senderr(res);
    } else {
      MyChannel.count(function(err, channelcount) {
        if (channelcount > 0) {
          MyChannel.find().exec(function(err, channelrecords) {
            if (!err) {
              res.json({
                status: "true",
                result: channelrecords
              });
            } else {
              senderr(res);
            }
          });
        } else {
          res.json({
            status: "false",
            messsage: "No Channels found"
          });
        }
      });
    }
  }
);

service.get(
  "/deleteMyAccount/:user_id",
  passport.authenticate("jwt", {
    session: false
  }),
  function(req, res) {
    if (!req.params.user_id) {
      senderr(res);
    } else {
      let userId = req.params.user_id;
      /* select queries */
      let blocksearch = {
        $or: [
          {
            user_id: userId
          },
          {
            buser_id: userId
          }
        ]
      };
      let userchannelsearch = {
        channel_admin_id: userId
      };

      /* deleting user's channels & block status */
      Block.remove(blocksearch, function(err) {
        if (!err) {
          Userchannels.remove(userchannelsearch, function(err) {
            groupContactDeleted(req.params.user_id);
            if (!err) {
              res.json({
                status: "true",
                message: "Account deleted successfully"
              });
            }
          });
        }
      });
    }
  }
);

/* GROUP CONTACT DELETED */
let groupContactDeleted = function(userId) {
  redisServer.redisClient.hget("usergroups", userId.toString(), function(
    err,
    mygroups
  ) {
    if (mygroups != null && !err) {
      var exitgroups = JSON.parse(mygroups);
      Chatgroups.find()
        .where("_id")
        .in(exitgroups)
        .exec(function(err, groupList) {
          if (!err) {
            if (groupList.length > 0) {
              for (let i = 0; i < groupList.length; i++) {
                let groupId = groupList[i];
                exitGroupMember(userId, groupId);
              }
            }
            DeleteUser(userId);
          }
        });
    } else {
      DeleteUser(userId);
    }
  });
};

/* EXIT GROUP ON CONTACT DELETED */
let exitGroupMember = function(userId, groupId) {
  Chatgroups.update(
    {
      _id: groupId
    },
    {
      $pull: {
        group_members: {
          member_id: userId
        }
      }
    },
    err => {
      if (!err) {
        redisServer.pullRedis("groups", groupId, userId);
        redisServer.pullRedis("usergroups", userId, groupId);
      }
    }
  );
};

let DeleteUser = function(userId) {
  let userdevicesearch = {
    user_id: userId
  };
  let usersearch = {
    _id: userId
  };
  UserDevices.remove(userdevicesearch, function(err) {
    if (!err) {
      User.remove(usersearch, function(err) {
        if (!err) {
          redisServer.deleteRedis("liveusers", userId);
          redisServer.deleteRedis("contactlibrary", userId);
          redisServer.deleteRedis("getbackchats", userId);
          redisServer.deleteRedis("getbackmessages", userId);
          redisServer.deleteRedis("groupchats", userId);
          redisServer.deleteRedis("userchannelchats", userId);
          redisServer.deleteRedis("userchannelinvites", userId);
          redisServer.deleteRedis("groupinvites", userId);
          redisServer.deleteRedis("userchannels", userId);
          redisServer.deleteRedis("usergroups", userId);
        } else {
          consoleerror(err);
        }
      });
    }
  });
};

/* USER'S JOINED GROUPS */
service.get(
  "/MyGroups/:user_id",
  passport.authenticate("jwt", {
    session: false
  }),
  function(req, res) {
    if (!req.params.user_id) {
      senderr(res);
    } else {
      let result = redisServer.getRedis("usergroups", req.params.user_id);
      result.then(Groups => {
        let recentGroups = JSON.parse(Groups);
        if (recentGroups.length > 0) {
          Chatgroups.find()
            .where("_id")
            .in(recentGroups)
            .exec(function(err, records) {
              if (!err) {
                res.json({
                  status: "true",
                  result: records
                });
              } else {
                senderr(res);
              }
            });
        } else {
          res.json({
            status: "false",
            message: "No Groups found"
          });
        }
      });
    }
  }
);

service.get(
  "/changeMyNumber/:user_id/:phone_no/:country_code",
  passport.authenticate("jwt", {
    session: false
  }),
  function(req, res) {
    if (
      !req.params.user_id ||
      !req.params.phone_no ||
      !req.params.country_code
    ) {
      senderr(res);
    } else {
      User.count(
        {
          phone_no: req.params.phone_no
        },
        function(err, count) {
          if (count > 0) {
            res.json({
              status: "false",
              message: "Account already exists with this number"
            });
          } else {
            User.findOneAndUpdate(
              {
                _id: req.params.user_id
              },
              {
                $set: {
                  phone_no: req.params.phone_no,
                  country_code: req.params.country_code
                }
              },
              {
                new: true
              }
            ).exec(function(err, userdata) {
              if (err) {
                senderr(res);
              } else {
                let userresult = {};
                userresult.user_id = userdata._id;
                userresult.phone_no = userdata.phone_no;
                userresult.user_name = userdata.user_name;
                res.json({
                  status: "true",
                  result: userresult
                });
              }
            });
          }
        }
      );
    }
  }
);

service.get(
  "/verifyMyNumber/:user_id/:phone_no",
  passport.authenticate("jwt", {
    session: false
  }),
  function(req, res) {
    if (!req.params.user_id || !req.params.phone_no) {
      senderr(res);
    } else {
      User.count(
        {
          phone_no: req.params.phone_no
        },
        function(err, count) {
          if (count > 0) {
            res.json({
              status: "false",
              message: "Account already exists with this number"
            });
          } else {
            res.json({
              status: "true",
              message: "Kindly verify with new number"
            });
          }
        }
      );
    }
  }
);

/* getall sitesettings */
service.get("/checkforupdates", function(req, res) {
  let sitesettings = [];
  Sitesetting.count(function(err, sitesettingscount) {
    if (sitesettingscount > 0) {
      Sitesetting.findOne()
        .sort({
          _id: -1
        })
        .exec(function(err, sitesettings) {
          if (!err) {
            res.json({
              status: true,
              android_update: sitesettings.android_update,
              android_version: sitesettings.android_version,
              ios_update: sitesettings.ios_update,
              ios_version: sitesettings.ios_version
            });
          } else {
            senderr(res);
          }
        });
    } else {
      res.json(sitesettings);
    }
  });
});

/* 1.1 VERSION */

/* JWT AUTHENTICATION */
getToken = function(headers) {
  if (headers && headers.authorization) {
    return headers.authorization;
  } else {
    return null;
  }
};

/* SEND ERROR MESSAGES */
senderr = function(res) {
  res.json({
    status: "false",
    message: "Something went to be wrong"
  });
};

/* DELETE FILE */
unlinkFile = function(imagepath) {
  fs.unlink(imagepath, function(err) {
    if (!err) {
      // console.log('File deleted!');
    } else {
      // console.log('File not deleted!');
    }
  });
};

module.exports = service;
