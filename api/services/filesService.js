const { sendUdpMessage } = require("../../middleware/communication");
const log = require("../winston/logger");
const sha1 = require("sha-1");
const {
  trackerPort,
  trackerAddress,
  udpListeningPort,
} = require("../env/config");

const SCAN_MSG = "/scan";
const STORE_MSG = "/file/{hash}/store";
const SEARCH_FILE_MSG = "/file/{hash}";

let udpConfig = {
  address: trackerAddress,
  port: trackerPort,
  localPort: udpListeningPort,
};

function getAllFiles() {
  let msg = { route: SCAN_MSG };
  return new Promise((resolve, reject) => {
    sendUdpMessage(JSON.stringify(msg), udpConfig)
      .then((val) => {
        log.info("Succesful response from tracker.");
        resolve(JSON.parse(val.toString("utf-8")));
      })
      .catch((err) => {
        log.error("Error while requesting files from tracker.");
        reject(err);
      });
  });
}

function saveFile(file) {
  let hash = sha1(file.id);
  let route = STORE_MSG.replace("{hash}", hash);
  let msg = { route, body: file };
  return new Promise((resolve, reject) => {
    sendUdpMessage(JSON.stringify(msg), udpConfig)
      .then((val) => {
        log.info("File saved.");
        resolve(val);
      })
      .catch((err) => {
        log.error("Error while saving file.");
        reject(err);
      });
  });
}

function requestFile(hash) {
  let route = SEARCH_FILE_MSG.replace("{hash}", hash);
  let msg = { route };
  return new Promise((resolve, reject) => {
    sendUdpMessage(JSON.stringify(msg), udpConfig)
      .then((val) => {
        log.info("File obtained.");
        resolve(val);
      })
      .catch((err) => {
        log.error("Error while obtaining file.");
        reject(err);
      });
  });
}

module.exports = {
  getAllFiles,
  saveFile,
  requestFile,
};
