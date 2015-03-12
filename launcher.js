#!/usr/bin/env node

// aquila-server launcher
require("shelljs/global");
var config = require("shelljs").config;
var path = require("path");

// get args for passing to aquila-server
var args = process.argv.slice(2).join(" ");

var home = process.env[(process.platform === 'win32') ? 'USERPROFILE' : 'HOME'];
var killall_mongod = (process.platform === 'win32') ? 'taskkill /F /IM mongod.exe' : 'killall mongod';

echo("Aquila Server\n");
echo("IMPORTANT: Make sure that the bridge is connected.\n");

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
var dbpath = '"' + path.join(home, ".aquila-server/data/db") + '"';
var logpath = '"' + path.join(home, ".aquila-server/data/mongodb.log") + '"';
echo("Starting Database...");
exec("mongod --journal --dbpath " + dbpath + " --logpath " + logpath, { async: true });

// Check for mongo's health
var mongoose = require("mongoose"),
    configManager = require("./configManager");

// Initializa config files:
configManager.checkConfigFiles();

var configDB = require(configManager.databasePath);

var intervalID;

var startAquila = function()
  {
    // Start aquila-server
    echo("Starting Aquila Server...");
    exec("node aquila-server.js " + args, function(code, output)
      {
        exec(killall_mongod);
      });
  };

var checkConnectionWithDB = function(callback)
  {
    var pingCode = exec("nc -z localhost 27017").code; //Checks if mongodb is accepting connections
    if (pingCode == 0)
    {
      clearInterval(intervalID);
      callback();
    }
  };

var restoreDatabase = function()
  {
    console.log("Restoring database");
    exec("mongorestore --drop " + path.join(home, ".aquila-server/backup/aquila-server"));
    console.log("Database restored");
    startAquila();
  };

var connectMongoose = function()
{
  mongoose.connect(configDB.url, function(err, res)
  {
    if(err)
    {
      console.log("ERROR connecting to database, will try to restore database.");
      exec("rm -rf " + path.join(home, ".aquila-server/data/*"), function()
        {
          // Create aquila-server config dir if not exists
          mkdir("-p", path.join(home, ".aquila-server/data/db"));
          console.log("Created new database folder");
          exec("mongod --journal --dbpath " + dbpath + " --logpath " + logpath, { async: true });
          intervalID = setInterval(checkConnectionWithDB, 500, restoreDatabase);
        });
    } else 
    {
      startAquila();
    }

  });
};

connectMongoose();

