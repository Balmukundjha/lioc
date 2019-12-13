    /* npm libraries */
    const express = require('express'),
      passport = require('passport'),
      jwt = require('jsonwebtoken'),
      config = require('../keys'),
      multer = require('multer'),
      path = require('path'),
      bcrypt = require('bcryptjs'),
      fs = require("fs"),
      ThumbnailGenerator = require('video-thumbnail-generator').default,
      ffmpeg = require('fluent-ffmpeg'),
      command = ffmpeg(),
      upload = multer();
    service = express.Router();
    require('../userjwt')(passport);

    /* models */
    let Admin = require("../models/adminModel");
    let Sitesetting = require("../models/sitesettingModel");
    let Mychannel = require("../models/mychannelModel");
    let Channelmessages = require("../models/channelmessageModel");

    /* CHAT SERVER */
    let chatServer = require('./chat');

    /* PUSHNOTIFICATIONS */
    let notificationServer = require("./pushNotification");

    /* signin or signup as user */
    service.post('/authenticateadmin', function (req, res) {
      if (!req.body.admin_username || !req.body.admin_username) {
        senderr(res);
      } else {
        const username = req.body.admin_username;
        const password = req.body.admin_password;
        Admin.getUserByUsername(username, (err, user) => {
          if (!user) {
            senderr(res);
          } else {
            Admin.comparePassword(password, user.password, (err, isMatch) => {
              if (err) throw err;
              if (isMatch) {
                const token = jwt.sign({
                  data: user
                }, config.secret, {
                  expiresIn: '1h'
                });
                res.json({
                  status: "success",
                  token: 'JWT ' + token,
                  nickname: user.name,
                  userdata: user
                });
              } else {
                senderr(res);
              }
            });
          }

        });
      }
    });


    /* save sitesettings data */
    service.post('/savesitedata', function (req, res) {
      Sitesetting.find(function (err, sitedata) {
        if (sitedata.length == '0') {
          const sitedata = new Sitesetting(req.body);
          sitedata.save().then(sitedata => {
            return res.json({
              status: true,
              message: 'Site settings updated successfully'
            });
          }).catch(err => {
            senderr(res);
          });
        } else {
          let siteid = sitedata[0]._id;
          Sitesetting.findOneAndUpdate({
            _id: siteid
          }, {
            "$set": req.body
          }).exec(function (err) {
            if (err) {
              senderr(res);
            } else {
              return res.json({
                status: true,
                message: 'Site settings updated successfully'
              });
            }
          });
        }
      });

    });


    /* save adminsettings data */
    service.post('/saveprofile', function (req, res) {
      Admin.count(function (err, admincount) {
        if (admincount > 0) {
          Admin.findOne().sort({
            '_id': -1
          }).limit(1).exec(function (err, adminsettings) {
            if (!err) {
              let result = {};
              result.name = req.body.name;
              result.username = req.body.username;
              if (typeof req.body.newpassword != "undefined" && req.body.newpassword != null && typeof req.body.confirmpassword != "undefined" && req.body.confirmpassword != null && req.body.confirmpassword == req.body.newpassword) {
                bcrypt.genSalt(10, (err, salt) => {
                  bcrypt.hash(req.body.newpassword, salt, (err, hash) => {
                    if (!err) {
                      if (req.body.newpassword != '' && req.body.confirmpassword != '') {
                        result.password = hash;
                      }
                      Admin.findOneAndUpdate({
                        _id: adminsettings._id
                      }, {
                        "$set": result
                      }).exec(function (err) {
                        if (err) {
                          senderr(res);
                        } else {
                          return res.json({
                            status: true,
                            message: 'Profile updated successfully'
                          });
                        }
                      });
                    }
                  });
                });
              } else {
                return res.json({
                  status: true,
                  message: 'Profile updated successfully'
                });
              }
            } else {
              senderr(res);
            }
          });
        } else {
          senderr(res);
        }
      });
    });

    /* getall sitesettings */
    service.get('/sitesettings', function (req, res) {
      let sitesettings = [];
      Sitesetting.count(function (err, sitesettingscount) {
        if (sitesettingscount > 0) {
          Sitesetting.find().sort({
            '_id': -1
          }).
          exec(function (err, sitesettings) {
            if (!err) {
              res.json({
                status: true,
                count: sitesettingscount,
                result: sitesettings
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

    /* getall adminsettings */
    service.get('/adminsettings', function (req, res) {
      let adminsettings = [];
      Admin.count(function (err, admincount) {
        if (admincount > 0) {
          Admin.findOne().sort({
            '_id': -1
          }).limit(1).exec(function (err, adminsettings) {
            if (!err) {
              res.json({
                status: true,
                count: admincount,
                result: adminsettings
              });
            } else {
              senderr(res);
            }
          });
        } else {
          res.json(adminsettings);
        }
      });
    });

    /* getall sitesettings */
    service.get('/sitedatasettings', function (req, res) {
      let sitesettings = [];
      Sitesetting.count(function (err, sitesettingscount) {
        if (sitesettingscount > 0) {
          Sitesetting.findOne().sort({
            '_id': -1
          }).limit(1).
          exec(function (err, sitesettings) {
            if (!err) {
              res.json({
                status: true,
                count: sitesettingscount,
                result: sitesettings
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

    // save banners
    const bannerstorage = multer.diskStorage({
      destination: function (req, file, cb) {
        cb(null, './src/assets/public/banners/');
      },
      filename: function (req, file, cb) {
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
      }
    });

    var bannerupload = multer({
      storage: bannerstorage
    });

    service.post('/savebanners', bannerupload.single('banner_image'), function (req, res, next) {
      Sitesetting.find(function (err, sitedata) {
        if (sitedata.length == '0') {
          const sitedata = new Sitesetting();
          sitedata.banner_image = req.file.filename;
          sitedata.save().then(sitedata => {
            return res.json({
              status: true,
              message: 'Banner updated Successfully'
            });
          }).catch(err => {
            senderr(res);
          });
        } else {
          let siteid = sitedata[0]._id;
          if (typeof sitedata[0].banner_image != "undefined" && sitedata[0].banner_image != "") {
            unlinkFile(config.assets + "banners/" + sitedata[0].banner_image);
          }
          Sitesetting.findOneAndUpdate({
            _id: siteid
          }, {
            "$set": {
              banner_image: req.file.filename
            }
          }).exec(function (err) {
            if (err) {
              senderr(res);
            } else {
              return res.json({
                status: true,
                message: 'Banner updated successfully'
              });
            }
          });
        }
      });
    });

    // save logo
    const logostorage = multer.diskStorage({
      destination: function (req, file, cb) {
        cb(null, './src/assets/public/logos/');
      },
      filename: function (req, file, cb) {
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
      }
    });

    var logoupload = multer({
      storage: logostorage
    });

    service.post('/savelogos', logoupload.single('logo_image'), function (req, res, next) {
      Sitesetting.find(function (err, sitedata) {
        if (sitedata.length == '0') {
          const sitedata = new Sitesetting();
          sitedata.logo = req.file.filename;
          sitedata.save().then(sitedata => {
            return res.json({
              status: true,
              message: 'Logo updated Successfully'
            });
          }).catch(err => {
            senderr(res);
          });
        } else {
          let siteid = sitedata[0]._id;
          if (typeof sitedata[0].logo != "undefined" && sitedata[0].logo != "") {
            unlinkFile(config.assets + "logos/" + sitedata[0].logo);
          }
          Sitesetting.findOneAndUpdate({
            _id: siteid
          }, {
            "$set": {
              logo: req.file.filename
            }
          }).exec(function (err) {
            if (err) {
              senderr(res);
            } else {
              return res.json({
                status: true,
                message: 'Logo updated successfully'
              });
            }
          });
        }
      });
    });

    // save sliders
    const sliderstorage = multer.diskStorage({
      destination: function (req, file, cb) {
        cb(null, './src/assets/public/sliders/');
      },
      filename: function (req, file, cb) {
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
      }
    });

    var sliderupload = multer({
      storage: sliderstorage
    });

    service.post('/savesliders', sliderupload.single('slider_image'), function (req, res, next) {
      Sitesetting.find(function (err, sitedata) {
        if (sitedata.length == '0') {
          const sitedata = new Sitesetting();
          sitedata.sliders.push(req.file.filename);
          sitedata.save().then(sitedata => {
            return res.json({
              status: true,
              message: 'Sliders updated Successfully'
            });
          }).catch(err => {
            senderr(res);
          });
        } else {
          let siteid = sitedata[0]._id;
          let filename = req.file.filename;
          let newsliders = [];
          if (sitedata[0].sliders != "" && typeof sitedata[0].sliders != 'undefined') {
            newsliders = sitedata[0].sliders;
          }
          newsliders.push(filename);
          Sitesetting.findOneAndUpdate({
            _id: siteid
          }, {
            "$set": {
              sliders: newsliders
            }
          }).exec(function (err) {
            if (err) {
              senderr(res);
            } else {
              return res.json({
                status: true,
                message: 'Sliders updated successfully'
              });
            }
          });
        }
      });
    });

    // save metaimage
    const Metastorage = multer.diskStorage({
      destination: function (req, file, cb) {
        cb(null, './src/assets/public/seo/');
      },
      filename: function (req, file, cb) {
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
      }
    });

    var metaimageupload = multer({
      storage: Metastorage
    });

    service.post('/savemetaimage', metaimageupload.single('meta_image'), function (req, res, next) {
      Sitesetting.find(function (err, sitedata) {
        if (sitedata.length == '0') {
          const sitedata = new Sitesetting();
          sitedata.meta_image = req.file.filename;
          sitedata.save().then(sitedata => {
            return res.json({
              status: true,
              message: 'Meta Image uploaded Successfully'
            });
          }).catch(err => {
            senderr(res);
          });
        } else {
          let siteid = sitedata[0]._id;
          if (typeof sitedata[0].meta_image != "undefined" && sitedata[0].meta_image != "") {
            unlinkFile(config.assets + "seo/" + sitedata[0].meta_image);
          }
          Sitesetting.findOneAndUpdate({
            _id: siteid
          }, {
            "$set": {
              meta_image: req.file.filename
            }
          }).exec(function (err) {
            if (err) {
              senderr(res);
            } else {
              return res.json({
                status: true,
                message: 'Meta Image uploaded successfully'
              });
            }
          });
        }
      });
    });

    // save channels
    const adminchannelstorage = multer.diskStorage({
      destination: function (req, file, cb) {
        cb(null, './src/assets/public/chats/');
      },
      filename: function (req, file, cb) {
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
      }
    });

    var adminchannelupload = multer({
      storage: adminchannelstorage
    });


    /* save channels */
    service.post('/savenewchannel', adminchannelupload.single('admin_channel_image'), function (req, res) {
      if (!req.body.title || !req.body.description) {
        senderr(res);
      } else {
        let description = req.body.description.trim();
        req.body.created_time = timeZone();
        req.body.channel_type = "admin";
        req.body.channel_image = req.file.filename;
        if ((description != "")) {
          Mychannel.count({
            title: req.body.title,
          }, function (err, helptermscount) {
            if (helptermscount > 0) {
              res.json({
                status: false,
                message: 'Channel already exists'
              });
            } else {
              let newChannel = new Mychannel(req.body);
              newChannel.save(function (err) {
                if (!err) {
                  res.json({
                    status: true,
                    message: 'Channel saved successfully'
                  });
                } else {
                  senderr(res);
                }
              });
            }
          });
        } else {
          senderr(res);
        }
      }
    });

    /* update help & terms */
    service.delete('/deleteslider/:slider', function (req, res) {
      if (!req.params.slider) {
        senderr(res);
      } else {
        Sitesetting.find(function (err, sitedata) {
          if (sitedata.length > 0) {
            let siteid = sitedata[0]._id;
            let sitesliders = sitedata[0].sliders;
            let index = sitesliders.indexOf(req.params.slider);
            if (index > -1) {
              sitesliders.splice(index, 1);
            }
            Sitesetting.findOneAndUpdate({
              _id: siteid
            }, {
              "$set": {
                sliders: sitesliders
              }
            }).exec(function (err) {
              if (err) {
                senderr(res);
              } else {
                res.json({
                  status: true,
                  message: 'Slider removed successfully'
                });
              }
            });
          } else {
            senderr(res);
          }
        });
      }
    });

    /* save iOS voip certificates */
    const voipstorage = multer.diskStorage({
      destination: function (req, file, cb) {
        cb(null, './server/routes/apns/');
      },
      filename: function (req, file, cb) {
        cb(null, 'cert' + path.extname(file.originalname));
      }
    });

    var voipupload = multer({
      storage: voipstorage
    });

    // save iOS voip key certificates
    const voipkeystorage = multer.diskStorage({
      destination: function (req, file, cb) {
        cb(null, './server/routes/apns/');
      },
      filename: function (req, file, cb) {
        cb(null, 'key' + path.extname(file.originalname));
      }
    });

    var voipkeyupload = multer({
      storage: voipkeystorage
    });

    service.post('/saveapns', voipupload.single('voip_cer'), function (req, res, next) {
      Sitesetting.find(function (err, sitedata) {
        if (sitedata.length == '0') {
          const sitedata = new Sitesetting();
          sitedata.voip_certificate = req.file.filename;
          sitedata.save().then(sitedata => {
            return res.json({
              status: true,
              message: 'Voip Certificate upload Successfully'
            });
          }).catch(err => {
            senderr(res);
          });
        } else {
          let siteid = sitedata[0]._id;
          Sitesetting.findOneAndUpdate({
            _id: siteid
          }, {
            "$set": {
              voip_certificate: req.file.filename
            }
          }).exec(function (err) {
            if (err) {
              senderr(res);
            } else {
              return res.json({
                status: true,
                message: 'Voip Certificate upload Successfully'
              });
            }
          });
        }
      });
    });

    service.post('/savevoipkey', voipkeyupload.single('voip_key'), function (req, res, next) {
      Sitesetting.find(function (err, sitedata) {
        if (sitedata.length == '0') {
          const sitedata = new Sitesetting();
          sitedata.voip_key = req.file.filename;
          sitedata.save().then(sitedata => {
            return res.json({
              status: true,
              message: 'Voip Key upload Successfully'
            });
          }).catch(err => {
            senderr(res);
          });
        } else {
          let siteid = sitedata[0]._id;
          Sitesetting.findOneAndUpdate({
            _id: siteid
          }, {
            "$set": {
              voip_key: req.file.filename
            }
          }).exec(function (err) {
            if (err) {
              senderr(res);
            } else {
              return res.json({
                status: true,
                message: 'Voip Key upload Successfully'
              });
            }
          });
        }
      });
    });


    /* getall mychannelchats */
    service.get('/mychannelchats/:id', function (req, res) {
      let sitesettings = [];
      Channelmessages.count(function (err, mychannelcount) {
        if (mychannelcount > 0) {
          Channelmessages.find({
            'channel_id': req.params.id
          }).
          exec(function (err, channelchats) {
            if (!err) {
              res.json({
                status: true,
                count: mychannelcount,
                result: channelchats
              });
            } else {
              consoleerror(err);
            }
          });
        } else {
          res.json({
            status: false,
            count: 0,
            result: sitesettings
          });
        }
      });
    });

    /* getall mychannelchats */
    service.get('/mychannelinfo/:id', function (req, res) {
      let sitesettings = [];
      Mychannel.count(function (err, mychannelcount) {
        if (mychannelcount > 0) {
          Mychannel.findOne({
            _id: req.params.id
          }).limit(1).
          exec(function (err, channelchats) {
            if (!err) {
              res.json({
                status: true,
                count: mychannelcount,
                result: channelchats
              });
            } else {
              consoleerror(err);
            }
          });
        } else {
          res.json({
            status: false,
            count: 0,
            result: sitesettings
          });
        }
      });
    });


    /* save channel messages data */
    service.post('/savechannelmessages', function (req, res) {
      const newchannel = new Channelmessages();
      newchannel.channel_id = req.body.channel_id;
      newchannel.message = req.body.message;
      newchannel.message_type = 'text';
      newchannel.chat_type = 'channel';
      newchannel.message_at = timeZone();
      newchannel.save().then(chats => {
        res.json({
          status: true,
        });
        chatServer.io.sockets.emit('msgfromadminchannels', chats);
        composeAdminNotifications(chats);
      }).catch(err => {
        senderr(res);
      });
    });

    /* COMPOSE PUSH NOTIFICATIONS TO ALL */
    composeAdminNotifications = function (chats) {
      let customizeMsg = {
        message_data: chats
      };
      notificationServer.sendAdminNotifications(chats.message, customizeMsg);
    };

    /* getall admin channels */
    service.get('/adminchannellist', function (req, res) {
      let adminchannels = [];
      Mychannel.count(function (err, channelcount) {
        if (channelcount > 0) {
          Mychannel.find().sort({
            '_id': -1
          }).
          exec(function (err, adminchannels) {
            if (!err) {
              res.json({
                status: true,
                count: channelcount,
                result: adminchannels
              });
            } else {
              senderr(res);
            }
          });
        } else {
          res.json(adminchannels);
        }
      });
    });

    /* delete channel */
    service.delete('/deletechannel/:id', function (req, res) {
      Mychannel.findByIdAndRemove({
        _id: req.params.id
      }, function (err) {
        if (!err) {
          Channelmessages.remove({
              "channel_id": req.params.id
            },
            function (err) {
              res.json({
                status: true,
                message: 'Channel deleted successfully'
              });
              chatServer.io.sockets.emit('deletechannel', req.params.id);
            });
        } else {
          senderr(res);
        }
      });
    });

    /* delete channel */
    service.delete('/deletechannelmessages/:id', function (req, res) {
      Channelmessages.remove({
          "channel_id": req.params.id
        },
        function (err) {
          res.json({
            status: true,
            message: 'Channel message cleared successfully'
          });
        });
    });

    service.post('/uploadadminchannel', adminchannelupload.single('adminchannel_file'), function (req, res, next) {
      const newchannel = new Channelmessages();
      const image_thumbnail = req.file.filename.split('.');
      if (req.body.type == "video") {
        videoThumbnail(req.file.filename);
      }
      newchannel.channel_id = req.body.channel_id;
      newchannel.message = req.file.originalname;
      newchannel.message_type = req.body.type;
      newchannel.attachment = req.file.filename;
      newchannel.thumbnail = image_thumbnail[0] + "-thumbnail-320x240-0001.png";
      newchannel.chat_type = 'channel';
      newchannel.message_at = timeZone();
      newchannel.save().then(chats => {
        res.json({
          status: true,
          message: chats.message,
          attachment: chats.attachment,
          message_type: chats.message_type,
          message_at: chats.message_date
        });
        composeAdminNotifications(chats);
        setTimeout(OnSuccessupload, 1500, chats);

      }).catch(err => {
        senderr(res);
      });
    });

    videoThumbnail = function (image_thumbnail) {
      const tg = new ThumbnailGenerator({
        sourcePath: './src/assets/public/chats/' + image_thumbnail,
        thumbnailPath: './src/assets/public/chats/',
      });

      tg.generateOneByPercent(0)
        .then(console.log());
    };

    OnSuccessupload = function (chats) {
      chatServer.io.sockets.emit('msgfromadminchannels', chats);
    };

    /* jwt authentication  */
    getToken = function (headers) {
      if (headers && headers.authorization) {
        return headers.authorization;
      } else {
        return null;
      }
    };

    /* send error messages */
    senderr = function (res) {
      res.json({
        status: "false",
        message: 'Something went to be wrong'
      });
    };

    /* TIMEZONE BY SERVER */
    timeZone = function () {
      let selectedDate = new Date();
      // selectedDate.setHours(selectedDate.getHours() + 5);
      // selectedDate.setMinutes(selectedDate.getMinutes() + 30);
      let currentDate = selectedDate;
      let currentTime = currentDate.getTime();
      let localOffset = (-1) * selectedDate.getTimezoneOffset() * 60000;
      let timestamp = Math.round(new Date(currentTime + localOffset).getTime() / 1000);
      let newtimestamp = timestamp;
      return newtimestamp;
    };

    /* DELETE FILE */
    unlinkFile = function (imagepath) {
      fs.unlink(imagepath, function (err) {
        if (!err) {
          // console.log('File deleted!');
        } else {
          // console.log('File not deleted!');
        }
      });
    };

    module.exports = service;
