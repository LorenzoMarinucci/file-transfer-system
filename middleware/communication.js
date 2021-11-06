const dgram = require("dgram");

function sendUdpMessage(msg, { address, port, localPort }, awaitResponse) {
  return new Promise((resolve, reject) => {
    const socketUDP = dgram.createSocket("udp4");

    socketUDP.on("listening", () => {
      let addr = socketUDP.address();
      socketUDP.send(msg, port, address, (err) => {
        if (err) {
          socketUDP.close();
          reject(err);
        }
        if (!awaitResponse) {
          socketUDP.close();
          resolve();
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
