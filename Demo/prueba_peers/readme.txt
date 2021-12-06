Tuve que instalar sha-1 en los peers (npm install sha-1) 

Funcionamiento:


1. 	cargar un archivo al sistema desde el cliente (hay que tener todos los procesos corriendo)
	ese archivo debe estar en la carpeta /files del peer 15001

2. 	bajarse el .torrente y guardarlo en la carpeta files del peer 15000

3.	ejecutar ambos peers y desde el peer 15000 seleccionar el archivo correspondiente

	los peers hacen lo siguiente:
	
	a. consulta al tracker por el peer que almacena el file
	b. envia al peer 15001 el hash del archivo que quiere bajar
	c. el peer 15001 busca cual es el archivo al que le corresponde el hash
	d. el peer 15001 envia el archivo y cuando termina destruye el socket

4. el archivo se almacena en /files del peer 15000 con el nombre "download"
