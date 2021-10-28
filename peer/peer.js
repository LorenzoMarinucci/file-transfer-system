const inquirer = require('inquirer');
const fs = require('fs');
const { exit } = require('process');
const TORRENTE_REGEX = /[a-zA-Z0-9]+\.torrente$/;
var files = []; 

fs.readdirSync('.').forEach(file => {
    if(TORRENTE_REGEX.test(file)){
        files.push(file);
    }
  });
files.push(new inquirer.Separator());
files.push('exit');

inquirer.prompt({
    name: 'descarga',
    type: 'list',
    message: 'Seleccione archivo de descarga',
    choices: files
})

.then((answers) => {

    if(answers.descarga == 'exit'){
        process.exit(0)
    }
    console.log('Descargando archivo', answers.descarga);

    let info = JSON.parse(fs.readFileSync(`./${answers.descarga}`, 'utf-8'));

    console.log(info);
    //aca se realiza la coneccion UDP con el tracker para descargar el archivo a partir de la info en el archivo .torrente
  });