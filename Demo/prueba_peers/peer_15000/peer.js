const inquirer = require("inquirer");
const fs = require("fs");
const { exit } = require("process");
const TORRENTE_REGEX = /[a-zA-Z0-9]+\.torrente$/;
const FILES_DIR = "./files/";
const CONFIG_FILE = "./config/config.json";
const config = loadConfig();
const downloader = require("./downloader");
const torrenteRequest = require("./torrenteRequest");
const sha1 = require("sha-1");
console.log(config);
let files = [];

function mainMenu() {
  fs.readdirSync(FILES_DIR).forEach((file) => {
    if (TORRENTE_REGEX.test(file)) {
      files.push(file);
    }
  });
  files.push(new inquirer.Separator());
  files.push("exit");
}

loadConfig();
mainMenu();

inquirer
  .prompt({
    name: "descarga",
    type: "list",
    message: "Seleccione archivo de descarga",
    choices: files,
  })

  .then((answers) => {
    if (answers.descarga == "exit") {
      process.exit(0);
    }
    console.log("Descargando archivo", answers.descarga);

    //console.log(info);
    //aca se realiza la coneccion UDP con el tracker para descargar el archivo a partir de la info en el archivo .torrente
    torrenteRequest.torrenteRequest(FILES_DIR + answers.descarga, config.address, config.port) //hace la peticion al tracker
    .then( (found) => {
      let peerIp = found.body.pares[0].parIP;
      let peerPort = found.body.pares[0].parPort;
      let filehash = found.body.id;
      let filename = found.body.filename;
      //console.log("filename = " + filename);
      //console.log("Found = " + JSON.stringify(found));
      downloader
      .startDownload(filename, peerIp, peerPort, filehash)
      .catch((err) => {
        console.log(err);
      });
    })
    .catch((err) => {
      console.log("Error while requesting tracker.");
      console.log(err);
    });
  });

function loadConfig() {
  return JSON.parse(fs.readFileSync(CONFIG_FILE, "utf8"));
}

let net = require("net");

let server = net.createServer();

server.on("connection", function(c){

  c.on("data", function(request){
    //console.log("recibido: " + JSON.parse(request));

    //verifica cual es el archivo con el hash correspondiente
    var transferFile;
    var requestHash = JSON.parse(request).hash;
    fs.readdirSync(FILES_DIR).forEach((file) => {
      var stats = fs.statSync("./files/" + file);
      var fileSize = stats.size;
      if ( sha1(file + fileSize) == requestHash) {
        transferFile = file;
      }
    });


    console.log("\n\ntransfered: " + transferFile);

    var readStream = fs.createReadStream("./files/" + transferFile);

    readStream.on('data', function(chunk){
      
      //console.log("Leido: " + chunk.toString());
      c.write(chunk);
    });

    readStream.on('end', function(){
      c.destroy();
      //console.log("readStream closed, socket destroyed");
    });

  })

})

server.on("error", (err) => {
  throw err;
});

server.listen(config.port, () => {
  //console.log("server bound");
});
