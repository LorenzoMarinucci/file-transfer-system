const express = require("express");
const app = express();

const log = require("./winston/logger");

require("dotenv").config();
const { hostname, serverPort } = require("./env/config");

const filesService = require("./services/filesService");

app.use(express.static("../client"));

app.listen(serverPort, () => {
  log.info(`Server listening at ${hostname}:${serverPort}`);
});

app.get("/file", (req, res) => {
  log.info("Request received at /file.");
  filesService
    .getAllFiles()
    .then((files) => {
      res.setHeader("Content-Type", "application/json").status(200);
      res.end(JSON.stringify(files));
    })
    .catch((err) => {
      log.error("Files could not be obtained.");
      console.log(err);
      res.status(500).end();
    });
});
