const JwtStrategy = require('passport-jwt').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;
const User = require('./models/userModel');
const config = require('./keys');

module.exports = function (passport) {
    var opts = {};
    opts.jwtFromRequest = ExtractJwt.fromAuthHeaderAsBearerToken();
    opts.secretOrKey = config.secret;
    passport.use(new JwtStrategy(opts, function (jwt_payload, done) {
        return User.findOne({ id: jwt_payload.id })
            .then(user => {
                return done(null, user);
            })
            .catch(err => {
                return done(err);
            });
    }));
};

