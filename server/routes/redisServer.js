const redis = require("redis"),
  config = require("../keys"),
  redisClient = redis.createClient();

redisClient.auth(config.redisPassword, function (err) {
  if (err) consoleerror(err);
});

/* REDIS CONNECTVITY */
redisClient.on("connect", function () {
  console.log("REDIS CONNECTED ");
});

redisClient.on("error", function (err) {
  console.log("REDIS NOT CONNECTED " + err);
});

/* SET REDIS */
let setRedis = function (hash, key, object) {
  redisClient.hset(hash, key, JSON.stringify(object));
};

/* PUSH REDIS */
let pushRedis = function (hash, key, object) {
  redisClient.hget(hash, key, function (err, storedobj) {
    if (storedobj != null && !err) {
      var obj = JSON.parse(storedobj);
      obj.push(object);
      redisClient.hset(hash, key, JSON.stringify(obj));
    } else {
      let datas = [];
      datas.push(object);
      redisClient.hset(hash, key, JSON.stringify(datas));
    }
  });
};

/* PULL REDIS */
let pullRedis = function (hash, key, object) {
  redisClient.hget(hash, key, function (err, storedobj) {
    if (storedobj != null && !err) {
      let toObj = JSON.parse(storedobj);
      let toArray = Object.values(toObj);
      var index = toArray.indexOf(object);
      if (index > -1) {
        toArray.splice(index, 1);
      }
      redisClient.hset(hash, key, JSON.stringify(toArray));
    }
  });
};

/* GET REDIS */
let getRedis = function (hash, key) {
  return new Promise(function (resolve, reject) {
    redisClient.hget(hash, key, function (err, storedobj) {
      let emptyobj = {};
      if (!err && storedobj != null) {
        resolve(storedobj);
      } else {
        resolve(JSON.stringify(emptyobj));
      }
    });
  });
};

/* DELETE REDIS */
let deleteRedis = function (hash, key) {
  redisClient.hdel(hash, key);
};

module.exports = {
  redisClient: redisClient,
  setRedis: setRedis,
  getRedis: getRedis,
  pushRedis: pushRedis,
  pullRedis: pullRedis,
  deleteRedis: deleteRedis,
};
