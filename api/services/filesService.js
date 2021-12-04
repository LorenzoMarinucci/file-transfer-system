const { sendUdpMessage } = require("../communication/udp");
const { v4: uuidv4 } = require("uuid");
const log = require("../winston/logger");
const sha1 = require("sha-1");

const { trackerPort, trackerAddress, hostname } = require("../env/config");

const SCAN_MSG = "/scan";
const STORE_MSG = "/file/{hash}/store";
const SEARCH_FILE_MSG = "/file/{hash}";

let udpConfig = {
  address: trackerAddress,
  port: trackerPort,
  hostname: hostname,
};

function getAllFiles() {
  let msg = {
    messageId: uuidv4(),
    route: SCAN_MSG,
  };

  return new Promise((resolve, reject) => {
    sendUdpMessage(msg, udpConfig)
      .then((val) => {
        log.info("Succesful response from tracker.");
        let msg = JSON.parse(val.toString("utf-8"));
        resolve(msg.body.files);
      })
      .catch((err) => {
        log.error("Error while requesting files from tracker.");
        reject(err);
      });
  });
}

function saveFile(file) {
  let hash = sha1(file.filename + file.filesize);
  let route = STORE_MSG.replace("{hash}", hash);
  let msg = {
    messageId: uuidv4(),
    route,
    body: {
      id: hash,
      filename: file.filename,
      filesize: file.filesize,
      pares: [
        {
          parIP: file.nodeIp,
          parPort: file.nodePort,
        },
      ],
    },
  };

  return new Promise((resolve, reject) => {
    sendUdpMessage(msg, udpConfig)
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
  let msg = {
    messageId: uuidv4(),
    route,
  };
  return new Promise((resolve, reject) => {
    sendUdpMessage(msg, udpConfig)
      .then((val) => {
        let response = JSON.parse(val);
        if (response.body) {
          log.info("File obtained.");
          resolve({
            id: response.body.id,
            trackerIP: response.body.trackerIP,
            trackerPort: response.body.trackerPort,
          });
        } else {
          log.info("File not found");
          resolve();
        }
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
