(function(){

  var app = angular.module('deviceController',['btford.socket-io']);


  app.factory('socket', function(socketFactory)
    {
      return socketFactory();
    });

  app.controller('DeviceController', [ '$http' , '$scope', 'socket', function($http, $scope, socket){    
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

      socket.on('deviceAdded', function(){
        console.log("device Added");
        loadMain();
      });

      socket.on('deviceRemoved', function(){   
        console.log("device Removed");   
        loadMain();
      });

      function loadMain(){
        if(!aquila.classes) return;
        
        var devs = [];
        $http.get('/api/devices').success(function(data, status, headers, config)
          {
            aquila.devices=[];
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