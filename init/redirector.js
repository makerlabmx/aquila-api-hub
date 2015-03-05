#!/usr/bin/env node

// Redirect from http to https
var http = require('http');
http.createServer(function (req, res) {
    res.writeHead(301, { "Location": "https://" + req.headers['host'] /*+ req.url*/ });
    res.end();
}).listen(8000);