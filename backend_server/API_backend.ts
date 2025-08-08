/*
 * @glance	Fastly is a gateway layer for this backend server. Server
		protection: Client (browser) ──▶ Fastly Edge
		(src/index.js injects secret header) ──▶ Backend
		(Node.js validates header)
*/

const http = require('node:http'); //load a builtin http module
//return a reference to JavaScript object
require('dotenv').config();
const FASTLY_SECRET = process.env.FASTLY_SECRET;
const fs = require('fs');
const util = require('util');

//create a write stream in append more
const logFile = fs.createWriteStream('./server.log', { flags: 'a' });

//save original builtin console.log
const origConsoleLog = console.log;

function getTimestamp() {
	return new Date().toISOString();
}

//override console.log
console.log = function(...args) {
	const timestamp = getTimestamp();
	const message = args.map(arg => util.format(arg)).join(' ');
	const fullMessage = `[${timestamp}] ${message}\n`;//backticks expand variables
	//write to log file
	logFile.write(fullMessage);
	//also write to console
	origConsoleLog.apply(console, [`[${timestamp}]`, ...args]);
};

let toggle = false;//server side toogle state
const html = fs.readFileSync('index.html', 'utf8');

const hostname = '0.0.0.0';
const port = 3000;
//const allowedIPs = ['::1', '127.0.0.1', '146.255.180.71'];//TODO add Fastly edge IP
const server = http.createServer(function(req, res) {
	//sercret header
	const secret = req.headers['x-fastly-secret'];
	const url = new URL(req.url, 'http://${req.headers.host}');
	const path = url.pathname;
	//debug header
	console.log("Incoming headers:");
	console.log(req.headers);
	if (secret !== FASTLY_SECRET) {
		console.log(`[WARN] Blocked direct request from ${req.socket.remoteAddress}`);//todo log to console
		res.writeHead(403, { 'Content-Type': 'text/plain' });
		res.end('Forbidden');
		return;
	}
	//RESTful API functionality
	if (req.method === 'GET' && path.startsWith('/user/')) {
		const userID = url.pathname.split("/")[2];
		console.log(`[INFO] Received GET /user/ from ${req.socket.remoteAddress}`);//debug start
		console.log(`[INFO] Secret header: ${secret}`);
		//build a JS object
		const user =
		{
			id: userID ?? null,
			name: 'Illimar',
			role: 'back-end fellow'
		};
		res.writeHead(200, { 'Content-Type': 'application/json' });
		res.end(JSON.stringify(user));
	}
	else if (req.method === 'GET' && req.url === '/') {
		res.writeHead(200, { 'Content-Type': 'text/html' });//serve html head
		const html = fs.readFileSync('index.html', 'utf8');
		res.end(html);
	}
	else if (req.method === 'POST' && req.url === '/toggle') {
		console.log(`[INFO] Received POST /toggle from ${req.socket.remoteAddress}`);//debug start
		console.log(`[INFO] Secret header: ${secret}`);

		let body = '';
		req.on('data', chunk => {
			body += chunk;
		});
		req.on('end', () => {
			console.log(`[INFO] Body: ${body}`);//debug end
			toggle = !toggle;
			const responseText = toggle ? "Paragraph changed." : "Not changed.";
			res.writeHead(200, { 'Content-Type': 'text/plain' });
			res.end(responseText);
		});
	}

	else {
		res.writeHead(404, { 'Content-Type': 'text/plain' });
		res.end('Not found');
	}
	console.log("Metod: ".concat(req.method));
	console.log("URL: ".concat(req.url));
});
//debug connection from fastly
server.on('request', (req, res) => {
	console.log("[DEBUG] Got HTTP request:", req.method, req.url);

});

server.listen(port, hostname, function() {
	console.log(`Server running at http://"${hostname}: ${port}/`);
});
