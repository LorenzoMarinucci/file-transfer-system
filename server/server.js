"use strict";

const express = require("express");
const app = express();
require("dotenv").config();
const HOSTNAME = process.env.HOSTNAME;
const CLIENT_PORT = process.env.CLIENT_PORT;
const filesService = require("./services/filesService");

app.use(express.static("../client"));

app.listen(CLIENT_PORT, () => {
  console.log(`Server listening at ${HOSTNAME}:${CLIENT_PORT}`);
});

app.get("/file", (req, res) => {
  console.log("Request received at /file");
  filesService
    .getAllFiles()
    .then((val) => {
      res.setHeader("Content-Type", "application/json").status(200);
      res.end(JSON.stringify(val));
    })
    .catch((err) => {
      res.status(500).end();
    });
});
