const { sendUdpMessage } = require("../../middleware/communication");
require("dotenv").config();
const TRACKER_PORT = process.env.TRACKER_PORT;
const TRACKER_ADDRESS = process.env.TRACKER_ADDRESS;
const LOCAL_PORT = process.env.TCP_PORT;
const SCAN_MSG = "/scan";

function getAllFiles() {
  return new Promise((resolve, reject) => {
    sendUdpMessage(SCAN_MSG, TRACKER_ADDRESS, TRACKER_PORT, LOCAL_PORT)
      .then((val) => {
        console.log("Succesful response from tracker.");
        let value = JSON.parse(val.toString("utf-8"));
        resolve(value);
      })
      .catch((error) => {
        console.log("Error while requesting files from tracker.");
        reject(error);
      });
  });
}

module.exports = {
  getAllFiles,
};
