(function(){

  var app = angular.module('consoleController',['btford.socket-io']);

  app.factory('socketWSerial',['socketFactory','$window', function(socketFactory,$window){
    var myIoSocket = io.connect('/wserial',{query: "token=" + $window.sessionStorage.token});
    socket = socketFactory({
      ioSocket: myIoSocket
    });
    return socket;
  }]);

  app.controller('ConsoleController', [ '$http' , '$scope', 'socketWSerial','socketAquila', 'Device', 'Config', function($http, $scope, socketWSerial, socketAquila, Device, Config){
    self = this;
    self.output = '';
    self.input = '';
    self.deviceAddr = 0xFFFF;
    self.lastSender = 0;
    self.filter = false;
    self.showDisconnected = true;

    self.devices = [];

    var fetchDevices = function()
    {
      var devs = Device.all(function(){
        self.devices=[];
        // add broadcast
        self.devices.push({
          name: "All [BROADCAST]",
          shortAddress: 0xFFFF
        });
        for(var i = 0; i < devs.length; i++){
            if(devs[i].active || self.showDisconnected)
            {
              var name = devs[i].name;
              if(!name) name = "";
              self.devices.push({
                name: name + " [" + devs[i].shortAddress + "]",
                shortAddress: devs[i].shortAddress
              });
            }
        }
      });
    };

    socketAquila.on('deviceAdded', fetchDevices);
    socketAquila.on('deviceRemoved', fetchDevices);

    $scope.$on("$destroy", function()
      {
        socketAquila.removeListener('deviceAdded', fetchDevices);
        socketAquila.removeListener('deviceRemoved', fetchDevices);
      });

    self.dataHandler = function(data)
    {
      // If filter address, discard any message not comming from selected device (exept when broadcast is selected)
      if(self.filter) if(self.deviceAddr !== 0xFFFF && data.srcAddr !== parseInt(self.deviceAddr)) return;

      if(data.srcAddr !== self.lastSender)
      {
        self.lastSender = data.srcAddr;
        var legend = "FROM " + self.lastSender + ":\n";
        self.append(legend);
      }

      self.append(data.data);
    };

    self.errorHandler = function(error)
    {
      console.log(error);
    };

    self.init = function()
    {
      // get config
      /*var config = Config.get({}, function()
        {
          self.showDisconnected = config.showDisconnected;
        });*/
      fetchDevices();

      socketWSerial.on("data", self.dataHandler);
      socketWSerial.on("err", self.errorHandler);

      $scope.$on('$destroy', function()
      {
        socketWSerial.removeListener("data", self.dataHandler);
        socketWSerial.removeListener("err", self.errorHandler);
      });

    };

    self.send = function()
    {
      var message = {
        dstAddr: parseInt(self.deviceAddr),
        data: self.input
      };
      socketWSerial.emit("data", message);
    };

    self.clear = function()
    {
      self.output = '';
    };

    self.append = function(text)
    {
      // fix CR in pre
      var text = text.replace("\r", "\n")
      self.output += text;
      // scroll to bottom
      var outputArea = document.getElementById('console_output');
      outputArea.scrollTop = outputArea.scrollHeight;
    };


  }]);
})();