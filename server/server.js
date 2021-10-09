"use strict";

const express = require("express");
var os = require("os");
console.log(os.networkInterfaces());
const path = require("path");
const app = express();
const {
  hostname,
  portTCP,
  portUDP,
  portTracker,
} = require("./modules/environment");
const dgram = require("dgram"); //conexiones UDP
//deberiamos agregar la direccion del nodo tracker 1?

//TCP

app.use(express.static("../client"));

app.listen(portTCP, () => {
  console.log(`Server listening at ${hostname}:${portTCP}`);
});

app.get("/files", function (req, res) {
  scan().then((val) => {
    let value = JSON.parse(val.toString("utf-8"));
    console.log("respuesta desde el tracker =", value);
    res.json(value);
  });
});

//Scan: solicita un escaneo de archivos del vecino o de toda la red
function scan() {
  return udpListen("/scan"); //con await despues del return
}

//UDP interface (es una funcion generica que le envia un mensaje al tracker y devuelve la respuesta)
function udpListen(msg) {
  return new Promise(function (resolve, reject) {
    const socketUDP = dgram.createSocket("udp4"); //socket para UDP

    socketUDP.on("listening", () => {
      let addr = socketUDP.address();
      console.log(`Listening for UDP packets at ${addr.address}:${addr.port}`);
      socketUDP.send(msg, portTracker, "localhost", (err) => {});
    });

    socketUDP.on("error", (err) => {
      console.error(`UDP error: ${err.stack}`);
      socketUDP.close();
      resolve(err);
    });

    socketUDP.on("message", (msg, rinfo) => {
      console.log(
        `(UDP) recibido: ${msg} desde ${rinfo.address}:${rinfo.port}`
      );
      socketUDP.close();
      resolve(msg);
    });

    socketUDP.bind(portUDP); //se pone a escuchar para UDP
  });
} //fin udpListen
