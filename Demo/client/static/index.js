const URL_FILES = "http://localhost:4000/file";

const ListResponse = document.querySelector("#files-list");

listFiles();

var Alert = new CustomAlert();

function CustomAlert() {
  this.render = function () {
    //Mostrar ventana de carga de archivo
    let popUpBox = document.getElementById("popUpBox");
    popUpBox.style.display = "block";
    //Cerrar ventana luego de presionar cargar
    document.getElementById("closeModal").innerHTML =
      '<button onclick="Alert.ok()">Cargar</button>';
    document.getElementById("file-name").innerHTML = "Nombre del archivo: ";
    document.getElementById("file-size").innerHTML = "Tamaño: ";
    document.getElementById("port-input").value = "";
    document.getElementById("ip-input").value = "";
  };
  this.ok = function () {
    if (
      document.getElementById("ip-input").value === "" ||
      document.getElementById("port-input").value === ""
    ) {
      window.alert("Debe ingresar IP y Puerto válidos");
    } else {
      const file = buildFileDataObject();
      uploadFile(file);
      closeUpload();
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

function closeUpload() {
  document.getElementById("popUpBox").style.display = "none";
  document.getElementById("popUpOverlay").style.display = "none";
}

function buildFileDataObject() {
  const filename = document
    .getElementById("file-name")
    .innerHTML.replace("Nombre del archivo: ", "");
  const filesize = document
    .getElementById("file-size")
    .innerHTML.replace("Tamaño: ", "")
    .replace(" bytes", "");
  const nodeIp = document.getElementById("ip-input").value;
  const nodePort = Number.parseInt(document.getElementById("port-input").value);
  return { filename, filesize, nodePort, nodeIp };
}

async function uploadFile(data) {
  await fetch(URL_FILES, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
}

function listFiles() {
  fetch(URL_FILES)
    .then((response) => response.json())
    .then((value) => {
      let tpl = "";
      Object.entries(value).map((entry) => {
        let file = entry[1];
        console.log(file);
        let hash = file.id;
        let filename = file.filename;
        let filesize = file.filesize;
        let url = URL_FILES + "/" + hash;
        tpl += `<li><b>Nombre de archivo: </b>${filename} | <b>Tamaño: </b>${filesize} bytes | <a href="${url}">Descargar</a></li>`;
      });
      ListResponse.innerHTML = `<ul>${tpl}</ul>`;
    });
}
