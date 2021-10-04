const URL_FILES = 'http://localhost:8080/files';

const ListResponse = document.querySelector('#files-list');

/*
fetch(URL_FILES)
    .then((response) => response.json())
    .then((files) => {
        const tpl = files.map(file => `<li> ${file.filename} ${file.filesize} ${file.par} </li>`);
        ListResponse.innerHTML = `<ul>${tpl}</ul>`;
    })
*/

fetch(URL_FILES)
    .then((response) => response.json())
    .then((file) => {
        //const tpl = `<li> ${file.filename} ${file.filesize} ${file.par} </li>`;
        const tpl = file.entries((entry) => `<li> ${entry.filename} ${entry.filesize} ${entry.par}</li>`);
        ListResponse.innerHTML = `<ul>${tpl}</ul>`;

    })