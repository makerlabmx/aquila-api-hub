"use strict";

// configManager.js
/*
  Checks whether configs files are correctly installed in ~/.aquila-server
  And copies them if not.
*/

require("shelljs/global");
var shellConfig = require("shelljs").config;
var path = require("path");
var fs = require("fs");
var crypto = require("crypto");

var ConfigManager = function()
{
  var self = this;
  self.home = process.env[(process.platform === 'win32') ? 'ALLUSERSPROFILE' : 'HOME'];
  self.bridgePath = path.join(self.home, ".aquila-server/bridge.js");
  self.deviceManagerPath = path.join(self.home, ".aquila-server/deviceManager.js");
  self.databasePath = path.join(self.home, ".aquila-server/database.js");
  self.serverPath = path.join(self.home, ".aquila-server/server.js");
  self.tokenPath = path.join(self.home, ".aquila-server/token.js");
  self.sslPath = path.join(self.home, ".aquila-server/ssl");
  self.csrPath = path.join(self.sslPath, "csr.pem");
  self.rsaKeyPath = path.join(self.sslPath, "rsaKey.pem");
  self.sslCertPath = path.join(self.sslPath, "sslCert.crt");
  self.logPath = path.join(self.home, ".aquila-server/logs");
};



ConfigManager.prototype.checkConfigFiles = function()
{
  var self = this;
  // cd to where this file lives
  cd(__dirname);

  console.log("Checking config files...");

  // Create aquila-server config dir if not exists
  mkdir("-p", path.join(self.home, ".aquila-server/ssl"));

  // create logs dir if not exists
  mkdir("-p", self.logPath);

  // Check bridge.js
  if( !test("-e", self.bridgePath) )
  {
    console.log(" Copying bridge.js...");
    cp("./config/bridge.js", self.bridgePath);
  }

  // Check deviceManager.js
  if( !test("-e", self.deviceManagerPath) )
  {
    console.log(" Copying deviceManager.js...");
    cp("./config/deviceManager.js", self.deviceManagerPath);
  }

  // Check database.js
  if( !test("-e", self.databasePath) )
  {
    console.log(" Copying database.js...");
    cp("./config/database.js", self.databasePath);
  }

  // Check server.js
  if( !test("-e", self.serverPath) )
  {
    console.log(" Copying server.js...");
    cp("./config/server.js", self.serverPath);
  }

  // Check token.js
  if( !test("-e", self.tokenPath) )
  {
    console.log(" Generating new token secret...");
    var secret = crypto.randomBytes(16).toString("hex");
    fs.writeFileSync(self.tokenPath, "module.exports = { 'secret' : '" + secret + "' };");
  }

  // Check ssl

  if( !test("-e", self.rsaKeyPath) || !test("-e", self.sslCertPath) )
  {
    console.log(" Generating SSL keys...");
    if( !which("openssl") )
    {
      console.log("   Couldn't generate SSL keys, your system doesn't have openssl installed, copying default keys.");
      console.log("   We strongly recommend generating your own keys for security in production servers.");
      console.log("   Keys go in ~/.aquila-server/ssl");
      console.log("   Copying SSL keys...");
      cp("-rf", "./config/ssl/", self.sslPath );
    }
    else
    {
      // Generating RSA key:
      exec("openssl genrsa -out " + self.rsaKeyPath + " 1024");

      // Generating SSL certificate:
      var openSslConf = path.join(__dirname, "config/ssl/openssl.cnf");
      // IMPORTANT: openSslConf is between "quotes" for avoiding error on path with spaces.
      var command = 'openssl req -config "' + openSslConf + '" -new -key ' + self.rsaKeyPath + ' -out ' + self.csrPath;
      exec(command);
      exec("openssl x509 -req -days 1024 -in " + self.csrPath + " -signkey " + self.rsaKeyPath + " -out " + self.sslCertPath);

    }
  }
};

module.exports = new ConfigManager();
