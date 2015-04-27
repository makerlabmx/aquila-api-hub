(function(){

  var app = angular.module('interactionController',[]);

  app.controller('InteractionController', [ '$scope', 'socketAquila','Device','Interaction', function($scope,socketAquila,Device,Interaction){
    $scope.interactions = [];
    $scope.interaction = {};
    $scope.devices = [];
    $scope.devices_all = [];
    $scope.edit_element = false;
    $scope.save_element = false;

    this.init = function (){
      loadInter();

      var devs = $scope.devices_all = Device.all(function(){
          $scope.devices=[];
          for(var i = 0; i < devs.length; i++){
            if(devs[i].active)  {
              $scope.devices.push(devs[i]);
            }
          }
      });

      var deviceHandler = function(){
        loadInter();
      };

      socketAquila.on('deviceAdded', deviceHandler);
      socketAquila.on('deviceRemoved', deviceHandler);

      $scope.$on('$destroy', function()
      {
        socketAquila.removeListener('deviceAdded', deviceHandler);
        socketAquila.removeListener('deviceRemoved', deviceHandler);
      });
    };

    $scope.newInteraction = function (){
      $scope.title = "New Interaction";
      $scope.interaction = {};
      saveTrue();
      $('#modal-interaccion').modal('show');
    };

    $scope.editInteraction = function (interaction){
      $scope.title = "Edit Interaction";
      $scope.interaction = {};
      editTrue();

      console.log(interaction);
      console.log();
      $scope.interaction.event = interaction.event_device;
      $scope.interaction.action = interaction.action_device;

      //$scope.interaction.event_cuando ="asd";
      //$scope.interaction.action_hacer = interaction.action;


      $('#modal-interaccion').modal('show');
    };

    $scope.deleteInteraction = function (interaction){
      var result = Interaction.delete({id:interaction._id}, null, function(){
        $scope.interactions=[];
        prepareInteraction(result);
      },function(data){
        $scope.error="Error: " + data.data;
      });
    };

    $scope.saveInteraction = function (){
      //console.log($scope.interaction);
      try {
        var data = {
          "event_address": $scope.interaction.event.address,
          "event": $scope.interaction.event_cuando.n,
          "action_address": $scope.interaction.action.address,
          "action": $scope.interaction.action_hacer.n,
          "param": null
        };
      }
      catch(err) {
          $scope.error=err;
      }
      var result = Interaction.create({},data,function(){
        $scope.interactions=[];
        prepareInteraction(result);
        $('#modal-interaccion').modal('hide');
      },function(data){
        $scope.error="Error: " + data.data;
      });
    };

    $scope.updateInteraction = function (){
      var entry =  new Entry();
      entry.event = inter.interaccion.event_cuando.n ;
      entry.action = inter.interaccion.action_hacer.n ;
      entry.address = inter.interaccion.dev_cuando.address ;
      Aq(inter.interaccion.dev_hacer.address).editEntry(inter.interaccion.n,entry, function(){
        console.log("si se actualizo");
        $('#modal-interaccion').modal('hide');
      });
    };

    function loadInter(){
      $scope.interactions=[];
      var inters = Interaction.all(function(){
        prepareInteraction(inters);
      });
    }

    function prepareInteraction(devs){
      for(var i = 0; i < devs.length; i++){
            var dev = devs[i];
            if(dev.event_device.name == null){
              dev.event_device.name = dev.event_device.address;
            }else{
              for(var x = 0; x < dev.event_device.events.length; x++){
                if(dev.event === dev.event_device.events[x].n)
                {
                  dev.event = dev.event_device.events[x].name;
                  continue;
                }
              }
            }
            if(dev.action_device.name == null){
              dev.action_device.name = dev.action_device.address;
            }else{
              for(var x = 0; x < dev.action_device.actions.length; x++){
                if(dev.action === dev.action_device.actions[x].n)
                {
                  dev.action = dev.action_device.actions[x].name;
                  continue;
                }
              }
            }
            $scope.interactions.push(dev);
        }
    }

    function editTrue(){
      $scope.edit_element = true;
      $scope.save_element = false;
    }
    function saveTrue(){
      $scope.edit_element = false;
      $scope.save_element = true;
    }

  }]);
})();
