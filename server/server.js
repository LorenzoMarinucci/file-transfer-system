const express = require('express');
const path = require('path');
const app = express();
const portTCP = 8080;
const portUDP = 8081;
const portTracker = 8082;
const dgram = require('dgram'); //conexiones UDP
const socketUDP = dgram.createSocket('udp4'); //socket para UDP
//deberiamos agregar la direccion del nodo tracker 1?

//TCP

app.use(express.static("../client"));

app.listen(portTCP, () => {
  console.log(`Server listening at http://localhost:${portTCP}`);
})

//UDP

socketUDP.on('listening', () => {
  let addr = socketUDP.address();
  console.log(`Listening for UDP packets at ${addr.address}:${addr.port}`);

  //invoca a scan para probar funcionalidad
  scan();
});

socketUDP.on('error', (err) => {
  console.error(`UDP error: ${err.stack}`);
});

socketUDP.on('message', (msg, rinfo) => {
  console.log(`(UDP) recibido: ${msg} desde ${rinfo.address}:${rinfo.port}`);
});

socketUDP.bind(portUDP); //se pone a escuchar para UDP

//Scan: solicita un escaneo de archivos del vecino o de toda la red
function scan(){

  let message = '/scan';
  socketUDP.send(message, portTracker, 'localhost', (err) => { //envio de la peticion scan
    //socketUDP.close(); deberia hacer un close?
  });
}

