const HOSTNAME = process.env.HOSTNAME;
const SERVER_PORT = process.env.SERVER_PORT;
const TRACKER_PORT = process.env.TRACKER_PORT;
const TRACKER_ADDRESS = process.env.TRACKER_ADDRESS;

module.exports = {
  hostname: HOSTNAME,
  serverPort: SERVER_PORT,
  trackerPort: TRACKER_PORT,
  trackerAddress: TRACKER_ADDRESS,
};
