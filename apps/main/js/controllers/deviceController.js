(function(){

  var app = angular.module('deviceController',['btford.socket-io']);


  app.controller('DeviceDetailsController', [ '$http' , '$scope', '$routeParams','Device','Action', function($http, $scope, $routeParams,Device,Action){

      $scope.device = Device.get({ id: $routeParams.device_id });

      $scope.doAction = function(device, action){
        Action.doit({ id: device._id, action: action });
        //$http.get('/api/devices/' + $routeParams.device_id + '/action/' + String(action));
      };

      $scope.doSlider = function(device, action){
        Action.range({ id: device._id, action: action.n, range: action.range });
        //$http.get('/api/devices/' + device._id + '/action/' + String(action.n) + '/' + String(action.range));
      };


    }]);

  app.controller('DeviceController', [ '$http' , '$scope', 'socketAquila','Device', function($http, $scope, socketAquila,Device){
      var aquila = this;
      $scope.devices=[];


      aquila.classes = {};
      aquila.sizeClases = 0;

      //aquila.images=['fa-lightbulb-o','fa-plug','fa-bell'];
      aquila.images=['fa-lightbulb-o','fa-lightbulb-o','fa-lightbulb-o','fa-lightbulb-o','fa-lightbulb-o','fa-lightbulb-o'];

      aquila.init = function (){
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
        /*
        $http.get('/api/reload').success(function(data){
          console.log(data);
        });
        $http.get('/api/pan').success(function(data){
          console.log(data);
        });
        $http.post('/api/pan',{"pan": 0xCA5A}).success(function(data){
          console.log(data);
        });
        */
        if(!aquila.classes) return;
        var devs = [];
        var devs = Device.all(function(){
          $scope.devices=[];
          for(var i = 0; i < devs.length; i++){
            if(devs[i].active)  {
              if(!(devs[i].class in aquila.classes)){
                var clase = {
                  name: devs[i].class,
                  image: aquila.images[aquila.sizeClases]
                };
                aquila.classes[clase.name] = clase;
                aquila.sizeClases++;
              }
              devs[i].img= aquila.classes[devs[i].class].image;
              devs[i].color = "color"+((i+1)%5);
              $scope.devices.push(devs[i]);
            }
          }
        });
      }

    }]);
})();
