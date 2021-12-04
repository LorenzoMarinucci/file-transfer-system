const config = require("./config/config");
const { v4: uuidv4 } = require("uuid");
const { sendUdpMessage } = require("./communication/udp");

// EXPRESIONES REGULARES PARA LOS ROUTE

const SCAN_REGEX = /^\/scan$/; //  /scan
const STORE_REGEX = /^\/file\/[a-z0-9]+\/store$/; //  /file/{hash}/store
const FILE_REQUEST_REGEX = /^\/file\/[a-z0-9]+$/; //  /file/{hash}
const COUNT_REGEX = /^\/count$/; //  /count

const COUNT_ROUTE = "/count";

// CONEXIÓN UDP

const dgram = require("dgram"); //conexiones UDP
const { type } = require("os");
const socket = dgram.createSocket("udp4"); //socket para UDP
socket.bind({
  port: config.localPort,
  address: config.localAddress,
});

// DHT

const files = new Map();

// MENSAJES

const messages = [];

// ARCIVOS

class File {
  constructor(id, filename, filesize, parIP, parPort) {
    this.id = id;
    this.filename = filename;
    this.filesize = filesize;
    this.pares = [];
    this.pares.push({ parIP, parPort });
  }

  addPar(parIP, parPort) {
    if (!this.pares.includes({ parIP, parPort })) {
      this.pares.push({ parIP, parPort });
    }
  }
}

/* files.set("hash1", {
  filename: "example_file1",
  filesize: 21,
  nodePort: 1,
  nodeIp: "128.0.0.1",
});

files.set("hash2", {
  filename: "example_file2",
  filesize: 21,
  nodePort: 2,
  nodeIp: "128.0.0.2",
});

files.set("hash3", {
  filename: "example_file3",
  filesize: 21,
  nodePort: 10003,
  nodeIp: "127.0.0.1",
}); */

socket.on("listening", () => {
  let addr = socket.address();
  console.log(`Tracker iniciado en ${addr.address}:${addr.port}`);
});

socket.on("error", (err) => {
  console.error(`UDP error: ${err.stack}`);
});

socket.on("message", (msg, rinfo) => {
  console.log(
    `[UDP] Mensaje recibido: ${msg} desde ${rinfo.address}:${rinfo.port}`
  );
  let parsedMsg = JSON.parse(msg);
  let route = parsedMsg.route;

  switch (true) {
    case SCAN_REGEX.test(route): {
      scan(parsedMsg);
      break;
    }
    case STORE_REGEX.test(route): {
      store(parsedMsg);
      break;
    }
    case FILE_REQUEST_REGEX.test(route): {
      search(parsedMsg); //paso el mensaje completo porque necesito los datos para devolver un found o replicar el search
      break;
    }
    case COUNT_REGEX.test(route): {
      count(parsedMsg);
      break;
    }
  }
});

function scan(msg) {
  // ANALIZAR SI EL MENSAJE YA FUE RECIBIDO

  if (messages.includes(msg.messageId)) {
    messages.splice(msg.messageId);
    sendUdpMessage(JSON.stringify(msg), {
      address: msg.originIP,
      port: msg.originPort,
    }).then(() => {
      console.log("SCAN retornado al origen.");
    });
  } else {
    // AÑADIR LA ID DEL MENSAJE COMO LEÍDO
    messages.push(msg.messageId);
    setTimeout(() => messages.splice(msg.messageId), 2000);
    if (!msg.body) {
      msg.body = {
        files: [],
      };
    }

    // OBTENER CADA HASH EN LA DHT. POR CADA HASH, ITERAR POR LOS ARCHIVOS CORRESPONDIENTES (COINCIDENTES EN LOS 2 PRIMEROS CARACTERES)

    files.forEach((matchingFiles) => {
      matchingFiles.forEach((file) => {
        msg.body.files.push({
          id: file.id,
          filename: file.filename,
          filesize: file.filesize,
        });
      });
    });

    sendUdpMessage(JSON.stringify(msg), {
      address: config.rightTrackerAddress,
      port: config.rightTrackerPort,
    }).then(() => {
      console.log("Mensaje SCAN pasado a tracker derecho.");
    });
  }
}

function store(msg) {
  // NO SE VERIFICA ID, YA QUE MINIMAMENTE ALGUN NODO GUARDARA EL ARCHIVO
  messages.push(msg.messageId);
  setTimeout(() => messages.splice(msg.messageId), 2000);

  let hash = msg.body.id.substring(0, 2);

  if (hash > config.trackerId) {
    // EL ID NO ES MAYOR AL HASH QUE SE QUIERE ALMACENAR, PASA EL MENSAJE AL TRACKER DERECHO, QUE POSEE MAYOR ID
    // TO-DO: reenviar mensaje al tracker derecho
    sendUdpMessage(JSON.stringify(msg), {
      address: config.rightTrackerAddress,
      port: config.rightTrackerPort,
    }).then(() => {
      console.log("Mensaje STORE pasado a tracker derecho.");
    });
  } else {
    if (
      config.leftTrackerId >= hash &&
      config.leftTrackerId < config.trackerId
    ) {
      // EL ID ES MAYOR AL HASH, PERO NO ES EL MENOR DE LOS MAYORES.
      // TAMBIEN SE VERIFICA QUE EL ID IZQ NO SEA MAYOR AL ACTUAL (EN DICHO CASO, EL IZQ SERÍA EL ÚLTIMO)
      // PASA EL MENSAJE AL TRACKER IZQ
      sendUdpMessage(JSON.stringify(msg), {
        address: config.leftTrackerAddress,
        port: config.leftTrackerPort,
      }).then(() => {
        console.log("Mensaje STORE pasado a tracker izquierdo.");
      });
    } else {
      // EL HASH ESTÁ DENTRO DEL DOMINIO DEL TRACKER
      if (files.has(hash)) {
        // SE REVISA SI LOS 2 CARACTERES DEL HASH YA PERTENECEN A LA DHT
        let matchingFiles = files.get(hash);
        let file = matchingFiles.find((possibleFile) => {
          // BUSCA SI EL ARCHIVO YA EXISTE EN LA DHT. LOS IDS DEBEN SER IGUALES
          return possibleFile.id === msg.body.id;
        });

        if (file) {
          // EL ARCHIVO EXISTE, SE AGREGAN LOS NUEVOS PARES
          file.addPar(msg.body.pares[0].parIP, msg.body.pares[0].parPort);
        } else {
          // EL ARCHIVO NO EXISTE, SE LO AGREGA AL BUCKET
          msg.pares.forEach((par) => {
            let file = new File(
              msg.body.id,
              msg.body.filename,
              msg.body.filesize,
              par.parIP,
              par.parPort
            );
            matchingFiles.push(file);
          });
        }
      } else {
        // LOS CARACTERES NO EXISTEN EN LA DHT
        // CREA EL ARRAY CORRESPONDIENTE A LOS CARACTERES E INSERTA EL NUEVO ARCHIVO
        let file = new File(
          msg.body.id,
          msg.body.filename,
          msg.body.filesize,
          msg.body.pares[0].parIP,
          msg.body.pares[0].parPort
        );
        files.set(hash, [file]);
      }
      console.log("ARCHIVO CON CLAVE " + hash + " ALMACENADO");
      requestCount();
    }
  }
}

// PARA PROBAR QUE ANDE EL COUNT, SE SOLICITA UNO AL ALMACENAR UN ARCHIVO
function requestCount() {
  let messageId = uuidv4();
  messages.push(messageId);
  setTimeout(() => messages.splice(messageId), 2000);
  sendUdpMessage(
    JSON.stringify({
      messageId,
      route: COUNT_ROUTE,
      body: {
        trackerCount: 1,
        fileCount: countFiles(),
      },
    }),
    { address: config.rightTrackerAddress, port: config.rightTrackerPort }
  );
}

function search(msg) {
  if (messages.includes(msg.messageId)) {
    messages.splice(msg.messageId);
    // EL MENSAJE DIO TODA LA VUELTA
  } else {
    messages.push(msg.messageId);
    setTimeout(() => messages.splice(msg.messageId), 2000);
    let hash = msg.route.split("/file/")[1];
    let bucket = hash.substring(0, 2);
    if (bucket > config.trackerId) {
      //TO-DO: ENVIAR MENSAJE A TRACKER DERECHO
      sendUdpMessage(JSON.stringify(msg), {
        address: config.rightTrackerAddress,
        port: config.rightTrackerPort,
      }).then(() => {
        console.log("Mensaje SEARCH pasado a tracker derecho.");
      });
    } else {
      if (
        config.leftTrackerId >= hash &&
        config.leftTrackerId < config.trackerId
      ) {
        //TO-DO: ENVIAR MENSAJE A TRACKER IZQ
        sendUdpMessage(JSON.stringify(msg), {
          address: config.leftTrackerAddress,
          port: config.leftTrackerPort,
        }).then(() => {
          console.log("Mensaje SEARCH pasado a tracker izquierdo.");
        });
      } else {
        // ARCHIVO ESTA DENTRO DEL DOMINIO

        if (files.has(bucket)) {
          let matchingFiles = files.get(bucket);
          let file = matchingFiles.find((possibleMatch) => {
            return hash === possibleMatch.id;
          });

          msg.route += "/found";

          if (file) {
            // LO ENCONTRO, ENVIAR FOUND
            msg.body = {
              id: file.id,
              trackerIP: config.localAddress,
              trackerPort: config.localPort,
              pares: file.pares,
            };
            sendUdpMessage(JSON.stringify(msg), {
              address: msg.originIP,
              port: msg.originPort,
            }).then(() => {
              console.log("Mensaje FOUND pasado al origen.");
            });
          } else {
            sendUdpMessage(JSON.stringify(msg), {
              address: msg.originIP,
              port: msg.originPort,
            }).then(() => {
              console.log("Mensaje FOUND vacío pasado al origen.");
            });
          }
        } else {
          sendUdpMessage(JSON.stringify(msg), {
            address: msg.originIP,
            port: msg.originPort,
          }).then(() => {
            console.log("Mensaje FOUND vacío pasado al origen.");
          });
        }
      }
    }
  }
}

function count(msg) {
  if (messages.includes(msg.messageId)) {
    messages.splice(msg.messageId);
    // EL MENSAJE VUELVE AL ORIGEN Y CORTA
    console.log("Tracker count: " + msg.body.trackerCount);
    console.log("File count: " + msg.body.fileCount);
  } else {
    messages.push(msg.messageId);
    setTimeout(() => messages.splice(msg.messageId), 2000);
    msg.body.trackerCount += 1;
    let fileCount = countFiles();
    msg.body.fileCount += fileCount;
    // TO-DO: ENVIAR MENSAJE A TRACKER DERECHO
    sendUdpMessage(JSON.stringify(msg), {
      address: config.rightTrackerAddress,
      port: config.rightTrackerPort,
    }).then(() => {
      console.log("Mensaje COUNT pasado a tracker derecho.");
    });
  }
}

function countFiles() {
  let count = 0;
  files.forEach((matchingFiles) => {
    matchingFiles.forEach((file) => {
      count += 1;
    });
  });

  return count;
}
