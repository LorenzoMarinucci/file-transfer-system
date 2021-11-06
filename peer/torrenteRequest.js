const { sendUdpMessage } = require("../../middleware/communication");
const fs = require("fs");

function torrenteRequest(filePath, peer_IP, peer_port){

    let file = JSON.parse(fs.readFileSync(filePath,'utf-8'));

    //arma mensaje SEARCH
    let msg = {
        messageId: 'id-random', //como armamos el id?
        route: /file/ + file.id,
        originIP: peer_IP,
        originPort: peer_port,
        body: {}
    };

    networkData = { 
        address: file.trackerIP,
        port: file.trackerPort, 
        localPort: peer_port
    }

    return new Promise((resolve, reject) => {
        sendUdpMessage(JSON.stringify(msg), networkData)
          .then((val) => {
            log.info("Succesful response from tracker.");
            resolve(JSON.parse(val.toString("utf-8"))); //resuelve mensaje FOUND
          })
          .catch((err) => {
            log.error("Error while requesting peers from tracker.");
            reject(err);
          });
      });
}

module.exports = {
    torrenteRequest,
};