const portTracker = 8082;
const portServerUDP = 4001;
const { count } = require("console");
const dgram = require("dgram"); //conexiones UDP
const socketUDP = dgram.createSocket("udp4"); //socket para UDP

const SCAN_REGEX = /^\/scan$/; //  /scan
const STORE_REGEX = /^\/file\/[a-z0-9]+\/store$/; //  /file/{hash}/store
const FILE_REQUEST_REGEX = /^\/file\/[a-z0-9]+$/; //  /file/{hash}
const COUNT_REGEX = /^\/count$/; //  /count

const files = new Map();

files.set("hash1", {
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
  nodePort: 1,
  nodeIp: "128.0.0.3",
});

socketUDP.on("listening", () => {
  let addr = socketUDP.address();
  console.log(`Listening for UDP packets at ${addr.address}:${addr.port}`);
});

socketUDP.on("error", (err) => {
  console.error(`UDP error: ${err.stack}`);
});

socketUDP.on("message", (msg, rinfo) => {
  console.log(`(UDP) recibido: ${msg} desde ${rinfo.address}:${rinfo.port}`);
  let parsedMsg = JSON.parse(msg);
  let route = parsedMsg.route;
  switch (true) {
    case SCAN_REGEX.test(route): {
      scan();
      break;
    }
    case STORE_REGEX.test(route): {
      uploadFile();
      break;
    }
    case FILE_REQUEST_REGEX.test(route): {

      //let hash = route.split("/file/")[1];
      //getPair(hash);
      getPair(parsedMsg); //paso el mensaje completo porque necesito los datos para devolver un found o replicar el search
    }
    case COUNT_REGEX.test(route): {
      count();
    }
  }
});

socketUDP.bind(portTracker); //se pone a escuchar para UDP

//scan
function scan() {
  //deberia pedir por UDP los objetos files de todos los nodos tracker restantes y luego devolverlos
  const mapToObject = Object.fromEntries(files);
  let message = JSON.stringify(mapToObject);
  socketUDP.send(message, portServerUDP, "localhost", (err) => {
    if (err) {
      console.log(err);
    }
  });
}

function uploadFile() {
  let message = "ack";
  socketUDP.send(message, portServerUDP, "localhost", (err) => {
    if (err) {
      console.log(err);
    }
  });
}

/*
function getPair(hash) {
  let pair = ({ filename, filesize, nodePort, nodeIp } = files.get(hash));
  //si lo encuentra debe devolver un found, sino pasar el mensaje al siguiente tracker.
  found();

  socketUDP.send(JSON.stringify(pair), portServerUDP, "localhost", (err) => {
    if (err) {
      console.log(err);
    }
  });
}
*/

function getPair(originMsg) {

  let route = originMsg.route;
  let hash = route.split("/file/")[1];
  let pair = ({ filename, filesize, nodePort, nodeIp } = files.get(hash));
  //si lo encuentra debe devolver un found, sino pasar el mensaje al siguiente tracker.
  found(originMsg, hash);
  //else --> search al nodo siguiente...

}

function found(originMsg, hash){
  let pair = ({ filename, filesize, nodePort, nodeIp } = files.get(hash));
  let foundMsg = originMsg;
  foundMsg.body = {
    id: hash,
    trackerIP: '127.0.0.1',
    trackerPort: portTracker,
    pares: [{
        parIP: nodeIp,
        parPort: nodePort
    }]
  }
  destination_IP = originMsg.originIP;
  destination_port = originMsg.originPort;

  socketUDP.send(JSON.stringify(foundMsg), destination_port, destination_IP, (err) => {
    if (err) {
      console.log(err);
    }
  });
}

//agregar un nuevo archivo
function addFile(filename, filesize, par) {
  let hash = "sha1"; //obtener hash SHA-1 para agregar al diccionario "files" como key
  files.hash = {
    filename,
    filesize,
    par,
  };
}

//debe contar todos los trackers y archivos del sistema, por ahora solo trabaja en el tracker actual
function count() {
  body = {
    trackerCount: 1, //se deberia aumentar en 1 por cada tracker que pasa, por ahora queda asi
    fileCount: files.size,
  };

  let message = JSON.stringify();
  socketUDP.send(message, portServerUDP, "localhost", (err) => {
    if (err) {
      console.log(err);
    }
  });
}
