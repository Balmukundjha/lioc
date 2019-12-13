/* npm libraries */
const express = require("express"),
  passport = require("passport"),
  service = express.Router();
require("../userjwt")(passport);

/* models */
let User = require("../models/userModel");
let Groups = require("../models/chatgroupModel");
let Userdevices = require("../models/userdeviceModel");
let Mychannel = require("../models/mychannelModel");
let Userchannel = require("../models/userchannelModel");
let Reports = require("../models/reportModel");

/* REDIS SERVER */
let redisServer = require("./redisServer");

/* signin or signup as user */
service.get("/usercount", function(req, res) {
  let nousers = 0;
  User.count(function(err, usercount) {
    if (err) {
      res.json(nousers);
    } else {
      res.json(usercount);
    }
  });
});

/* get all user list */
service.get("/getallusers", function(req, res) {
  let users = [];
  User.count(function(err, usercount) {
    if (usercount > 0) {
      User.find()
        .select()
        .sort({
          _id: -1
        })
        .exec(function(err, allusers) {
          if (!err) {
            res.json({
              status: true,
              count: usercount,
              result: allusers
            });
          } else {
            senderr(res);
          }
        });
    } else {
      res.json({
        status: false,
        count: 0,
        result: users
      });
    }
  });
});

/* get all user's channels list */
service.get("/getuserchannels", function(req, res) {
  let users = [];
  Userchannel.count(function(err, usercount) {
    if (usercount > 0) {
      Userchannel.find({
        $or: [
          {
            channel_type: "public"
          },
          {
            channel_type: "private"
          }
        ]
      })
        .select({
          channel_name: 1,
          channel_type: 1,
          total_subscribers: 1,
          report_count: 1,
          created_date: 1,
          created_time: 1,
          block_status: 1
        })
        .sort({
          _id: -1
        })
        .exec(function(err, allusers) {
          if (!err) {
            res.json({
              status: true,
              count: usercount,
              result: allusers
            });
          } else {
            senderr(res);
          }
        });
    } else {
      res.json({
        status: false,
        count: 0,
        result: users
      });
    }
  });
});

/* get recent groups list */
service.get("/getrecentgroups", function(req, res) {
  let groups = [];
  Groups.count(function(err, groupcount) {
    if (groupcount > 0) {
      Groups.find()
        .select({
          group_members_count: 1,
          group_members: 1,
          group_name: 1,
          group_image: 1,
          _id: 0
        })
        .sort({
          _id: -1
        })
        .limit(5)
        .exec(function(err, allgroups) {
          if (!err) {
            res.json({
              status: true,
              count: groupcount,
              result: allgroups
            });
          } else {
            senderr(res);
          }
        });
    } else {
      res.json({
        status: false,
        count: 0,
        result: groups
      });
    }
  });
});

/* get all user list */
service.get("/getrecentusers", function(req, res) {
  let users = [];
  User.count(function(err, usercount) {
    if (usercount > 0) {
      User.find()
        .select({
          user_name: 1,
          user_image: 1,
          about: 1,
          _id: 0
        })
        .sort({
          _id: -1
        })
        .limit(5)
        .exec(function(err, allusers) {
          if (!err) {
            res.json({
              status: true,
              count: usercount,
              result: allusers
            });
          } else {
            senderr(res);
          }
        });
    } else {
      res.json({
        status: false,
        count: 0,
        result: users
      });
    }
  });
});

/* get trending public channels */
service.get("/getpublicchannels", function(req, res) {
  let users = [];
  Userchannel.count(
    {
      $or: [
        {
          channel_type: "public"
        },
        {
          channel_type: "private"
        }
      ]
    },
    function(err, usercount) {
      if (usercount > 0) {
        Userchannel.find({
          channel_type: "public"
        })
          .select({
            channel_name: 1,
            total_subscribers: 1,
            _id: 0
          })
          .sort({
            total_subscribers: -1
          })
          .limit(5)
          .exec(function(err, allusers) {
            if (!err) {
              res.json({
                status: true,
                count: usercount,
                result: allusers
              });
            } else {
              senderr(res);
            }
          });
      } else {
        res.json({
          status: false,
          count: 0,
          result: users
        });
      }
    }
  );
});

/* get trending private channels */
service.get("/getprivatechannels", function(req, res) {
  let users = [];
  Userchannel.count(
    {
      channel_type: "private"
    },
    function(err, usercount) {
      if (usercount > 0) {
        Userchannel.find({
          channel_type: "private"
        })
          .select({
            channel_name: 1,
            total_subscribers: 1,
            _id: 0
          })
          .sort({
            total_subscribers: -1
          })
          .limit(5)
          .exec(function(err, allusers) {
            if (!err) {
              res.json({
                status: true,
                count: usercount,
                result: allusers
              });
            } else {
              senderr(res);
            }
          });
      } else {
        res.json({
          status: false,
          count: 0,
          result: users
        });
      }
    }
  );
});

/* get all userdevices list */
service.get("/getplatformlist", function(req, res) {
  let users = [];
  Userdevices.count(function(err, usercount) {
    if (usercount > 0) {
      Userdevices.aggregate(
        [
          {
            $group: {
              _id: "$device_type",
              count: {
                $sum: 1
              }
            }
          }
        ],
        function(err, userdevices) {
          if (err) {
            senderr(res);
          } else {
            redisServer.redisClient.get("successcalls", function(
              err,
              totalcalls
            ) {
              res.json({
                status: true,
                count: usercount,
                calls: totalcalls,
                result: userdevices
              });
            });
          }
        }
      );
    } else {
      res.json({
        status: false,
        count: 0,
        calls: 0,
        result: users
      });
    }
  });
});

/* get all by month list */
service.get("/getmonthlist", function(req, res) {
  let users = [];
  let date = new Date();
  let firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
  let timestamp = firstDay.getTime() / 1000;
  Groups.count(
    {
      created_at: {
        $gte: timestamp
      }
    },
    function(err, groupcount) {
      if (!err) {
        Userchannel.count(
          {
            created_time: {
              $gte: timestamp
            }
          },
          function(err, channelcount) {
            if (!err) {
              res.json({
                status: true,
                groupcount: groupcount,
                channelcount: channelcount
              });
            }
          }
        );
      }
    }
  );
});

/* get channel reports */
service.get("/channelreports/:id", function(req, res) {
  let channelreports = [];
  let searchquery = {
    channel_id: req.params.id
  };
  Reports.count(searchquery, function(err, reportcount) {
    if (reportcount > 0) {
      Reports.find(searchquery)
        .populate("user_id")
        .exec(function(err, channelreports) {
          if (!err) {
            res.json({
              status: true,
              count: reportcount,
              result: channelreports
            });
          } else {
            consoleerror(err);
          }
        });
    } else {
      res.json({
        status: false,
        count: 0,
        result: channelreports
      });
    }
  });
});

/* block (or) unblock channel */
service.delete("/blockit/:id", function(req, res) {
  if (!req.params.id) {
    senderr(res);
  } else {
    let showmessage,
      updateblockstatus = 0;
    Userchannel.count(
      {
        _id: req.params.id
      },
      function(err, channelcount) {
        if (channelcount > 0) {
          Userchannel.findById(req.params.id).exec(function(err, channelinfo) {
            if (err) {
              senderr(res);
            } else {
              showmessage = "Channel unblocked successfully";
              let channel_block_status = channelinfo.block_status;
              if (channel_block_status == 0) {
                updateblockstatus = 1;
                showmessage = "Channel blocked successfully";
              }
              channelinfo.block_status = updateblockstatus;
              channelinfo.save();
              res.json({
                status: true,
                message: showmessage
              });
            }
          });
        } else {
          senderr(res);
        }
      }
    );
  }
});

/* delete report */
service.delete("/deletereport/:id", function(req, res) {
  Reports.findById(req.params.id, function(err, reportdata) {
    if (!err) {
      let userchannel_id = reportdata.channel_id;
      Reports.findByIdAndRemove(req.params.id, function(err, reports) {
        if (err) {
          senderr(res);
        } else {
          res.json({
            status: true,
            message: "Report ignored successfully"
          });
          DownReportcount(userchannel_id);
        }
      });
    } else {
      senderr(res);
    }
  });
});

/* UPDATE REPORT COUNT */
let DownReportcount = function(channelId) {
  Userchannel.findOneAndUpdate(
    {
      _id: channelId
    },
    {
      $inc: {
        report_count: -1
      }
    },
    function(err) {
      if (err) {
        consoleerror(err);
      }
    }
  );
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

/* send error messages */
senderr = function(res) {
  res.json({
    status: "false",
    message: "Something went to be wrong"
  });
};

module.exports = service;
