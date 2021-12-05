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
const JOIN_REGEX = /^\/join$/; //  /join
const JOIN_CONFIG_REGEX = /^\/join\/config$/; //  /join/config

const COUNT_ROUTE = "/count";
const HEARTBEAT_ROUTE = "/heartbeat";
const NODE_MISSING_ROUTE = "/nodeMissing";
const LEAVE_ROUTE = "/leave";
const JOIN_ROUTE = "/join";
const JOIN_CONFIG_ROUTE = "/join/config";

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

if (process.argv.includes("-j")) {
  let index = process.argv.indexOf("-j");
  let address = process.argv[index + 1];
  let port = Number.parseInt(process.argv[index + 2]);

  let messageId = uuidv4();

  messages.push(messageId);

  let msg = {
    messageId,
    route: JOIN_ROUTE,
    body: {
      newNodeIp: config.localAddress,
      newNodePort: config.localPort,
    },
  };

  if (address && port) {
    sendUdpMessage(JSON.stringify(msg), {
      address,
      port,
    }).then(() => {
      console.log("Pedido de JOIN enviado.");
    });
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
    case JOIN_REGEX.test(route): {
      handleJoin(parsedMsg);
      break;
    }
    case JOIN_CONFIG_REGEX.test(route): {
      joinConfig(parsedMsg);
      break;
    }
  }
});

function scan(msg) {
  // ANALIZAR SI EL MENSAJE YA FUE RECIBIDO

  if (messages.includes(msg.messageId)) {
    let index = messages.indexOf(msg.messageId);
    messages.splice(index, 1);
    sendUdpMessage(JSON.stringify(msg), {
      address: msg.originIP,
      port: msg.originPort,
    }).then(() => {
      console.log("SCAN retornado al origen.");
    });
  } else {
    // AÑADIR LA ID DEL MENSAJE COMO LEÍDO
    messages.push(msg.messageId);
    setTimeout(() => {
      if (messages.includes(msg.messageId)) {
        let index = messages.indexOf(msg.messageId);
        messages.splice(index, 1);
      }
    }, 2000);
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
  setTimeout(() => {
    if (messages.includes(msg.messageId)) {
      let index = messages.indexOf(msg.messageId);
      messages.splice(index, 1);
    }
  }, 2000);

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
  setTimeout(() => {
    if (messages.includes(msg.messageId)) {
      let index = messages.indexOf(msg.messageId);
      messages.splice(index, 1);
    }
  }, 2000);
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
    setTimeout(() => {
      if (messages.includes(msg.messageId)) {
        let index = messages.indexOf(msg.messageId);
        messages.splice(index, 1);
      }
    }, 2000);
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
    let index = messages.indexOf(msg.messageId);
    messages.splice(index, 1);
    // EL MENSAJE VUELVE AL ORIGEN Y CORTA
    console.log("Tracker count: " + msg.body.trackerCount);
    console.log("File count: " + msg.body.fileCount);
  } else {
    messages.push(msg.messageId);
    setTimeout(() => {
      if (messages.includes(msg.messageId)) {
        let index = messages.indexOf(msg.messageId);
        messages.splice(index, 1);
      }
    }, 2000);
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
  setTimeout(() => {
    if (messages.includes(msg.messageId)) {
      let index = messages.indexOf(msg.messageId);
      messages.splice(index, 1);
    }
  }, 2000);
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
  setTimeout(() => {
    if (messages.includes(msg.messageId)) {
      let index = messages.indexOf(msg.messageId);
      messages.splice(index, 1);
    }
  }, 2000);
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
    let index = messages.indexOf(msg.messageId);
    messages.splice(index, 1);
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
      newNodeIp: config.leftTrackerAddress,
      newNodePort: config.leftTrackerPort,
      newNodeId: config.leftTrackerId,
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
      newNodeIp: config.rightTrackerAddress,
      newNodePort: config.rightTrackerPort,
      newNodeId: config.rightTrackerId,
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
    setTimeout(() => {
      if (messages.includes(msg.messageId)) {
        let index = messages.indexOf(msg.messageId);
        messages.splice(index, 1);
      }
    }, 2000);
    if (msg.body.trackerId === config.leftTrackerId) {
      config.leftTrackerId = msg.body.newNodeId;
      config.leftTrackerAddress = msg.body.newNodeIp;
      config.leftTrackerPort = msg.body.newNodePort;
      console.log(
        "LEAVE recibido. Nueva configuración: " + JSON.stringify(config)
      );
    } else if (msg.body.trackerId === config.rightTrackerId) {
      config.rightTrackerId = msg.body.newNodeId;
      config.rightTrackerAddress = msg.body.newNodeIp;
      config.rightTrackerPort = msg.body.newNodePort;
      console.log(
        "LEAVE recibido. Nueva configuración: " + JSON.stringify(config)
      );
    } else {
      console.log("LEAVE recibido, pero no se puede reconfigurar.");
    }
  }
}

function handleJoin(msg) {
  console.log("Mensaje JOIN recibido.");

  if (messages.includes(msg.messageId)) {
    if (config.trackerId) {
      // EL TRACKER YA TIENE ID CONFIGURADA Y VIO EL MENSAJE. ES EL NODO CON EL CUAL SE COMUNICO.

      let messageIndex = messages.indexOf(msg.messageId);
      messages.splice(messageIndex, 1);

      let newId;

      if (!msg.body.firstNode) {
        newId = (
          msg.body.score + Number.parseInt("0x" + msg.body.leftNodeId)
        ).toString(16);
      } else {
        newId = msg.body.score.toString(16);
      }

      let response = {
        messageId: msg.messageId,
        route: msg.route,
        body: {
          newNodeId: newId,
          rightNodeId: msg.body.rightNodeId,
          rightNodeAddress: msg.body.rightNodeAddress,
          rightNodePort: msg.body.rightNodePort,
          leftNodeId: msg.body.leftNodeId,
          leftNodeAddress: msg.body.leftNodeAddress,
          leftNodePort: msg.body.leftNodePort,
        },
      };

      sendUdpMessage(JSON.stringify(response), {
        address: msg.body.newNodeIp,
        port: msg.body.newNodePort,
      }).then(() => {
        console.log("Mensaje JOIN devuelto a nuevo tracker.");
      });

      response = {
        messageId: msg.messageId,
        route: JOIN_CONFIG_ROUTE,
        body: {
          rightNodeId: newId,
          rightNodeAddress: msg.body.newNodeIp,
          rightNodePort: msg.body.newNodePort,
        },
      };

      sendUdpMessage(JSON.stringify(response), {
        address: msg.body.leftNodeAddress,
        port: msg.body.leftNodePort,
      }).then(() => {
        console.log("Mensaje JOIN CONFIG enviado a tracker izquierdo.");
      });

      response = {
        messageId: msg.messageId,
        route: JOIN_CONFIG_ROUTE,
        body: {
          leftNodeId: newId,
          leftNodeAddress: msg.body.newNodeIp,
          leftNodePort: msg.body.newNodePort,
        },
      };

      sendUdpMessage(JSON.stringify(response), {
        address: msg.body.rightNodeAddress,
        port: msg.body.rightNodePort,
      }).then(() => {
        console.log("Mensaje JOIN CONFIG enviado a tracker derecho.");
      });
    } else {
      // EL NODO RECIBE SUS PARAMETROS DE CONFIGURACION

      let index = messages.indexOf(msg.messageId);
      messages.splice(index, 1);

      config.trackerId = msg.body.newNodeId;

      config.rightTrackerAddress = msg.body.rightNodeAddress;
      config.rightTrackerId = msg.body.rightNodeId;
      config.rightTrackerPort = msg.body.rightNodePort;

      config.leftTrackerId = msg.body.leftNodeId;
      config.leftTrackerPort = msg.body.leftNodePort;
      config.leftTrackerAddress = msg.body.leftNodeAddress;

      console.log("Configuracion realizada: " + JSON.stringify(config));
    }
  } else {
    // BUSCAR TAMAÑO MAXIMO
    messages.push(msg.messageId);
    setTimeout(() => {
      if (messages.includes(msg.messageId)) {
        let index = messages.indexOf(msg.messageId);
        messages.splice(index, 1);
      }
    }, 5000);

    let score;
    let firstNode = config.trackerId < config.leftTrackerId;

    if (firstNode) {
      // PRIMER NODO

      let lastTrackerScore =
        0xff - Number.parseInt("0x" + config.leftTrackerId);

      let firstTrackerScore;

      if (files.size === 0) {
        let h = Number.parseInt("0x" + config.trackerId);
        firstTrackerScore = Math.floor(h / 2);
      } else {
        let keys = files.keys();
        let min = keys[0];
        keys.slice(1).forEach((key) => {
          if (key < min) {
            min = key;
          }
        });

        let h = Number.parseInt("0x" + min);

        let trackerDistance = Number.parseInt("0x" + config.trackerId);

        if (h < Math.floor(trackerDistance / 2)) {
          firstTrackerScore = h;
        } else {
          firstTrackerScore = Math.floor(trackerDistance / 2);
        }
      }

      if (lastTrackerScore > firstTrackerScore) {
        score = lastTrackerScore;
        firstNode = false;
      } else {
        score = firstTrackerScore;
      }
    } else {
      if (files.size === 0) {
        let h =
          Number.parseInt("0x" + config.trackerId) -
          Number.parseInt("0x" + config.leftTrackerId);
        score = Math.floor(h / 2);
      } else {
        let keys = files.keys();
        let min = keys[0];
        keys.slice(1).forEach((key) => {
          if (key < min) {
            min = key;
          }
        });

        let h =
          Number.parseInt("0x" + min) -
          Number.parseInt("0x" + config.leftTrackerId);

        let trackerDistance =
          Number.parseInt("0x" + config.trackerId) -
          Number.parseInt("0x" + config.leftTrackerId);

        if (h < Math.floor(trackerDistance / 2)) {
          score = h;
        } else {
          score = Math.floor(trackerDistance / 2);
        }
      }
    }

    if (!msg.body.score || score > msg.body.score) {
      msg.body.score = score;

      msg.body.leftNodeAddress = config.leftTrackerAddress;
      msg.body.leftNodeId = config.leftTrackerId;
      msg.body.leftNodePort = config.leftTrackerPort;

      msg.body.rightNodeId = config.trackerId;
      msg.body.rightNodeAddress = config.localAddress;
      msg.body.rightNodePort = config.localPort;

      msg.body.firstNode = firstNode;
    }

    sendUdpMessage(JSON.stringify(msg), {
      address: config.rightTrackerAddress,
      port: config.rightTrackerPort,
    }).then(() => {
      console.log("Mensaje JOIN enviado a tracker derecho.");
    });
  }
}

function joinConfig(msg) {
  messages.push(msg.messageId);
  setTimeout(() => {
    if (messages.includes(msg.messageId)) {
      let index = messages.indexOf(msg.messageId);
      messages.splice(index, 1);
    }
  }, 2000);

  if (msg.body.leftNodeId) {
    config.leftTrackerId = msg.body.leftNodeId;
    config.leftTrackerAddress = msg.body.leftNodeAddress;
    config.leftTrackerPort = msg.body.leftNodePort;
    console.log(
      "JOIN CONFIG realizado. Configuracion: " + JSON.stringify(config)
    );
  } else if (msg.body.rightNodeId) {
    config.rightTrackerId = msg.body.rightNodeId;
    config.rightTrackerAddress = msg.body.rightNodeAddress;
    config.rightTrackerPort = msg.body.rightNodePort;
    console.log(
      "JOIN CONFIG realizado. Configuracion: " + JSON.stringify(config)
    );
  } else {
    console.log("JOIN CONFIG erroneo recibido.");
  }
}
