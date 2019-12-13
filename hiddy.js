/* NPM PACKAGES */
const express = require("express"),
  path = require("path"),
  bodyParser = require("body-parser"),
  cors = require("cors"),
  http = require("http"),
  https = require("https"),
  mongoose = require("mongoose"),
  passport = require("passport"),
  config = require("./server/keys"),
  logger = require("morgan"),
  fs = require("fs"),
  port = process.env.PORT || config.apiPort;

/* API ROUTES */
const api = require("./server/routes/api");
const admin = require("./server/routes/admin");

/* ADMIN ROUTES */
const user = require("./server/routes/user");
const help = require("./server/routes/help");

const app = express();
app.use(
  bodyParser.urlencoded({
    extended: "true",
    limit: "50mb"
  })
);
app.use(
  bodyParser.json({
    limit: "50mb"
  })
);
app.use(cors());
app.use(passport.initialize());
app.use(logger("dev")); /* View logs */
app.use(passport.session());
require("./server/userjwt")(passport);
app.use("/service", api);
app.use("/admin", admin);
app.use("/user", user);
app.use("/help", help);
app.use(express.static(path.join(__dirname, "dist")));
app.use(express.static(__dirname + "/src"));
app.use("/media", express.static(__dirname + "/src/assets/public"));
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  next();
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "dist/index.html"));
});

/* MONGO DB CONNECTIVITY */
mongoose.Promise = global.Promise;
mongoose
  .connect(
    config.mongoURI,
    {
      useNewUrlParser: true
    }
  )
  .then(
    () => {
      console.log("Mongodb is connected");
    },
    err => {
      console.log("Cannot connect to the mongodb" + err);
    }
  );

/* EXPRESS SERVER CONNECTIVITY */
const httpsMode = "disable"; /* disable for http (or) enable for https */
if (httpsMode === "disable") {
  const server = http.createServer(app);
  server.listen(port, () => console.log(`API Server is running on :${port}`));
} else {
  /* SSL CERTIFICATES */
  const privateKey = fs.readFileSync("");
  const certificate = fs.readFileSync("");
  const ca = fs.readFileSync("");
  const sslOptions = {
    key: privateKey,
    cert: certificate,
    ca: ca
  };
  const server = https.createServer(sslOptions, app);
  server.listen(port, () => console.log(`API Server is running on :${port}`));
}
