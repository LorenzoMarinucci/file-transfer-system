"use strict";

const express = require("express");
const app = express();
const { hostname, clientPort } = require("./config/environment");
const filesService = require("./services/filesService");

app.use(express.static("../client"));

app.listen(clientPort, () => {
  console.log(`Server listening at ${hostname}:${clientPort}`);
});

app.get("/file", (req, res) => {
  filesService.getAllFiles().then((val) => {
    res.json(JSON.parse(val));
  });
});
