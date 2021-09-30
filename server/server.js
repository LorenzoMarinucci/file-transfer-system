const express = require('express');
const path = require('path');
const app = express();
const port = 8080;

/*
esto es por si usamos 'express pug' para renderizar dinamicamente el html en un futuro con res.render()
app.set('views','./views');
app.set('view engine', 'pug');
*/

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../client', 'index.html')); //envia el index.html del directorio client cuando se hace un GET a '/'
})

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
})