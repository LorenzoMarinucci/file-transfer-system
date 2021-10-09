const dgram = require("dgram");

function sendUdpMessage(msg, address, port, localPort) {
  return new Promise((resolve, reject) => {
    const socketUDP = dgram.createSocket("udp4");

    socketUDP.on("listening", () => {
      let addr = socketUDP.address();
      console.log(`Listening for UDP packets at ${addr.address}:${addr.port}`);
      socketUDP.send(msg, port, address, (err) => {
        if (err) {
          console.error("Error while sending UDP message: " + err);
          reject(err);
        }
      });
    });

    socketUDP.on("message", (msg, rinfo) => {
      console.log(
        `[UDP] Recibido: ${msg} desde ${rinfo.address}:${rinfo.port}`
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
