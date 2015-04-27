# Aquila Server

Aquila API Server and Web App for the Hub. Requires an Altair programmed as Bridge connected to the Hub.

This is part of the Aquila Internet of Things Plataform, for more info, see: http://www.aquila.io/en

API documentation: http://docs.aquila2.apiary.io/

**Note:** This version is compatible only with version of May 2015 or newer of the Aquila firmware libraries. Please update your devices accordingly.

## Dependencies:

### Windows

>**Update:** Now, in Windows, you can use an installer that automatically install everything (except Visual Studio, you have to install it separately). Download it from here: [Installer](https://github.com/makerlabmx/aquila-tools-windows-installer).

1. Git and Git bash http://git-scm.com/download/win
2. Python 2.7 https://www.python.org/downloads/
3. Microsoft Visual Studio C++ Express 2010 (Includes compilers needed for some dependencies when developing Node.js applications) http://go.microsoft.com/?linkid=9709958
4. Node.js http://nodejs.org/
5. MongoDB http://www.mongodb.org/downloads

> **Note**: For any tutorial where we use the command line, we recommend using "Git Bash" instead of "cmd" from windows. "Git Bash" comes included with Git.

### Mac OSX

1. Git http://git-scm.com/download/mac
2. Node.js http://nodejs.org/
3. MongoDB http://www.mongodb.org/downloads

### Linux (Ubuntu / Debian)

1. build-essential and git: ``sudo apt-get install build-essential git``
2. Node.js v0.10.35 or newer (Not tested with versions v0.12.x):  http://nodejs.org/
3. MongoDB: ``sudo apt-get install mongodb``


## Installation

```
npm install aquila-server -g
```

## Use

- Connect the Hub via USB
- Start server:

  ```
  aquila-server
  ```

  Or, with ssl (https):

  ```
  aquila-server --ssl
  ```

  **Note:** If you want to be really serious about security, you should first generate your own security keys, you can do this with the genSSLCert.sh script included in this repository. Also, you should change your token secret, found in config/token.js.



- Access the web App from any browser:

  From local machine:
  ```
  http://localhost:8080
  ```
  From other machine on the network:
  ```
  http://<your hub ip>:8080
  ```

- Access the Admin interface (add users):

  ```
  http://<your hub ip>:8080/admin
  ```

  > Default User: ``Admin``, Password: ``Admin``
