const portTracker = 8082;
const portServerUDP = 4001;
const dgram = require("dgram"); //conexiones UDP
const socketUDP = dgram.createSocket("udp4"); //socket para UDP

var files = {
  HASH_1: {
    filename: "example_file1",
    filesize: 21,
    par: "par 1",
  },
  HASH_2: {
    filename: "example_file2",
    filesize: 22,
    par: "par 2",
  },
  HASH_3: {
    filename: "example_file3",
    filesize: 23,
    par: "par 3",
  },
};

socketUDP.on("listening", () => {
  let addr = socketUDP.address();
  console.log(`Listening for UDP packets at ${addr.address}:${addr.port}`);
});

socketUDP.on("error", (err) => {
  console.error(`UDP error: ${err.stack}`);
});

socketUDP.on("message", (msg, rinfo) => {
  console.log(`(UDP) recibido: ${msg} desde ${rinfo.address}:${rinfo.port}`);

  if (msg == "/scan") {
    //si el mensaje es un scan llamo a la funcion scan para que devuelva los files
    scan();
  }
});

socketUDP.bind(portTracker); //se pone a escuchar para UDP

//scan
function scan() {
  //deberia pedir por UDP los objetos files de todos los nodos tracker restantes y luego devolverlos

  let message = JSON.stringify(files);
  socketUDP.send(message, portServerUDP, "localhost", (err) => {
    if (err) {
      console.log(err);
    }
    //socketUDP.close(); deberia cerrarse?
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
