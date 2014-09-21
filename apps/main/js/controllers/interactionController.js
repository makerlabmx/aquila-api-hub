(function(){

  var app = angular.module('interactionController',['btford.socket-io']);

  app.factory('socket', function(socketFactory)
    {
      return socketFactory();
    });

  app.controller('InteractionController', [ '$http' , '$scope', 'socket', function($http, $scope, socket){    
    inter = this;        
    inter.devices = [];
    inter.interaccion = [];
    inter.interactions = [];    
    inter.edit_element = false;
    inter.save_element = false;

    function editTrue(){
      inter.edit_element = true;
      inter.save_element = false;
    }
    function saveTrue(){
      inter.edit_element = false;
      inter.save_element = true;
    }

    inter.init = function (){        
      loadInter();      
    }
    inter.new = function (){
      inter.title = "Nueva Interaccion"
      inter.interaccion = {};
      saveTrue();
      $('#modal-interaccion').modal('show');
    }

    inter.edit = function (entry){
      inter.title = "Editar Interaccion"
      inter.interaccion = {};          
      var dev_cuando = Aq(entry.event_address)[0];
      var dev_hacer = Aq(entry.action_address)[0];      
      inter.interaccion.dev_cuando = dev_cuando;
      inter.interaccion.dev_hacer = dev_hacer;
      inter.interaccion.event_cuando = getEvent(dev_cuando.address, entry.event);
      inter.interaccion.action_hacer = getAction(dev_hacer.address, entry.action);
      inter.interaccion.n = entry._n;      
      editTrue();
      $('#modal-interaccion').modal('show');
    }

    inter.save = function (){      
      var entry =  new Entry();
      entry.event = inter.interaccion.event_cuando.n;
      entry.action = inter.interaccion.action_hacer.n;
      entry.event_address = inter.interaccion.dev_cuando.address;
      entry.action_address = inter.interaction.dev_hacer.address;      
      Aq(inter.interaccion.dev_hacer.address).addEntry(entry, function(){
        console.log("si se guardo")
        $('#modal-interaccion').modal('hide');
      });
    }

    inter.update = function (){      
      var entry =  new Entry();
      entry.event = inter.interaccion.event_cuando.n ;
      entry.action = inter.interaccion.action_hacer.n ;
      entry.address = inter.interaccion.dev_cuando.address ;      
      Aq(inter.interaccion.dev_hacer.address).editEntry(inter.interaccion.n,entry, function(){
        console.log("si se actualizo")
        $('#modal-interaccion').modal('hide');
      });
    }    

    inter.delete = function (entry){
      Aq(entry.device).removeEntry(entry._n,function(){
        console.log("todo ok");
      });
    }

    socket.on('deviceAdded', function(){
      loadInter();  
    });

    function loadInter(){
      inter.devices=[];
      inter.interactions=[];
      var devs = Aq("*");      
      //console.log(devs);
      for(var i = 0; i < devs.length; i++)
      {                           
        if(devs[i].active){           
          inter.devices.push(devs[i]);                    
          for(var x = 0; x < devs[i].interactions.length; x++){                        
            devs[i].interactions[x].device = devs[i].address;
            devs[i].interactions[x].cuando_name = getDevice(devs[i].interactions[x].address);            
            devs[i].interactions[x].event_name = getEvent(devs[i].interactions[x].address,devs[i].interactions[x].event).name;
            devs[i].interactions[x].hacer_name = devs[i].name;            
            devs[i].interactions[x].action_name = getAction(devs[i].address,devs[i].interactions[x].action).name;
            inter.interactions.push(devs[i].interactions[x]);
          }          
        }        
      } 
    }

    function getDevice(address){
      var devices = Aq(address);
      if(devices.length > 0){
        return devices[0].name;
      }      
      return address;
    }

    function getAction(address,idAction){      
      var devices = Aq(address);
      if(devices.length > 0){
        device = devices[0];   
        for (i = 0; i < device.actions.length; i++) { 
          if(device.actions[i].n == idAction){            
            return device.actions[i];
          }                        
        }             
      }      
      return "no found";
    }
    function getEvent(address,idEvent){
      var devices = Aq(address);
      if(devices.length > 0){
        device = devices[0];           
        for (i = 0; i < device.events.length; i++) {                     
          if(device.events[i].n == idEvent){                   
            return device.events[i];
          }                        
        }             
      }      
      return "no found";
    }
    
  }]);
})();