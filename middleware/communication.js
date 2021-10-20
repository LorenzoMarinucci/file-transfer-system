const dgram = require("dgram");

function sendUdpMessage(msg, address, port, localPort) {
  return new Promise((resolve, reject) => {
    const socketUDP = dgram.createSocket("udp4");

    socketUDP.on("listening", () => {
      let addr = socketUDP.address();
      socketUDP.send(msg, port, address, (err) => {
        if (err) {
          reject(err);
        }
      });
    });

    socketUDP.on("message", (msg, rinfo) => {
      socketUDP.close();
      resolve(msg);
    });

    socketUDP.bind(localPort);
  });
}

module.exports = {
  sendUdpMessage,
};
