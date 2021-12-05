const config = require("./config/config");
const { v4: uuidv4 } = require("uuid");
const { sendUdpMessage } = require("./communication/udp");
const sha1 = require("sha-1");

// EXPRESIONES REGULARES PARA LOS ROUTE

const SCAN_REGEX = /^\/scan$/; //  /scan
const STORE_REGEX = /^\/file\/[a-z0-9]+\/store$/; //  /file/{hash}/store
const FILE_REQUEST_REGEX = /^\/file\/[a-z0-9]+$/; //  /file/{hash}
const COUNT_REGEX = /^\/count$/; //  /count
const ADD_PAR_REGEX = /^\/file\/[a-z0-9]+\/addPar$/; // /file/{hash}/addPar
const HEARTBEAT_REGEX = /^\/heartbeat$/; // /heartbeat
const NODE_MISSING_REGEX = /^\/nodeMissing$/; // /heartbeat
const LEAVE_REGEX = /^\/leave$/; //  /leave

const COUNT_ROUTE = "/count";
const HEARTBEAT_ROUTE = "/heartbeat";
const NODE_MISSING_ROUTE = "/nodeMissing";
const LEAVE_ROUTE = "/leave";

// CONEXIÓN UDP

const dgram = require("dgram"); //conexiones UDP
const { type } = require("os");
const { match } = require("assert");
const { generateKeyPair } = require("crypto");
const socket = dgram.createSocket("udp4"); //socket para UDP
socket.bind({
  port: config.localPort,
  address: config.localAddress,
});

// DHT

const files = new Map();

// MENSAJES

const messages = [];

let missingHeartbeat = 0;

// LEAVE

if (process.argv.includes("-l")) {
  let index = process.argv.indexOf("-l");
  let leaveTime = Number.parseInt(process.argv[index + 1]);
  if (leaveTime) {
    if (leaveTime <= 0) {
      console.log("Ingrese un tiempo de vida del tracker válido.");
    } else {
      setTimeout(() => {
        leaveToRight();
        leaveToLeft();
      }, leaveTime);
    }
  } else {
    console.log(
      "Si quiere agregar parametros adicionales debe ingresarlos correctamente."
    );
  }
}

// ARCHIVOS

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
    case ADD_PAR_REGEX.test(route): {
      addPar(parsedMsg);
      break;
    }
    case HEARTBEAT_REGEX.test(route): {
      receiveHeartbeat(parsedMsg);
      break;
    }
    case NODE_MISSING_REGEX.test(route): {
      handleNodeMissing(parsedMsg);
      break;
    }
    case LEAVE_REGEX.test(route): {
      receiveLeave(parsedMsg);
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
          msg.body.pares.forEach((par) => {
            file.addPar(par.parIP, par.parPort);
          });
        } else {
          // EL ARCHIVO NO EXISTE, SE LO AGREGA AL BUCKET
          let primerPar = msg.body.pares[0];
          let paresRestantes = msg.body.pares.slice(1);
          let file = new File(
            msg.body.id,
            msg.body.filename,
            msg.body.filesize,
            primerPar.parIP,
            primerPar.parPort
          );
          matchingFiles.push(file);
          paresRestantes.forEach((par) => {
            file.addPar(par.parIP, par.parPort);
          });
        }
      } else {
        // LOS CARACTERES NO EXISTEN EN LA DHT
        // CREA EL ARRAY CORRESPONDIENTE A LOS CARACTERES E INSERTA EL NUEVO ARCHIVO
        let primerPar = msg.body.pares[0];
        let paresRestantes = msg.body.pares.slice(1);
        let file = new File(
          msg.body.id,
          msg.body.filename,
          msg.body.filesize,
          primerPar.parIP,
          primerPar.parPort
        );
        paresRestantes.forEach((par) => {
          file.addPar(par.parIP, par.parPort);
        });
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

function addPar(msg) {
  messages.push(msg.messageId);
  setTimeout(() => messages.splice(msg.messageId), 2000);
  let hash = sha1(id);
  let bucket = hash.substring(0, 2);

  let status;

  if (files.has(bucket)) {
    let matchingFiles = files.get(bucket);
    let file = matchingFiles.find((match) => {
      return hash === match.id;
    });

    let respuesta;

    if (file) {
      files.addPar(msg.parIP, msg.parPort);
      console.log("PAR AÑADIDO AL ARCHIVO.");
      status = true;
    } else {
      console.log("ARCHIVO NO ENCONTRADO.");
      status = false;
    }
  } else {
    status = false;
  }

  respuesta = {
    messageId: msg.messageId,
    route: msg.route,
    status,
  };

  sendUdpMessage(JSON.stringify(msg), {
    address: msg.originIP,
    port: msg.originPort,
  }).then(() => {
    console.log("Respuesta de ADD PAR enviada al par.");
  });
}

// ENVÍO DEL HB

function sendHeartbeat() {
  const msg = {
    messageId: uuidv4(),
    route: HEARTBEAT_ROUTE,
    body: {
      trackerId: config.trackerId,
    },
  };
  sendUdpMessage(JSON.stringify(msg), {
    address: config.rightTrackerAddress,
    port: config.rightTrackerPort,
  })
    .then(() => {
      console.log("Heartbeat enviado a tracker derecho.");
    })
    .catch((err) => {
      console.log("Error al enviar Heartbeat al tracker derecho");
      console.log(err);
    });
}

// INTERVALO PARA EL ENVÍO DEL HB

setInterval(() => {
  sendHeartbeat();
}, 10000);

// INTERVALO PARA EL AUMENTO DEL CONTADOR

setInterval(() => {
  missingHeartbeat += 1;
  if (missingHeartbeat === 3) {
    console.log(
      "Tracker " +
        config.leftTrackerId +
        " perdido. Enviando mensaje NODE MISSING a tracker derecho."
    );

    // NODE MISSING

    let messageId = uuidv4();
    messages.push(messageId);

    let msg = {
      messageId,
      route: NODE_MISSING_ROUTE,
      originIP: config.localAddress,
      originPort: config.localPort,
      body: {
        missingNodeId: config.leftTrackerId,
        rightNodeIp: config.localAddress,
        rightNodePort: config.localPort,
        rightNodeId: config.trackerId,
      },
    };

    sendUdpMessage(JSON.stringify(msg), {
      address: config.rightTrackerAddress,
      port: config.rightTrackerPort,
    })
      .then(() => {
        console.log("Mensaje NODE MISSING enviado a tracker derecho.");
      })
      .catch((err) => {
        console.log("Error al enviar mensaje NODE MISSING a tracker derecho.");
        console.log(err);
      });

    missingHeartbeat = 0;
  }
}, 15000);

function receiveHeartbeat(msg) {
  messages.push(msg.messageId);
  setTimeout(() => messages.splice(msg.messageId), 2000);
  if (msg.body.trackerId === config.leftTrackerId) {
    console.log("Hearbeat recibido de tracker " + msg.body.trackerId);
    missingHeartbeat = 0;
  } else {
    console.log(
      "Heartbeat recibido de tracker desconocido. ID: " + msg.body.trackerId
    );
  }
}

function handleNodeMissing(msg) {
  if (messages.includes(msg.messageId)) {
    // ES LA RESPUESTA EL NODE MISSING
    messages.splice(msg.messageId);
    config.leftTrackerId = msg.body.leftNodeId;
    config.leftTrackerAddress = msg.body.leftNodeIp;
    config.leftTrackerPort = msg.body.leftNodePort;
    console.log(
      "Respuesta a NODE MISSING recibida. Nueva configuración: " +
        JSON.stringify(config)
    );
  } else {
    if (msg.body.missingNodeId === config.rightTrackerId) {
      // RECIBE EL MENSAJE EL TACKER A IZQ DEL CAÍDO
      console.log(
        "Mensaje NODE MISSING recibido desde tracker " + msg.body.rightNodeId
      );
      config.rightTrackerId = msg.body.rightNodeId;
      config.rightTrackerAddress = msg.body.rightNodeIp;
      config.rightTrackerPort = msg.body.rightNodePort;

      let response = {
        messageId: msg.messageId,
        route: msg.route,
        body: {
          leftNodeId: config.trackerId,
          leftNodeIp: config.localAddress,
          leftNodePort: config.localPort,
        },
      };

      sendUdpMessage(JSON.stringify(response), {
        address: config.rightTrackerAddress,
        port: config.rightTrackerPort,
      })
        .then(() => {
          console.log(
            "Respuesta a NODE MISSING enviada. Nueva configuración: " +
              JSON.stringify(config)
          );
        })
        .catch((err) => {
          console.log("Error al enviar respuesta a mensaje NODE MISSING.");
          console.log(err);
        });
    } else {
      console.log("Mensaje NODE MISSING con destino a otro tracker recibido.");
      sendUdpMessage(JSON.stringify(msg), {
        address: config.rightTrackerAddress,
        port: config.rightTrackerPort,
      })
        .then(() => {
          console.log("Mensaje NODE MISSING pasado a tracker derecho.");
        })
        .catch((err) => {
          console.log("Error al pasar mensaje NODE MISSING.");
          console.log(err);
        });
    }
  }
}

function leaveToRight() {
  const msg = {
    messageId: uuidv4(),
    route: LEAVE_ROUTE,
    body: {
      trackerId: config.trackerId,
      leftNodeIp: config.leftTrackerAddress,
      leftNodePort: config.leftTrackerPort,
      leftNodeId: config.leftTrackerId,
    },
  };
  sendUdpMessage(JSON.stringify(msg), {
    address: config.rightTrackerAddress,
    port: config.rightTrackerPort,
  })
    .then(() => {
      console.log("Mensaje LEAVE enviado a tracker derecho");
    })
    .catch((err) => {
      console.log("Error al enviar mensaje LEAVE a tracker derecho");
    });
}

function leaveToLeft() {
  const msg = {
    messageId: uuidv4(),
    route: LEAVE_ROUTE,
    body: {
      trackerId: config.trackerId,
      rightNodeIp: config.rightTrackerAddress,
      rightNodePort: config.rightTrackerPort,
      rightNodeId: config.rightTrackerId,
    },
  };
  sendUdpMessage(JSON.stringify(msg), {
    address: config.leftTrackerAddress,
    port: config.leftTrackerPort,
  })
    .then(() => {
      console.log("Mensaje LEAVE enviado a tracker izquierdo");
    })
    .catch((err) => {
      console.log("Error al enviar mensaje LEAVE a tracker izquierdo");
    });
}

function receiveLeave(msg) {
  if (messages.includes(msg.messageId)) {
    console.log("LEAVE ya recibido previamente.");
  } else {
    messages.push(msg.messageId);
    setTimeout(() => messages.splice(msg.messageId), 2000);
    if (msg.body.leftNodeId != null) {
      receiveLeaveToRight(msg);
    } else if (msg.body.rightNodeId != null) {
      receiveLeaveToLeft(msg);
    } else {
      console.log("LEAVE recibido, pero no se puede reconfigurar.");
    }
  }
}

function receiveLeaveToRight(msg) {
  config.leftTrackerId = msg.body.leftNodeId;
  config.leftTrackerAddress = msg.body.leftNodeIp;
  config.leftTrackerPort = msg.body.leftNodePort;
  console.log("LEAVE recibido. Nueva configuración: " + JSON.stringify(config));
}

function receiveLeaveToLeft(msg) {
  config.rightTrackerId = msg.body.rightNodeId;
  config.rightTrackerAddress = msg.body.rightNodeIp;
  config.rightTrackerPort = msg.body.rightNodePort;
  console.log("LEAVE recibido. Nueva configuración: " + JSON.stringify(config));
}
