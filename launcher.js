#!/usr/bin/env node

// aquila-server launcher
require("shelljs/global");
var config = require("shelljs").config;
var path = require("path");

var home = process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'];
var killall = (process.platform == 'win32') ? 'taskkill /IM' : 'killall';

echo("Aquila Server\n");
echo("IMPORTANT: Make shure that the bridge is connected.\n");

// cd to where this file lives
cd(__dirname);

// Create aquila-server config dir if not exists
mkdir("-p", path.join(home, ".aquila-server/data/db"));

// Clean old database log
// Make command output silent
config.silent = true;
rm(path.join(home, ".aquila-server/data/mongodb.log"));
config.silent = false;

// Start MongoDB
// for multi platform compatibility:
var dbpath = path.join(home, ".aquila-server/data/db");
var logpath = path.join(home, ".aquila-server/data/mongodb.log");
echo("Starting Database...");
exec("mongod --dbpath " + dbpath + " --logpath " + logpath, { async: true });

// Start aquila-server
echo("Starting Aquila Server...");
exec("node aquila-server.js", function(code, output)
  {
    exec(killall + " mongod");
  });
