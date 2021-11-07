const express = require("express");
const app = express();
const cors = require("cors");

const config = {
  application: {
    cors: {
      server: [
        {
          origin: "localhost:3000",
          credentials: true,
        },
      ],
    },
  },
};

app.use(cors(config.application.cors.server));
app.use(express.json());

const log = require("./winston/logger");

require("dotenv").config();
const { hostname, serverPort } = require("./env/config");

const filesService = require("./services/filesService");

app.listen(serverPort, () => {
  log.info(`Server listening at ${hostname}:${serverPort}`);
});

app.get("/file", (req, res) => {
  log.info("GET Request received at /file.");
  filesService
    .getAllFiles()
    .then((files) => {
      res.setHeader("Content-Type", "application/json").status(200);
      res.end(JSON.stringify(files));
    })
    .catch((err) => {
      log.error("Files could not be obtained.");
      log.error(err);
      res.status(500).end();
    });
});

app.post("/file", (req, res) => {
  log.info("POST Request received at /file.");
  filesService
    .saveFile(req.body)
    .then(() => {
      res.status(200).end();
    })
    .catch((err) => {
      log.error("Files could not be saved.");
      log.error(err);
      res.status(500).end();
    });
});

app.get("/file/:hash", (req, res) => {
  const hash = req.params.hash;
  log.info(`GET Request received at /file/${hash}`);
  filesService
    .requestFile(hash)
    .then((node) => {
      res.set({
        "Content-Disposition": `attachment; filename="${hash}.torrente"`,
      });
      res.status(200);
      res.end(JSON.stringify(node));
    })
    .catch((err) => {
      log.error("Fail during file request.");
      log.error(err);
      res.status(500).end();
    });
});
