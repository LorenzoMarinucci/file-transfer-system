const URL_FILES = 'http://localhost:8080/files';

const ListResponse = document.querySelector('#files-list');

fetch(URL_FILES)
    .then((response) => response.json())
    .then((value) => {
        let tpl = '';
        Object.entries(value).map(entry => {
            let hash = entry[0];
            let file = entry[1];
            let filename = file.filename;
            let filesize = file.filesize;
            let par = file.par;
            tpl += `<li> ${hash} ${filename} ${filesize} ${par}</li>`;
        });
        ListResponse.innerHTML = `<ul>${tpl}</ul>`;
    })