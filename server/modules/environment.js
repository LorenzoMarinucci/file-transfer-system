const result = require("dotenv").config();

module.exports = {
  hostname: process.env.HOSTNAME,
  portTCP: process.env.TCP_PORT,
  portUDP: process.env.UDP_PORT,
  portTracker: process.env.TRACKER_PORT,
};
