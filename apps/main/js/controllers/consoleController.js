(function(){

  var app = angular.module('consoleController',['btford.socket-io']);

  app.factory('socketWSerial',['socketFactory','$window', function(socketFactory,$window){
    var myIoSocket = io.connect('/wserial',{query: "token=" + $window.sessionStorage.token});
    console.log("wserial socket started");
    socket = socketFactory({
      ioSocket: myIoSocket
    });
    return socket;
  }]);

  app.controller('ConsoleController', [ '$http' , '$scope', 'socketWSerial', function($http, $scope, socketWSerial){
    self = this;
    self.output = '';
    self.input = '';
    self.deviceAddr = 0xFFFF;
    self.lastSender = 0;
    self.filter = false;

    self.dataHandler = function(data)
    {
      console.log(data);
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
      console.log(message);
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
