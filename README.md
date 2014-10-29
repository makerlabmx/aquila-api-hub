# Aquila API Hub Server

Aquila API and Web App for the Hub. Requires an Altair programmed as Bridge connected to the Hub.

API documentation: http://docs.aquila1.apiary.io/

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

1. build-essential: ``sudo apt-get install build-essential``
2. git: ``sudo apt-get install git``
3. Node.js v0.10.31 o superior:  http://nodejs.org/
4. MongoDB: ``sudo apt-get install mongodb``


## Installation

```
npm install aquila-server -g
```

## Use

- Start server:

```
aquila-server
```

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