const URL_FILES = "http://localhost:4000/file";

const ListResponse = document.querySelector("#files-list");

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
      tpl += `<li> ${hash} ${filename} ${filesize} ${par}</li>`;
    });
    ListResponse.innerHTML = `<ul>${tpl}</ul>`;
  });

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
        id:
          document
            .getElementById("file-name")
            .innerHTML.replace("Nombre del archivo: ", "") +
          document
            .getElementById("file-size")
            .innerHTML.replace("Tamaño: ", "")
            .replace(" bytes", ""),
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
          mode: "cors",
          cache: "no-cache",
          credentials: "same-origin",
          headers: {
            "Content-Type": "application/json",
          },
          redirect: "follow",
          referrerPolicy: "no-referrer",
          body: JSON.stringify(data),
        });
        console.log(data);
        return response.json();
      }

      postData(URL_FILES, data).then((res) => {
        console.log("Respuesta");
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
