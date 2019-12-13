/* npm libraries */
const express = require("express"),
  passport = require("passport"),
  jwt = require("jsonwebtoken"),
  config = require("../keys"),
  path = require("path"),
  service = express.Router();
require("../userjwt")(passport);

/* models */
let Help = require("../models/helpModel");

/* getall site help data */
service.get("/allhelps/:content", function(req, res) {
  let helps = [];
  let post;
  let selectedTitle = req.params.content;
  Help.count(function(err, helpcount) {
    if (helpcount > 0) {
      Help.find({
        type: "helps"
      })
        .sort({
          _id: -1
        })
        .exec(function(err, allhelps) {
          if (!err) {
            Help.count(function(err, termscount) {
              if (termscount > 0) {
                Help.find({
                  type: "terms"
                })
                  .sort({
                    _id: -1
                  })
                  .exec(function(err, allterms) {
                    if (!err) {
                      post = allhelps
                        .map(function(e) {
                          return e.title;
                        })
                        .indexOf(selectedTitle);
                      res.json({
                        status: true,
                        noofhelps: helpcount,
                        totalhelps: allhelps,
                        noofterms: termscount,
                        totalterms: allterms,
                        selectedTitle: post > 0 ? post : 0
                      });
                    } else {
                      senderr(res);
                    }
                  });
              } else {
                res.json(helps);
              }
            });
          } else {
            senderr(res);
          }
        });
    } else {
      res.json(helps);
    }
  });
});

/* getall site terms data */
service.get("/allterms/:content", function(req, res) {
  let helps = [];
  let post;
  let selectedTitle = req.params.content;
  Help.count(function(err, helpcount) {
    if (helpcount > 0) {
      Help.find({
        type: "helps"
      })
        .sort({
          _id: -1
        })
        .exec(function(err, allhelps) {
          if (!err) {
            Help.count(function(err, termscount) {
              if (termscount > 0) {
                Help.find({
                  type: "terms"
                })
                  .sort({
                    _id: -1
                  })
                  .exec(function(err, allterms) {
                    if (!err) {
                      post = allterms
                        .map(function(e) {
                          return e.title;
                        })
                        .indexOf(selectedTitle);
                      res.json({
                        status: true,
                        noofhelps: helpcount,
                        totalhelps: allhelps,
                        noofterms: termscount,
                        totalterms: allterms,
                        selectedTitle: post > 0 ? post : 0
                      });
                    } else {
                      senderr(res);
                    }
                  });
              } else {
                res.json(helps);
              }
            });
          } else {
            senderr(res);
          }
        });
    } else {
      res.json(helps);
    }
  });
});

/* getall site help & terms data */
service.get("/allhelpterms", function(req, res) {
  let helps = [];
  Help.count(function(err, helptermscount) {
    if (helptermscount > 0) {
      Help.find()
        .sort({
          _id: -1
        })
        .exec(function(err, allhelpterms) {
          if (!err) {
            res.json({
              status: true,
              count: helptermscount,
              result: allhelpterms
            });
          } else {
            senderr(res);
          }
        });
    } else {
      res.json({
        status: false,
        count: 0,
        result: helps
      });
    }
  });
});

/* get particular helpdata */
service.get("/gethelpterms/:id", function(req, res) {
  var id = req.params.id;
  Help.findById(id, function(err, edithelpterms) {
    if (!err) {
      res.json({
        status: true,
        result: edithelpterms
      });
    } else {
      senderr(res);
    }
  });
});

/* save help & terms */
service.post("/savehelpterms", function(req, res) {
  if (!req.body.title || !req.body.description || !req.body.type) {
    senderr(res);
  } else {
    let description = req.body.description.trim();
    if (
      description != "" &&
      (req.body.type == "helps" || req.body.type == "terms")
    ) {
      Help.count(
        {
          title: req.body.title,
          type: req.body.type
        },
        function(err, helptermscount) {
          if (helptermscount > 0) {
            res.json({
              status: false,
              message: "Help & Terms already exists"
            });
          } else {
            let newHelp = new Help(req.body);
            newHelp.save(function(err) {
              if (!err) {
                res.json({
                  status: true,
                  message: "Help & Terms saved successfully"
                });
              } else {
                senderr(res);
              }
            });
          }
        }
      );
    } else {
      senderr(res);
    }
  }
});

/* update help & terms */
service.post("/updatehelpterms/:id", function(req, res) {
  if (!req.body.title || !req.body.description || !req.body.type) {
    senderr(res);
  } else {
    let description = req.body.description.trim();
    if (
      description != "" &&
      (req.body.type == "helps" || req.body.type == "terms")
    ) {
      Help.count(
        {
          _id: req.params.id
        },
        function(err, helptermscount) {
          if (helptermscount > 0) {
            Help.findOneAndUpdate(
              {
                _id: req.params.id
              },
              {
                $set: req.body
              }
            ).exec(function(err) {
              if (err) {
                senderr(res);
              } else {
                res.json({
                  status: true,
                  message: "Help & Term updated successfully"
                });
              }
            });
          } else {
            senderr(res);
          }
        }
      );
    } else {
      senderr(res);
    }
  }
});

/* delete help & terms data */
service.delete("/deletehelpterms/:id", function(req, res) {
  Help.findByIdAndRemove(
    {
      _id: req.params.id
    },
    function(err, helpdata) {
      if (!err) {
        res.json({
          status: true,
          message: "Help & Terms deleted successfully"
        });
      } else {
        senderr(res);
      }
    }
  );
});

/* send error messages */
senderr = function(res) {
  res.json({
    status: "false",
    message: "Something went to be wrong"
  });
};

module.exports = service;
