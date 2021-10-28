var net = require('net');
//const TCP_HOST = 123; estos valores los devolveria el tracker
//const TCP_PORT = 123;

var client = new net.Socket();

client.connect(TCP_PORT, TCP_HOST, function() {
	console.log('Connected to ', TCP_HOST);
});

client.on('data', function(data) {
	console.log('Received: ' + data);
	client.destroy();
});

client.on('close', function() {
	console.log('Connection closed');
});