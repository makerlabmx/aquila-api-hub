"use strict";

(function(){

  var app = angular.module('servicesController',[]);

  app.controller('ServicesController', [ '$scope', 'Service', 'socketAquila', 'Device', 'Config', function($scope, Service, socketAquila, Device, Config){
    var self = this;

    self.serviceName = '';
    self.body = '';
    self.response = '';
    self.method = 'GET';

    self.methods = ['GET', 'POST', 'PUT', 'DELETE'];

    self.deviceAddr = '';
    self.showDisconnected = true;

    self.devices = [];

    self.loading = false;

    var fetchDevices = function()
    {
      var devs = Device.all(function(){
        self.devices=[];
        for(var i = 0; i < devs.length; i++){
            if(devs[i].active || self.showDisconnected)
            {
              var name = devs[i].name;
              if(!name) name = "";
              self.devices.push({
                name: name + " [" + devs[i].shortAddress.toString(16).toUpperCase() + "]",
                shortAddress: devs[i].shortAddress,
                id: devs[i]._id
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

    self.init = function()
    {
      fetchDevices();
    };

    self.send = function()
    {
      var methodFcn = Service.get;
      switch(self.method)
      {
        case 'GET':
          methodFcn = Service.get;
        break;
        case 'POST':
          methodFcn = Service.post;
        break;
        case 'PUT':
          methodFcn = Service.put;
        break;
        case 'DELETE':
          methodFcn = Service.delete;
        break;
      }

      self.loading = true;
      methodFcn({ id: self.deviceAddr, service: self.serviceName}, self.body, function(result)
      {
        self.response = JSON.stringify(result);
        self.loading = false;

      }, function(err)
      {
        self.loading = false;
        self.response = err.data;
      });
    };

    self.clear = function()
    {
      self.response = '';
    };

  }]);
})();
