const dgram = require("dgram");

function sendUdpMessage(msg, { address, port }) {
  return new Promise((resolve, reject) => {
    const socketUDP = dgram.createSocket("udp4");

    socketUDP.send(msg, port, address, (err) => {
      socketUDP.close();
      if (err) {
        reject(err);
      }
      resolve();
    });
  });
}

module.exports = {
  sendUdpMessage,
};
