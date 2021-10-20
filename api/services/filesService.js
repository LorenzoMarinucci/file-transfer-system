const { sendUdpMessage } = require("../../middleware/communication");
const log = require("../winston/logger");
const {
  trackerPort,
  trackerAddress,
  udpListeningPort,
} = require("../env/config");

const SCAN_MSG = "/scan";

function getAllFiles() {
  return new Promise((resolve, reject) => {
    sendUdpMessage(SCAN_MSG, trackerAddress, trackerPort, udpListeningPort)
      .then((val) => {
        log.info("Succesful response from tracker.");
        console.log("services " + val);
        resolve(JSON.parse(val.toString("utf-8")));
      })
      .catch((err) => {
        console.log("err");
        log.error("Error while requesting files from tracker.");
        reject(err);
      });
  });
}

module.exports = {
  getAllFiles,
};
