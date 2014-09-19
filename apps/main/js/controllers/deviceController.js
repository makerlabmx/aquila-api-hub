(function(){

  var app = angular.module('deviceController',[]);

  app.controller('DeviceController', [ '$http' , '$scope', function($http, $scope){    
      aquila = this;        
      aquila.devices=[];
      aquila.active;
      aquila.device;    

      /*Main */

      aquila.classes = {};
      aquila.sizeClases = 0;

      aquila.images=['icon-075','icon-013','icon-023'];

      aquila.initMain = function (){        
        loadMain();
      }

      aquila.seeOptions = function(device){                  
        //device = Aq(device.address)[0];
        device.show_options = true;
      };

      aquila.hideOptions = function(device){                        
        device.show_options = false;
      };

      aquila.seeAllDevices = function(){            
        aquila.active = false;      
      };

      aquila.doAction = function(device, action){
        $http.get('/api/devices/' + device._id + '/action/' + String(action));
      };

      aquila.doSlider = function(device, action){
        $http.get('/api/devices/' + device._id + '/action/' + String(action.n) + '/' + String(action.range));
      };

      aquila.load = function (clase){        
        aquila.devices=[];
        var devs = [];
        $http.get('/api/devices').success(function(data, status, headers, config)
          {
            devs = data;
            for(var i = 0; i < devs.length; i++)
            {                      
              if(devs[i].active)  { 
                devs[i].img= aquila.classes[devs[i].class].image; 
                devs[i].color = "color"+((i+1)%5);
                aquila.devices.push(devs[i]);                  
              }        
            } 
          });
      }    

      $scope.$on('socket:deviceAdded', function(){
        loadMain();
      });

      $scope.$on('socket:deviceRemoved', function(){      
        loadMain();
      });

      function loadMain(){
        if(!aquila.classes) return;
        aquila.devices=[];
        var devs = [];
        $http.get('/api/devices').success(function(data, status, headers, config)
          {
            devs = data;
            for(var i = 0; i < devs.length; i++)
            {                      
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
                aquila.devices.push(devs[i]);          
                
                
              }        
            } 
          });
        
      }    
      
    }]);
})();