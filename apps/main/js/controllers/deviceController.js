(function(){

  var app = angular.module('deviceController',['btford.socket-io']);

  app.controller('DeviceController', [ '$http' , '$scope', 'socketAquila','Device', 'Config', function($http, $scope, socketAquila,Device, Config){
      var aquila = this;
      $scope.devices=[];

      $scope.showDisconnected = true;

      aquila.init = function (){

        // get config
        var config = Config.get({}, function()
          {
            $scope.showDisconnected = config.showDisconnected;
          });

        loadMain();

        var deviceHandler = function(){
          loadMain();
        };

        socketAquila.on('deviceAdded', deviceHandler);
        socketAquila.on('deviceRemoved', deviceHandler);

        $scope.$on("$destroy", function()
        {
          socketAquila.removeListener('deviceAdded', deviceHandler);
          socketAquila.removeListener('deviceRemoved', deviceHandler);
        });
      };

      function loadMain(){
        var devs = [];
        var devs = Device.all(function(){
          $scope.devices=[];
          for(var i = 0; i < devs.length; i++)
          {
            if(devs[i].active || $scope.showDisconnected)
            {
              $scope.devices.push(devs[i]);
            }
          }
        });
      }

    }]);
})();
