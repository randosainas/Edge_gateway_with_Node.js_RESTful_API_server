/*
 * @glance	Fastly is a gateway layer for this backend server. Server
        protection: Client (browser) ──▶ Fastly Edge
        (src/index.js injects secret header) ──▶ Backend
        (Node.js validates header)
*/
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
var http = require('node:http'); //load a builtin http module
//return a reference to JavaScript object
require('dotenv').config();
var FASTLY_SECRET = process.env.FASTLY_SECRET;
var fs = require('fs');
var util = require('util');
//create a write stream in append more
var logFile = fs.createWriteStream('./server.log', { flags: 'a' });
//save original builtin console.log
var origConsoleLog = console.log;
function getTimestamp() {
    return new Date().toISOString();
}
//override console.log
console.log = function () {
    var args = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        args[_i] = arguments[_i];
    }
    var timestamp = getTimestamp();
    var message = args.map(function (arg) { return util.format(arg); }).join(' ');
    var fullMessage = "[".concat(timestamp, "] ").concat(message, "\n"); //backticks expand variables
    //write to log file
    logFile.write(fullMessage);
    //also write to console
    origConsoleLog.apply(console, __spreadArray(["[".concat(timestamp, "]")], args, true));
};
var toggle = false; //server side toogle state
var html = fs.readFileSync('index.html', 'utf8');
var hostname = '0.0.0.0';
var port = 3000;
//const allowedIPs = ['::1', '127.0.0.1', '146.255.180.71'];//TODO add Fastly edge IP
var server = http.createServer(function (req, res) {
    //sercret header
    var secret = req.headers['x-fastly-secret'];
    var url = new URL(req.url, 'http://${req.headers.host}');
    var path = url.pathname;
    //debug header
    console.log("Incoming headers:");
    console.log(req.headers);
    if (secret !== FASTLY_SECRET) {
        console.log("[WARN] Blocked direct request from ".concat(req.socket.remoteAddress)); //todo log to console
        res.writeHead(403, { 'Content-Type': 'text/plain' });
        res.end('Forbidden');
        return;
    }
    //RESTful API functionality
    if (req.method === 'GET' && path.startsWith('/user/')) {
        var userID = url.pathname.split("/")[2];
        console.log("[INFO] Received GET /user/ from ".concat(req.socket.remoteAddress)); //debug start
        console.log("[INFO] Secret header: ".concat(secret));
        //build a JS object
        var user = {
            id: userID !== null && userID !== void 0 ? userID : null,
            name: 'Illimar',
            role: 'back-end fellow'
        };
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(user));
    }
    else if (req.method === 'GET' && req.url === '/') {
        res.writeHead(200, { 'Content-Type': 'text/html' }); //serve html head
        var html_1 = fs.readFileSync('index.html', 'utf8');
        res.end(html_1);
    }
    else if (req.method === 'POST' && req.url === '/toggle') {
        console.log("[INFO] Received POST /toggle from ".concat(req.socket.remoteAddress)); //debug start
        console.log("[INFO] Secret header: ".concat(secret));
        var body_1 = '';
        req.on('data', function (chunk) {
            body_1 += chunk;
        });
        req.on('end', function () {
            console.log("[INFO] Body: ".concat(body_1)); //debug end
            toggle = !toggle;
            var responseText = toggle ? "Paragraph changed." : "Not changed.";
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
server.on('request', function (req, res) {
    console.log("[DEBUG] Got HTTP request:", req.method, req.url);
});
server.listen(port, hostname, function () {
    console.log("Server running at http://\"".concat(hostname, ": ").concat(port, "/"));
});
