const dgram = require("dgram");

function sendUdpMessage(msg, { address, port, hostname }, waitResponse) {
  return new Promise((resolve, reject) => {
    const socketUDP = dgram.createSocket("udp4");

    socketUDP.on("listening", () => {
      let addr = socketUDP.address();
      msg.originIP = addr.address;
      msg.originPort = addr.port;
      socketUDP.send(JSON.stringify(msg), port, address, (err) => {
        if (err) {
          socketUDP.close();
          reject(err);
        }
        if (!waitResponse) {
          socketUDP.close();
          resolve("Mensaje enviado exitosamente.");
        }
      });
    });

    socketUDP.on("message", (msg, rinfo) => {
      socketUDP.close();
      resolve(msg);
    });

    socketUDP.bind({ address: hostname });

    setTimeout(() => {
      try {
        socketUDP.close();
        reject("Socket timed out.");
      } catch (e) {}
    }, 3000);
  });
}

module.exports = {
  sendUdpMessage,
};
