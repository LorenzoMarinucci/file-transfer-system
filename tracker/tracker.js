const config = require("./config/config");
const { sendUdpMessage } = require("../middleware/communication");

// EXPRESIONES REGULARES PARA LOS ROUTE

const SCAN_REGEX = /^\/scan$/; //  /scan
const STORE_REGEX = /^\/file\/[a-z0-9]+\/store$/; //  /file/{hash}/store
const FILE_REQUEST_REGEX = /^\/file\/[a-z0-9]+$/; //  /file/{hash}
const COUNT_REGEX = /^\/count$/; //  /count

// CONEXIÓN UDP

const dgram = require("dgram"); //conexiones UDP
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
  constructor(id, filename, filesize, parIp, parPort) {
    this.id = id;
    this.filename = filename;
    this.filesize = filesize;
    this.pares = [];
    this.pares.push({ parIp, parPort });
  }

  addPar(parIp, parPort) {
    if (!this.pares.includes({ parIp, parPort })) {
      this.pares.push({ parIp, parPort });
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
    sendUdpMessage(
      JSON.stringify(msg),
      { address: msg.originIP, port: msg.originPort },
      false
    ).then(() => {
      console.log("SCAN retornado al origen.");
    });
  } else {
    // AÑADIR LA ID DEL MENSAJE COMO LEÍDO
    messages.push(msg.messageId);
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

    sendUdpMessage(
      JSON.stringify(msg),
      { address: config.rightTrackerAddress, port: config.rightTrackerPort },
      false
    ).then(() => {
      console.log("Mensaje SCAN pasado a tracker derecho.");
    });
  }
}

function store(msg) {
  // NO SE VERIFICA ID, YA QUE MINIMAMENTE ALGUN NODO GUARDARA EL ARCHIVO
  messages.push(msg.messageId);

  let hash = msg.body.id.substring(0, 2);

  if (hash > config.trackerId) {
    // EL ID NO ES MAYOR AL HASH QUE SE QUIERE ALMACENAR, PASA EL MENSAJE AL TRACKER DERECHO, QUE POSEE MAYOR ID
    // TO-DO: reenviar mensaje al tracker derecho
    sendUdpMessage(
      JSON.stringify(msg),
      { address: config.rightTrackerAddress, port: config.rightTrackerPort },
      false
    ).then(() => {
      console.log("Mensaje STORE pasado a tracker derecho.");
    });
  } else {
    if (config.leftTrackerId > hash) {
      // EL ID ES MAYOR AL HASH, PERO NO ES EL MENOR DE LOS MAYORES. PASA EL MENSAJE AL TRACKER IZQ
      // TO-DO: reenviar mensaje al tracker izquierdo
      sendUdpMessage(
        JSON.stringify(msg),
        { address: config.leftTrackerAddress, port: config.leftTrackerPort },
        false
      ).then(() => {
        console.log("Mensaje STORE pasado a tracker izquierdo.");
      });
    } else {
      // EL HASH ESTÁ DENTRO DEL DOMINIO DEL TRACKER
      if (files.keys.includes(hash)) {
        // SE REVISA SI LOS 2 CARACTERES DEL HASH YA PERTENECEN A LA DHT
        matchingFiles = files.get(hash);
        file = matchingFiles.filter((possibleFile) => {
          // BUSCA SI EL ARCHIVO YA EXISTE EN LA DHT. LOS IDS DEBEN SER IGUALES
          return possibleFile.id === msg.body.id;
        });

        if (file) {
          // EL ARCHIVO EXISTE, SE AGREGAN LOS NUEVOS PARES
          file.addPar(msg.body.parIP, msg.body.parPort);
        } else {
          // EL ARCHIVO NO EXISTE, SE LO AGREGA AL BUCKET
          let file = new File(
            msg.body.id,
            msg.body.filename,
            msg.body.filesize,
            msg.body.parIP,
            msg.body.parPort
          );
          matchingFiles.push(file);
        }
      } else {
        // LOS CARACTERES NO EXISTEN EN LA DHT
        // CREA EL ARRAY CORRESPONDIENTE A LOS CARACTERES E INSERTA EL NUEVO ARCHIVO
        let file = new File(
          msg.body.id,
          msg.body.filename,
          msg.body.filesize,
          msg.body.parIP,
          msg.body.parPort
        );
        files.set(hash, [file]);
      }
      let file = new File(msg.body.id);
    }
  }
}

function search(msg) {
  if (messages.includes(msg.messageId)) {
    messages.splice(msg.messageId);
    // EL MENSAJE DIO TODA LA VUELTA
  } else {
    let hash = msg.route.split("/file/")[1];
    let bucket = hash.substring(0, 2);
    if (bucket > config.trackerId) {
      //TO-DO: ENVIAR MENSAJE A TRACKER DERECHO
      sendUdpMessage(
        JSON.stringify(msg),
        { address: config.rightTrackerAddress, port: config.rightTrackerPort },
        false
      ).then(() => {
        console.log("Mensaje SEARCH pasado a tracker derecho.");
      });
    } else {
      if (config.leftTrackerId > bucket) {
        //TO-DO: ENVIAR MENSAJE A TRACKER IZQ
        sendUdpMessage(
          JSON.stringify(msg),
          { address: config.leftTrackerAddress, port: config.leftTrackerPort },
          false
        ).then(() => {
          console.log("Mensaje SEARCH pasado a tracker izquierdo.");
        });
      } else {
        // ARCHIVO ESTA DENTRO DEL DOMINIO
        matchingFiles = files.get(bucket);
        file = matchinfFiles.filter((possibleMatch) => {
          return hash === possibleMatch.id;
        });

        if (file) {
          // LO ENCONTRO, ENVIAR FOUND
          let pairs = file.pairs;
          msg.body = file;
          sendUdpMessage(
            JSON.stringify(msg),
            {
              address: config.rightTrackerAddress,
              port: config.righTrackerPort,
            },
            false
          ).then(() => {
            console.log("Mensaje FOUND pasado al origen.");
          });
        } else {
          // NO ENCONTRADO
        }
      }
    }
  }
}

function getPair(originMsg) {
  let route = originMsg.route;
  let hash = route.split("/file/")[1];
  let pair = ({ filename, filesize, nodePort, nodeIp } = files.get(hash));
  //si lo encuentra debe devolver un found, sino pasar el mensaje al siguiente tracker.
  found(originMsg, hash);
  //else --> search al nodo siguiente...
}

function found(originMsg, hash) {
  let pair = ({ filename, filesize, nodePort, nodeIp } = files.get(hash));

  let foundMsg = originMsg;
  foundMsg.body = {
    id: hash,
    trackerIP: "127.0.0.1",
    trackerPort: portTracker,
    pares: [
      {
        parIP: pair.nodeIp,
        parPort: pair.nodePort,
      },
    ],
  };
  destination_IP = originMsg.originIP;
  destination_port = originMsg.originPort;

  console.log("found response = " + JSON.stringify(foundMsg));

  socket.send(
    JSON.stringify(foundMsg),
    destination_port,
    destination_IP,
    (err) => {
      if (err) {
        console.log(err);
      }
    }
  );
}

function count(msg) {
  if (messages.includes(msg.messageId)) {
    messages.splice(msg.messageId);
    // EL MENSAJE VUELVE AL ORIGEN Y CORTA
    console.log("Tracker count: " + msg.body.trackerCount);
    console.log("File count: " + msg.body.fileCount);
  } else {
    msg.body.trackerCount += 1;
    fileCount = countFiles();
    msg.body.fileCount += fileCount;
    // TO-DO: ENVIAR MENSAJE A TRACKER DERECHO
    sendUdpMessage(
      JSON.stringify(msg),
      {
        address: config.rightTrackerAddress,
        port: config.righTrackerPort,
      },
      false
    ).then(() => {
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
