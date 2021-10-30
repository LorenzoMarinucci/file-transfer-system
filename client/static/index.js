const URL_FILES = "http://localhost:4000/file";

const ListResponse = document.querySelector("#files-list");

listFiles();

function listFiles() {
  fetch(URL_FILES)
    .then((response) => response.json())
    .then((value) => {
      let tpl = "";
      Object.entries(value).map((entry) => {
        let hash = entry[0];
        let file = entry[1];
        let filename = file.filename;
        let filesize = file.filesize;
        let par = file.par;
        let url = URL_FILES + "/" + hash;
        tpl += `<li>${hash} ${filename} ${filesize} ${par}<a href="${url}"><img src="./img/download_icon.png" style="height: 20px; width: 20px"/></a></li>`;
      });
      ListResponse.innerHTML = `<ul>${tpl}</ul>`;
    });
}

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
      const data = {
        fileName: document
          .getElementById("file-name")
          .innerHTML.replace("Nombre del archivo: ", ""),
        fileSize: document
          .getElementById("file-size")
          .innerHTML.replace("Tamaño: ", "")
          .replace(" bytes", ""),
        nodeIP: document.getElementById("ip-input").value,
        nodePort: document.getElementById("port-input").value,
      };

      async function postData(url, data) {
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        });
        return response.json();
      }

      postData(URL_FILES, data)
        .then(function (response) {
          if (response.ok) {
            console.log(response);
          } else {
            console.log("Respuesta de red OK pero respuesta HTTP no OK");
          }
        })
        .catch(function (error) {
          console.log(
            "Hubo un problema con la petición Fetch:" + error.message
          );
        });

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
