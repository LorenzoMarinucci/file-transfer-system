const dgram = require("dgram");

function sendUdpMessage(msg, address, port, localPort) {
  return new Promise((resolve, reject) => {
    const socketUDP = dgram.createSocket("udp4");

    socketUDP.on("listening", () => {
      let addr = socketUDP.address();
      socketUDP.send(msg, port, address, (err) => {
        if (err) {
          console.error("Error while sending UDP message: " + err);
          reject(err);
        }
      });
    });

    socketUDP.on("message", (msg, rinfo) => {
      console.log(
        `[UDP] Message received: ${msg} from ${rinfo.address}:${rinfo.port}`
      );
      socketUDP.close();
      resolve(msg);
    });

    socketUDP.bind(localPort);
  });
}

module.exports = {
  sendUdpMessage,
};
