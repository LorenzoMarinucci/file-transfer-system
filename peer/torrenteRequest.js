const { sendUdpMessage } = require("../middleware/communication");
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
      sendUdpMessage(JSON.stringify(msg), networkData, true)
        .then((val) => {
          console.log("Succesful response from tracker.");
          console.log("FOUND " + val);
          resolve(JSON.parse(val.toString("utf-8"))); //resuelve mensaje FOUND
          //resolve(val);
        })
        .catch((err) => {
          console.log("Error while requesting peers from tracker.");
          reject(err);
        });
    });
}

module.exports = {
    torrenteRequest,
};
