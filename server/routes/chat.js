const httpsMode = "disable"; /* disable for http (or) enable for https */
const fs = require("fs"),
  express = require("express"),
  chatservice = express.Router(),
  app = express();
let server = require("http").createServer(app);
if (httpsMode == "enable") {
  const privateKey = fs.readFileSync("");
  const certificate = fs.readFileSync("");
  const ca = fs.readFileSync("");

  /* SSL OPTIONS */
  const sslOptions = {
    key: privateKey,
    cert: certificate,
    ca: ca
  };

  let server = require("https").createServer(sslOptions, app);
}

const io = require("socket.io")(server, {
    pingInterval: 2000,
    pingTimeout: 5000
  }),
  config = require("../keys"),
  cron = require("node-cron"),
  port = process.env.PORT || config.socketPort;

/* MODELS */
let Block = require("../models/blockModel");
let Chatgroups = require("../models/chatgroupModel");
let Userchannels = require("../models/userchannelModel");

/* SOCKET.IO CONNECTVITY */
server.listen(port, function() {
  console.log("SOCKET.IO IS WORKING ON ", port);
});

let chatcircle = {}; /* PRIVATE CHAT */

// io.sockets.setMaxListeners(30);

/* PUSHNOTIFICATIONS */
let notificationServer = require("./pushNotification");

/* REDIS SERVER */
let redisServer = require("./redisServer");

/* ON SOCKET CONNECTS */
io.sockets.on("connection", function(socket) {
  // console.log("MAXIMUM AMOUNT OF LISTENER: " + io.sockets.getMaxListeners());

  /* CONNECTING TO CHATBOX PRIVATE CHAT */
  socket.on("chatbox", function(data) {
    if (typeof data.user_id != "undefined" && data.user_id != null) {
      socket.user_id = data.user_id; // socket session user"s id
      const socketdata = {
        socket: socket.id,
        lastseen: timeZone(),
        livestatus: "online"
      };
      chatcircle[data.user_id] = socketdata;
      redisServer.redisClient.hset(
        "liveusers",
        data.user_id,
        JSON.stringify(socketdata)
      );
      redisServer.redisClient.set(
        "liveusercount",
        typeof Object.keys(chatcircle).length !== "undefined"
          ? Object.keys(chatcircle).length
          : 0
      );
      if (data.user_id in chatcircle) {
        if (typeof chatcircle[data.user_id].socket != "undefined") {
          /* YOU GOT PRIVATE CHATS WHEN OFFLINE */
          redisServer.redisClient.hget("getbackchats", data.user_id, function(
            err,
            offlinechats
          ) {
            if (offlinechats != null && !err) {
              io.sockets.connected[chatcircle[data.user_id].socket].emit(
                "offlinereadstatus",
                JSON.parse(offlinechats)
              );
            }
          });

          /* YOU GOT PRIVATE MESSAGES WHEN OFFLINE */
          redisServer.redisClient.hget(
            "getbackmessages",
            data.user_id,
            function(err, offlinemessages) {
              if (offlinemessages != null && !err) {
                io.sockets.connected[chatcircle[data.user_id].socket].emit(
                  "offlinedeliverystatus",
                  JSON.parse(offlinemessages)
                );
              }
            }
          );
        }
      }
      redisServer.redisClient.hdel("getbackchats", data.user_id);
      redisServer.redisClient.hdel("getbackmessages", data.user_id);
      console.log("Chatbox members are: " + JSON.stringify(chatcircle));
    }
  });

  /* CHECK YOUR FRIEND IS TYPING IN CHATBOX*/
  socket.on("typing", function(data) {
    if (typeof data.receiver_id != "undefined" && data.receiver_id != null) {
      if (data.receiver_id in chatcircle) {
        if (typeof chatcircle[data.receiver_id].socket != "undefined") {
          io.sockets.connected[chatcircle[data.receiver_id].socket].emit(
            "listentyping",
            data
          );
        }
      }
    }
  });

  /* START MESSSAGING YOUR FRIEND */
  socket.on("startchat", function(data) {
    redisServer.redisClient.hset(
      "privatechats",
      data.message_data.message_id,
      JSON.stringify(data.message_data)
    );
    if (typeof data.receiver_id != "undefined" && data.receiver_id != null) {
      if (data.receiver_id in chatcircle) {
        if (typeof chatcircle[data.receiver_id].socket != "undefined") {
          io.sockets.connected[chatcircle[data.receiver_id].socket].emit(
            "receivechat",
            data
          );
        }
      }
      notificationServer.sendNotification(
        data.receiver_id,
        data.message_data.message,
        data
      );
    }
  });

  /* MESSAGE RECEIVED BY YOUR FRIEND */
  socket.on("chatreceived", function(data) {
    redisServer.redisClient.hdel("privatechats", data.message_id, function(
      err,
      result
    ) {
      if (typeof data.sender_id != "undefined" && data.sender_id != null) {
        if (data.sender_id in chatcircle) {
          if (typeof chatcircle[data.sender_id].socket != "undefined") {
            io.sockets.connected[chatcircle[data.sender_id].socket].emit(
              "endchat",
              data
            );
          }
        } else {
          redisServer.redisClient.hget(
            "getbackmessages",
            data.sender_id,
            function(err, messageinfo) {
              if (messageinfo != null) {
                var obj = JSON.parse(messageinfo);
                obj.messages.push(data);
                redisServer.redisClient.hset(
                  "getbackmessages",
                  data.sender_id,
                  JSON.stringify(obj)
                );
              } else {
                let datas = [data];
                let messagedata = {
                  messages: datas
                };
                redisServer.redisClient.hset(
                  "getbackmessages",
                  data.sender_id,
                  JSON.stringify(messagedata)
                );
              }
            }
          );
        }
      }
    });
  });

  /* CHAT VIEWED BY YOUR FRIEND */
  socket.on("chatviewed", function(data) {
    if (typeof data.sender_id != "undefined" && data.sender_id != null) {
      if (data.sender_id in chatcircle) {
        if (typeof chatcircle[data.sender_id].socket != "undefined") {
          io.sockets.connected[chatcircle[data.sender_id].socket].emit(
            "viewchat",
            data
          );
        }
      } else {
        redisServer.redisClient.hget("getbackchats", data.sender_id, function(
          err,
          messageinfo
        ) {
          if (messageinfo != null && !err) {
            var obj = JSON.parse(messageinfo);
            obj.chats.push(data);
            redisServer.redisClient.hset(
              "getbackchats",
              data.sender_id,
              JSON.stringify(obj)
            );
          } else {
            let datas = [data];
            let messagedata = {
              chats: datas
            };
            redisServer.redisClient.hset(
              "getbackchats",
              data.sender_id,
              JSON.stringify(messagedata)
            );
          }
        });
      }
    }
  });

  /* CHECK YOUR FRIEND ONLINE STATUS */
  socket.on("online", function(data) {
    if (typeof data.contact_id != "undefined" && data.contact_id != null) {
      data.livestatus = "online";
      if (data.user_id in chatcircle && data.contact_id in chatcircle) {
        if (typeof chatcircle[data.user_id].socket != "undefined") {
          io.sockets.connected[chatcircle[data.user_id].socket].emit(
            "onlinestatus",
            data
          );
        }
      } else {
        redisServer.redisClient.hget("liveusers", data.contact_id, function(
          err,
          liveresult
        ) {
          if (!err) {
            let user_last_seen = "";
            let user_livestatus = "";
            let livechatresult = JSON.parse(liveresult);
            if (liveresult != null && typeof liveresult != "undefined") {
              user_last_seen = parseInt(livechatresult.lastseen);
              user_livestatus = livechatresult.livestatus.toString();
            }
            const livestatusdata = {
              livestatus: user_livestatus,
              lastseen: user_last_seen,
              contact_id: data.contact_id
            };
            if (data.user_id in chatcircle) {
              if (typeof chatcircle[data.user_id].socket != "undefined") {
                io.sockets.connected[chatcircle[data.user_id].socket].emit(
                  "onlinestatus",
                  livestatusdata
                );
              }
            }
          }
        });
      }
    }
  });

  /* BLOCK YOUR FRIEND & MARK HIM AS ENEMY */
  socket.on("block", function(data) {
    let blockdata = {
      user_id: data.sender_id,
      buser_id: data.receiver_id
    };
    Block.count(blockdata, function(err, count) {
      if (count > 0) {
        Block.findOneAndRemove(blockdata, function(err, count) {
          if (!err) {
            if (
              typeof data.receiver_id != "undefined" &&
              data.receiver_id != null
            ) {
              if (data.receiver_id in chatcircle) {
                if (typeof chatcircle[data.receiver_id].socket != "undefined") {
                  io.sockets.connected[
                    chatcircle[data.receiver_id].socket
                  ].emit("blockstatus", data);
                }
              }
            }
          } else {
            consoleerror(err);
          }
        });
      } else {
        let newBlock = new Block(blockdata);
        newBlock.save(function(err, blockinfo) {
          if (!err) {
            if (
              typeof data.receiver_id != "undefined" &&
              data.receiver_id != null
            ) {
              if (data.receiver_id in chatcircle) {
                if (typeof chatcircle[data.receiver_id].socket != "undefined") {
                  io.sockets.connected[
                    chatcircle[data.receiver_id].socket
                  ].emit("blockstatus", data);
                }
              }
            }
          } else {
            consoleerror(err);
          }
        });
      }
    });
  });

  /* OUT OF THE CHATBOX */
  socket.on("disconnect", function() {
    console.log("Disconnected");
    if (
      (chatcircle.toString().indexOf(socket.user_id) >= 0 &&
        typeof socket.user_id != "undefined") ||
      socket.user_id != null
    ) {
      const userdata = {
        lastseen: timeZone(),
        livestatus: "offline"
      };
      delete chatcircle[socket.user_id];
      var liveusercount = Object.keys(chatcircle).length;
      redisServer.redisClient.set("liveusercount", liveusercount);
      redisServer.redisClient.hset(
        "liveusers",
        socket.user_id,
        JSON.stringify(userdata)
      );
    }
  });

  /* CREATE NEW CHAT GROUP */
  socket.on("createGroup", function(data) {
    if (
      typeof data.user_id != "undefined" &&
      data.user_id != null &&
      typeof data.group_name != "undefined" &&
      data.group_name != null &&
      typeof data.group_members != "undefined" &&
      data.group_members != null
    ) {
      let group_members = JSON.parse(JSON.stringify(data.group_members));
      let newChatgroup = new Chatgroups({
        group_admin_id: data.user_id,
        group_name: data.group_name,
        group_members: group_members,
        group_image: "",
        created_at: timeZone()
      });
      newChatgroup.save(function(err, groupinfo) {
        if (!err) {
          const groupdata = {
            created_at: timeZone(),
            group_name: groupinfo.group_name
          };
          let groupId = groupinfo._id.toString();
          redisServer.redisClient.hset(
            "livegroups",
            groupId,
            JSON.stringify(groupdata)
          );
          redisServer.redisClient.set(
            "livegroupscount",
            typeof Object.keys(chatcircle).length !== "undefined"
              ? Object.keys(chatcircle).length
              : 0
          );
          socket.join(groupinfo._id);
          let memberlist = CustomizeObject(data.group_members, "member_id");
          memberlist.forEach(function(group_memberid) {
            let memberId = group_memberid;
            redisServer.pushRedis("usergroups", group_memberid, groupId);
            if (group_memberid in chatcircle) {
              if (typeof chatcircle[group_memberid].socket != "undefined") {
                io.sockets.connected[chatcircle[group_memberid].socket].emit(
                  "groupInvitation",
                  groupinfo
                );
                var connectedsocketid =
                  io.sockets.connected[chatcircle[group_memberid].socket];
                connectedsocketid.join(groupinfo._id);
              }
            } else {
              /* GROUP INVITATIONS */
              groupInvitations(group_memberid, groupinfo);
            }
          });
          let groupnotify = {
            id: groupinfo._id,
            admin_id: groupinfo.group_admin_id,
            title: groupinfo.group_name,
            chat_type: "groupinvitation"
          };
          let customizeMsg = {};
          customizeMsg.message_data = groupnotify;
          notificationServer.sendNotifications(
            memberlist,
            "You added to this group",
            customizeMsg
          );
        } else {
          consoleerror(err);
        }
      });
    }
  });

  /* JOIN A GROUP */
  socket.on("joinGroup", function(data) {
    if (
      data.member_id != null &&
      typeof data.member_id != "undefined" &&
      data.group_id != null &&
      typeof data.group_id != "undefined"
    ) {
      redisServer.redisClient.hget("livegroups", data.group_id, function(
        err,
        groupcircle
      ) {
        if (!err && groupcircle != null && data.member_id in chatcircle) {
          let groupinfo = JSON.parse(groupcircle);
          // console.log("NEW MEMBER JOINED IN THE GROUP " + groupinfo.group_name);
          socket.join(data.group_id);
        }
      });
    }
  });

  /* MESSAGING ON GROUP CHAT */
  socket.on("msgToGroup", function(data) {
    if (
      data.member_id != null &&
      typeof data.member_id != "undefined" &&
      data.group_id != null &&
      typeof data.group_id != "undefined"
    ) {
      redisServer.redisClient.hget("livegroups", data.group_id, function(
        err,
        groupcircle
      ) {
        if (!err) {
          let customizeMsg = {};
          customizeMsg.message_data = data;
          Chatgroups.findById(data.group_id, function(err, groupdata) {
            let memberlist = CustomizeObject(
              groupdata.group_members,
              "member_id"
            );
            memberlist.forEach(function(group_memberid) {
              if (group_memberid in chatcircle) {
                if (typeof chatcircle[group_memberid].socket != "undefined") {
                  io.sockets.connected[chatcircle[group_memberid].socket].emit(
                    "msgFromGroup",
                    data
                  );
                }
              }
              redisServer.redisClient.hget(
                "groupchats",
                group_memberid,
                function(err, messageinfo) {
                  if (messageinfo != null && !err) {
                    let datas = data;
                    var obj = JSON.parse(messageinfo);
                    obj.chats.push(datas);
                    redisServer.redisClient.hset(
                      "groupchats",
                      group_memberid,
                      JSON.stringify(obj)
                    );
                  } else {
                    let datas = [data];
                    let messagedata = {
                      chats: datas
                    };
                    redisServer.redisClient.hset(
                      "groupchats",
                      group_memberid,
                      JSON.stringify(messagedata)
                    );
                  }
                }
              );
            });
            notificationServer.sendNotifications(
              memberlist,
              data.message,
              customizeMsg
            );
          });
        } else {
          consoleerror(err);
        }
      });
    }
  });

  /* GROUP CHATS RECEIVED */
  socket.on("groupchatreceived", function(data) {
    redisServer.deleteRedis("groupchats", data.user_id);
  });

  /* EXIT GROUP  */
  socket.on("exitFromGroup", function(data) {
    if (
      data.member_id != null &&
      typeof data.member_id != "undefined" &&
      data.group_id != null &&
      typeof data.group_id != "undefined"
    ) {
      redisServer.redisClient.hget("livegroups", data.group_id, function(
        err,
        groupcircle
      ) {
        if (!err && groupcircle != null) {
          Chatgroups.count(
            {
              _id: data.group_id
            },
            function(err, count) {
              if (count > 0) {
                Chatgroups.update(
                  {
                    _id: data.group_id
                  },
                  {
                    $pull: {
                      group_members: {
                        member_id: data.member_id
                      }
                    }
                  },
                  err => {
                    if (err) {
                      consoleerror(err);
                    } else {
                      redisServer.pullRedis(
                        "usergroups",
                        data.member_id,
                        data.group_id
                      );
                      if (data.member_id in chatcircle) {
                        if (
                          typeof chatcircle[data.member_id].socket !=
                          "undefined"
                        ) {
                          var connectedsocketid =
                            io.sockets.connected[
                              chatcircle[data.member_id].socket
                            ];
                          connectedsocketid.leave(data.group_id);
                        }
                      }
                    }
                  }
                );
              } else {
                consoleerror(err);
              }
            }
          );
        }
      });
    }
  });

  /* TYPING IN GROUP  */
  socket.on("groupTyping", function(data) {
    if (
      data.member_id != null &&
      typeof data.member_id != "undefined" &&
      data.group_id != null &&
      typeof data.group_id != "undefined"
    ) {
      redisServer.redisClient.hget("livegroups", data.group_id, function(
        err,
        groupcircle
      ) {
        if (!err && groupcircle != null && data.member_id in chatcircle) {
          io.in(data.group_id).emit("listenGroupTyping", data);
        }
      });
    }
  });

  /* CALLS */
  socket.on("create or join", function(room) {
    // console.log("Received request to create or join room ", room);
    socket.join(room);
    var clients = io.sockets.adapter.rooms[room].sockets;
    var numClients =
      typeof clients !== "undefined" ? Object.keys(clients).length : 0;
    log("Room " + room + " now has " + numClients + " client(s)");
    if (numClients === 1) {
      log("Client ID " + socket.id + " created room " + room);
      socket.emit("created", room, socket.id);
    } else if (numClients === 2) {
      log("Client ID " + socket.id + " joined room " + room);
      io.sockets.in(room).emit("join", room);
      socket.emit("joined", room, socket.id);
      io.sockets.in(room).emit("ready");
      redisServer.redisClient.incr("successcalls"); /* on successful calls */
    } else {
      // console.log("full", room);
    }
  });

  function log() {
    var array = ["Message from server:"];
    array.push.apply(array, arguments);
    // console.log.apply(console, array);
  }

  socket.on("rtcmessage", function(data) {
    // log("Client says: ", data);
    if (data.type != "candidate")
      io.sockets.in(data.room).emit("rtcmessage", data.message);
    else io.sockets.in(data.room).emit("rtcmessage", data);
  });

  socket.on("bye", function(room) {
    // console.log("received bye from ", room);
    // console.log("received count in ", (typeof io.sockets.adapter.rooms[room] !== "undefined") ? io.sockets.adapter.rooms[room].length : 0);
    socket.leave(room);
    // console.log("received count out ", (typeof io.sockets.adapter.rooms[room] !== "undefined") ? io.sockets.adapter.rooms[room].length : 0);
    io.sockets.in(room).emit("bye", room);
  });

  socket.on("createCall", function(data) {
    if (typeof data.user_id != "undefined" && data.user_id != null) {
      if (data.user_id in chatcircle) {
        if (typeof chatcircle[data.user_id].socket != "undefined") {
          io.sockets.connected[chatcircle[data.user_id].socket].emit(
            "callCreated",
            data
          );
        }
      } else {
        redisServer.redisClient.hget(
          "livecalls",
          data.user_id.toString(),
          function(err, messageinfo) {
            if (messageinfo != null && !err) {
              let datas = data;
              var obj = JSON.parse(messageinfo);
              obj.missedcalls.push(datas);
              redisServer.redisClient.hset(
                "livecalls",
                data.user_id.toString(),
                JSON.stringify(obj)
              );
            } else {
              let datas = [data];
              let messagedata = {
                missedcalls: datas
              };
              redisServer.redisClient.hset(
                "livecalls",
                data.user_id.toString(),
                JSON.stringify(messagedata)
              );
            }
          }
        );
      }
      let customizeMsg = {};
      customizeMsg.message_data = data;
      notificationServer.callNotification(data.user_id, "", customizeMsg);
    }
  });

  /* CHANNELS */

  /* CREATE CHANNEL */
  socket.on("createChannel", function(data) {
    if (
      typeof data.user_id != "undefined" &&
      data.user_id != null &&
      typeof data.channel_name != "undefined" &&
      data.channel_name != null &&
      typeof data.channel_type != "undefined" &&
      data.channel_type != null
    ) {
      let newUserChannel = new Userchannels({
        channel_admin_id: data.user_id,
        channel_name: data.channel_name,
        channel_des: data.channel_des,
        channel_type: data.channel_type,
        channel_image: "",
        created_time: timeZone()
      });
      newUserChannel.save(function(err, newchannelinfo) {
        if (!err) {
          socket.emit("Channelcreated", newchannelinfo);
        } else {
          consoleerror(err);
        }
      });
    } else {
      senderr(res);
    }
  });

  /* SEND CHANNEL INVITATION */
  socket.on("sendChannelInvitation", function(data) {
    if (
      typeof data.channel_id != "undefined" &&
      data.channel_id != null &&
      typeof data.invite_subscribers != "undefined" &&
      data.invite_subscribers != null
    ) {
      Userchannels.findById(data.channel_id, function(err, channelinfo) {
        if (!err) {
          let inviteSubscribers = data.invite_subscribers;
          let channelInvites = JSON.parse(inviteSubscribers);
          let result = redisServer.getRedis("livechannels", data.channel_id);
          result.then(groupMembers => {
            let joined_members = JSON.parse(groupMembers);
            let newMembers = [];
            for (let i = 0; i < channelInvites.length; i++) {
              let invite_id = channelInvites[i];
              if (joined_members.toString().indexOf(invite_id) == -1) {
                newMembers.push(invite_id);
                if (invite_id in chatcircle) {
                  if (
                    typeof chatcircle[invite_id].socket != "undefined" ||
                    chatcircle[invite_id].socket != null
                  ) {
                    io.sockets.connected[chatcircle[invite_id].socket].emit(
                      "receiveChannelInvitation",
                      channelinfo
                    );
                  }
                } else {
                  redisServer.pushRedis(
                    "userchannelinvites",
                    invite_id,
                    data.channel_id
                  );
                }
              }
            }

            /* NOTIFY MEMBERS WITH INVITATIONS */
            if (newMembers.length > 0) {
              let groupnotify = {
                id: channelinfo._id,
                title: channelinfo.channel_name,
                chat_type: "channelinvitation"
              };
              let customizeMsg = {};
              customizeMsg.message_data = groupnotify;
              notificationServer.sendNotifications(
                newMembers,
                "You got an invitation from channel",
                customizeMsg
              );
            }
          });
        } else {
          senderr(res);
        }
      });
    } else {
      senderr(res);
    }
  });

  /* SUBSCRIBE CHANNEL */
  socket.on("subscribeChannel", function(data) {
    if (
      data.user_id != null &&
      typeof data.user_id != "undefined" &&
      data.channel_id != null &&
      typeof data.channel_id != "undefined"
    ) {
      redisServer.pushRedis("livechannels", data.channel_id, data.user_id);
      redisServer.pushRedis("userchannels", data.user_id, data.channel_id);
      updateSubscribers(data.channel_id, 1);
    }
  });

  /* UNSUBSCRIBE CHANNEL */
  socket.on("unsubscribeChannel", function(data) {
    if (
      data.user_id != null &&
      typeof data.user_id != "undefined" &&
      data.channel_id != null &&
      typeof data.channel_id != "undefined"
    ) {
      redisServer.pullRedis("livechannels", data.channel_id, data.user_id);
      redisServer.pullRedis("userchannels", data.user_id, data.channel_id);
      updateSubscribers(data.channel_id, -1);
    }
  });

  /* LEAVE CHANNEL */
  socket.on("leaveChannel", function(data) {
    if (
      data.user_id != null &&
      typeof data.user_id != "undefined" &&
      data.channel_id != null &&
      typeof data.channel_id != "undefined"
    ) {
      Userchannels.findOneAndUpdate(
        {
          _id: data.channel_id,
          channel_admin_id: data.user_id
        },
        {
          left_status: 1
        },
        function(err) {
          if (err) {
            consoleerror(err);
          }
        }
      );
    }
  });

  /* UPDATE SUBSCRIBERS */
  let updateSubscribers = function(channelId, count) {
    Userchannels.findOneAndUpdate(
      {
        _id: channelId
      },
      {
        $inc: {
          total_subscribers: count
        }
      },
      function(err) {
        if (err) {
          consoleerror(err);
        }
      }
    );
  };

  /* MESSAGING ON GROUP CHAT */
  socket.on("msgToChannel", function(data) {
    if (data.channel_id != null && typeof data.channel_id != "undefined") {
      Userchannels.count(
        { channel_id: data.channel_id, block_status: 0 },
        function(err, channelinfo) {
          if (count > 0) {
            let result = redisServer.getRedis("livechannels", data.channel_id);
            let offline_subscribers = [];
            let customizeMsg = {};
            customizeMsg.message_data = data;
            result.then(blob => {
              let res = JSON.parse(blob);
              for (let i = 0; i < res.length; i++) {
                let userId = res[i];
                if (userId in chatcircle) {
                  if (typeof chatcircle[userId].socket != "undefined") {
                    io.sockets.connected[chatcircle[userId].socket].emit(
                      "msgFromChannel",
                      data
                    );
                  } else {
                    offline_subscribers.push(userId);
                    redisServer.pushRedis("userchannelchats", userId, data);
                  }
                } else {
                  offline_subscribers.push(userId);
                  redisServer.pushRedis("userchannelchats", userId, data);
                }
              }
              notificationServer.sendNotifications(
                res,
                data.message,
                customizeMsg
              );
            });
          } else {
            io.sockets.emit("channelblocked", data);
          }
        }
      );
    }
  });
});

/* CUSTOMIZE YOUR JSON WITH THE OBJECT */
CustomizeObject = function getFields(input, field) {
  return input.map(function(o) {
    return o[field];
  });
};

/* CONSOLE ERROR MESSAGES */
consoleerror = function(err) {
  console.log("ERROR CONSOLE: " + err);
};

/* TIMEZONE BY SERVER */
timeZone = function() {
  let selectedDate = new Date();
  // selectedDate.setHours(selectedDate.getHours() + 5);
  // selectedDate.setMinutes(selectedDate.getMinutes() + 30);
  let currentDate = selectedDate;
  let currentTime = currentDate.getTime();
  let localOffset = -1 * selectedDate.getTimezoneOffset() * 60000;
  let timestamp = Math.round(
    new Date(currentTime + localOffset).getTime() / 1000
  );
  let newtimestamp = timestamp;
  return newtimestamp;
};

/* GROUP INVITATIONS */
let groupInvitations = function(group_memberid, groupdata) {
  let new_invites = {
    group_id: groupdata._id,
    group_image: groupdata.group_image,
    invited_at: timeZone()
  };
  redisServer.redisClient.hget("groupinvites", group_memberid, function(
    err,
    invitations
  ) {
    if (invitations != null && !err) {
      var obj = JSON.parse(invitations);
      obj.invites.push(new_invites);
      redisServer.redisClient.hset(
        "groupinvites",
        group_memberid,
        JSON.stringify(obj)
      );
    } else {
      let datas = [new_invites];
      let obj = {
        invites: datas
      };
      redisServer.redisClient.hset(
        "groupinvites",
        group_memberid,
        JSON.stringify(obj)
      );
    }
  });
};

/* SAVE GROUPS BASED ON USER  */
let joinMyGroups = function(groupId, MemberList) {
  MemberList.forEach(function(group_memberid) {
    redisServer.redisClient.hget("usergroups", group_memberid, function(
      err,
      invitations
    ) {
      if (invitations != null && !err) {
        var obj = JSON.parse(invitations);
        obj.mygroups.push({
          group_id: groupId
        });
        redisServer.redisClient.hset(
          "usergroups",
          group_memberid,
          JSON.stringify(obj)
        );
      } else {
        let datas = [
          {
            group_id: groupId
          }
        ];
        let obj = {
          mygroups: datas
        };
        redisServer.redisClient.hset(
          "usergroups",
          group_memberid,
          JSON.stringify(obj)
        );
      }
    });
  });
};

module.exports = {
  chatservice: chatservice,
  io: io
};
