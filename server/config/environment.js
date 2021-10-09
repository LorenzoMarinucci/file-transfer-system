const result = require("dotenv").config();

module.exports = {
  hostname: process.env.HOSTNAME,
  clientPort: process.env.CLIENT_PORT,
  portUDP: process.env.UDP_PORT,
  portTracker: process.env.TRACKER_PORT,
};
