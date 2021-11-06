const inquirer = require("inquirer");
const fs = require("fs");
const { exit } = require("process");
const TORRENTE_REGEX = /[a-zA-Z0-9]+\.torrente$/;
const FILES_DIR = "./files/";
const CONFIG_FILE = "./config/config.json";
const config = loadConfig();
const downloader = require("./downloader");
const torrenteRequest = require("./torrenteRequest");
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

    //let info = JSON.parse(
    // fs.readFileSync(`${FILES_DIR}${answers.descarga}`, "utf-8")
    //);

    //console.log(info);
    //aca se realiza la coneccion UDP con el tracker para descargar el archivo a partir de la info en el archivo .torrente
    let found = torrenteRequest(FILES_DIR + answers.descarga, config.port); //hace la peticion al tracker

    let peerIp = found.body.pares.parIP;
    let peerPort = found.body.pares.parPort;

    //let peerIp = "127.0.0.1";
    //let peerPort = 10004;
    downloader
      .startDownload("testvuelta.txt", peerIp, peerPort)
      .catch((err) => {
        console.log(err);
      });
  });

function loadConfig() {
  return JSON.parse(fs.readFileSync(CONFIG_FILE, "utf8"));
}

let net = require("net");

let server,
  istream = fs.createReadStream("./files/test.txt");

server = net.createServer((socket) => {
  // 'connection' listener.
  socket.pipe(process.stdout);
  istream.on("readable", function () {
    let data;
    while ((data = this.read())) {
      socket.write(data);
    }
  });
  istream.on("end", function () {
    socket.end();
  });
  socket.on("end", () => {
    server.close(() => {
      console.log("\nTransfer is done!");
    });
  });
});

server.on("error", (err) => {
  throw err;
});

server.listen(config.port, () => {
  console.log("server bound");
});
