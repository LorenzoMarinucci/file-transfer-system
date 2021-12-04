const dgram = require("dgram");

function sendUdpMessage(msg, { address, port, hostname }) {
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
      });
    });

    socketUDP.on("message", (msg, rinfo) => {
      socketUDP.close();
      resolve(msg);
    });

    socketUDP.on("timeout", () => {
      socketUDP.close();
      reject("Socket timed out.");
    });

    socketUDP.bind({ address: hostname });

    setTimeout(() => {
      try {
        socketUDP.close();
        console.log("timeout");
        reject("Socket timed out.");
      } catch (e) {}
    }, 3000);
  });
}

module.exports = {
  sendUdpMessage,
};
