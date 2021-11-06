const URL_FILES = "http://localhost:4000/file/";

const ListResponse = document.querySelector("#files-list");

listFiles();

var Alert = new CustomAlert();

function CustomAlert() {
  this.render = function () {
    //Show Modal
    let popUpBox = document.getElementById("popUpBox");
    popUpBox.style.display = "block";
    //Close Modal
    document.getElementById("closeModal").innerHTML =
      '<button onclick="Alert.ok()">Cargar</button>';
    document.getElementById("file-name").innerHTML = "Nombre del archivo: ";
    document.getElementById("file-size").innerHTML = "Tamaño: ";
  };
  this.ok = function () {
    if (
      document.getElementById("ip-input").value === "" ||
      document.getElementById("port-input").value === ""
    ) {
      window.alert("Debe ingresar IP y Puerto válidos");
    } else {
      const filename = document
        .getElementById("file-name")
        .innerHTML.replace("Nombre del archivo: ", "");
      const filesize = document
        .getElementById("file-size")
        .innerHTML.replace("Tamaño: ", "")
        .replace(" bytes", "");
      const nodeIp = document.getElementById("ip-input").value;
      const nodePort = document.getElementById("port-input").value;

      const data = { filename, filesize, nodePort, nodeIp };

        const rawResponse = fetch(URL_FILES, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        });

        const content = rawResponse.json();
        console.log(content);

      document.getElementById("popUpBox").style.display = "none";
      document.getElementById("popUpOverlay").style.display = "none";
    }
  };
}

document.getElementById("file-input").addEventListener("change", (event) => {
  var files = event.target.files,
    file = files[0];

  document.getElementById("file-name").innerHTML =
    "Nombre del archivo: " + file.name;
  document.getElementById("file-size").innerHTML =
    "Tamaño: " + file.size + " bytes";
});

function listFiles() {
  fetch(URL_FILES)
    .then((response) => response.json())
    .then((value) => {
      let tpl = "";
      Object.entries(value).map((entry) => {
        let hash = entry[0];
        let file = entry[1];
        let filename = file.fileName;
        let filesize = file.fileSize;
        let port = file.nodePort;
        let ip = file.nodeIP;
        let url = URL_FILES + "/" + hash;
        tpl += `<li>Hash: ${hash} | Nombre de archivo: ${filename} | Tamaño: ${filesize} bytes | Puerto: ${port} | IP: ${ip}<a href="${url}"><img src="./img/download_icon.png" style="height: 20px; width: 20px"/></a></li>`;
      });
      ListResponse.innerHTML = `<ul>${tpl}</ul>`;
    });
}
