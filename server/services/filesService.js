const middleware = require("../../middleware/middleware");
require("dotenv").config();
const TRACKER_PORT = process.env.TRACKER_PORT;
const TRACKER_ADDRESS = process.env.TRACKER_ADDRESS;
const SCAN_MSG = "/scan";

function getAllFiles() {
  return new Promise((resolve, reject) => {
    middleware
      .sendUdpMessage(SCAN_MSG, TRACKER_ADDRESS, TRACKER_PORT, 8081)
      .then((val) => {
        let value = JSON.parse(val.toString("utf-8"));
        console.log("Tracker response: ", value);
        resolve(val);
      })
      .catch((error) => {
        console.error("Error en el llamado: ", error);
        reject(error);
      });
  });
}

module.exports = {
  getAllFiles,
};
