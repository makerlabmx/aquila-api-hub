(function(){

  var app = angular.module('deviceDetailsController',[]);

  app.controller('DeviceDetailsController', [ '$scope', '$routeParams','Device','Action', 'socketAquila', '$location', function($scope, $routeParams,Device,Action,socketAquila, $location)
    {

        $scope.showDetails = false;
        $scope.device = null;

        $scope.newName = "";
        $scope.newIcon = "fa-lightbulb-o";
        $scope.devConfigError = null;

        var picker = null;

        var initDetails = function()
        {
          var device = Device.get({ id: $routeParams.device_id }, function()
          {
            // only reload on start or if active changed.
            if($scope.device === null || ($scope.device.active !== device.active) )
            {
              $scope.device = device;
              $scope.newName = device.name;
              $scope.newIcon = device.icon;
              if(picker) picker.iconpicker('setIcon', device.icon);
              // Sort actions and events for consistency
              $scope.device.actions = $scope.device.actions.sort(function(a,b){ return a.n - b.n });
              $scope.device.events = $scope.device.events.sort(function(a,b){ return a.n - b.n });
              // Event emittion counter preparation:
              for(var i = 0; i < $scope.device.events.length; i++)
              {
                $scope.device.events[i].timesEmitted = 0;
              }
            }
          });
        };

    $scope.init = function()
    {
      picker = $('#iconpicker').iconpicker({
        icon: 'fa-lightbulb-o',
        iconset: 'fontawesome',
        unselectedClass: 'btn-lg btn-line-default',
        selectedClass: 'btn-lg btn-success',
        arrowClass: 'btn-line-primary',
        cols: 8,
        rows: 5,
        placement: 'right'
      });
      picker.on('change', function(e)
        {
          $scope.newIcon = e.icon;
        });
      initDetails();
    };

    // Event emittion counter:
    var eventHandler = function(emitter, eventN, param)
    {
      if($scope.device && emitter._id === $scope.device._id)
      {
        // We have to check for the correct event n
        for(var i = 0; i < $scope.device.events.length; i++)
        {
          if($scope.device.events[i].n === eventN)
          {
            $scope.device.events[i].timesEmitted++;
            return;
          }
        }
      }
    };


    var deviceHandler = function(){
      initDetails();
    };

    socketAquila.on('deviceAdded', deviceHandler);
    socketAquila.on('deviceRemoved', deviceHandler);
    socketAquila.on('event', eventHandler);

    $scope.$on("$destroy", function()
      {
        socketAquila.removeListener('deviceAdded', deviceHandler);
        socketAquila.removeListener('deviceRemoved', deviceHandler);
        socketAquila.removeListener('event', eventHandler);
      });

    $scope.toggleDetails = function()
    {
      $scope.showDetails = !$scope.showDetails;
    };

    $scope.doAction = function(device, action){
      Action.do({ id: device._id, action: action });
    };

    $scope.doSlider = function(device, action){
      Action.do({ id: device._id, action: action.n, param: action.range });
    };

    $scope.togglePrefs = function()
    {
      $('#modal-devconfig').modal('show');
    };

    $scope.updateDevice = function()
    {
      if($scope.newName === "") $scope.device.name = $scope.device._defaultName;
      else $scope.device.name = $scope.newName;

      $scope.device.icon = $scope.newIcon;

      Device.put({id: $scope.device._id}, $scope.device, function(device)
        {
          $scope.device = device;
          $('#modal-devconfig').modal('hide');
        },
        function(response)
        {
          $scope.devConfigError = response.data;
        });
    };

    $scope.forgetDevice = function()
    {
      Device.forget({id: $scope.device._id}, function()
        {
          $('#modal-devconfig').on('hidden.bs.modal', function()
            {
              $location.path('/devices');
              $scope.$apply();
            });
          $('#modal-devconfig').modal('hide');

        },
        function(response)
        {
          console.log(response.data);
          $scope.devConfigError = "Error forgetting device.";
        });
    };

  }]);

})();
