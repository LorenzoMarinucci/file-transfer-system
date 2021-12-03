let net = require("net");
let fs = require("fs");
const FILES_DIR = "./files/";

async function startDownload(filename, peerIp, peerPort, filehash) {
  const filePath = FILES_DIR + filename;

  await fs.unlink(filePath, (err) => {}); // borra el archivo previo

  let client = new net.Socket();

  client.connect(peerPort, peerIp, function () {
    console.log("Connected to ", peerIp);

    client.write(JSON.stringify({
      type: "GET FILE",
      hash: filehash
    }));
    console.log("hash enviado al peer servidor");
  });

  let ostream = fs.createWriteStream("./files/testvuelta.txt");
  let date = new Date(),
    size = 0,
    elapsed;

  client.on("data", (chunk) => {
    size += chunk.length;
    elapsed = new Date() - date;
    client.write(
      `\r${(size / (1024 * 1024)).toFixed(
        2
      )} MB of data was sent. Total elapsed time is ${elapsed / 1000} s`
    );
    process.stdout.write(
      `\r${(size / (1024 * 1024)).toFixed(
        2
      )} MB of data was sent. Total elapsed time is ${elapsed / 1000} s`
    );
    ostream.write(chunk);
  });
  client.on("end", () => {
    console.log(
      `\nFinished getting file. speed was: ${(
        size /
        (1024 * 1024) /
        (elapsed / 1000)
      ).toFixed(2)} MB/s`
    );
    process.exit();
  });

  /* client.on("data", function (data) {
    console.log("Received: " + data);
    //client.destroy();
    fs.appendFile(filePath, data, (err, data) => {
      if (err) throw err;
      console.log("escribe");
    });
  });

  client.on("close", function () {
    console.log("Connection closed");
  }); */
}

module.exports = {
  startDownload,
};
