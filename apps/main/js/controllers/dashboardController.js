(function()
{

  var app = angular.module('dashboardController',[]);

  app.controller('DashboardController', [ '$scope', 'socketAquila','Device', 'Config', 'Action', 'Service', '$q', function($scope, socketAquila, Device, Config, Action, Service, $q)
	{
		$scope.devices = [];
		$scope.state = true;
		$scope.error = null;

    var stateUpdateInterval = null;

		var retryAction = function(action, numTimes)
		{
			return $q.when().then(action)
			.catch(function (error)
			{
				if (numTimes <= 0) {
					throw error;
				}
				return retryAction(action, numTimes - 1);
			});
		};

		$scope.toggle = function(device)
		{
			retryAction(function(){
			  return Service.put({id: device._id, service: "relay"}, {isOn: !device.state}, function(res)
			  {
				console.log(res);
				device.state = res.isOn;
        device.watts = Math.floor(res.watts);
        if(!res.isOn) device.watts = 0;
				$scope.error = null;

			  }, function(err)
			  {
				$scope.error = "Error en la comuniación con el dispositivo " + device.name + ": " + err.data;
			  }).$promise;
			}, 3);
		};

		$scope.updateState = function(device, devices)
		{
		  retryAction(function(){
        console.log("fetching");

			  return Service.get({id: device._id, service: "relay"}, function(res)
			  {
				console.log(res);
				device.state = res.isOn;
        device.watts = Math.floor(res.watts);
        if(!res.isOn) device.watts = 0;
				$scope.error = null;
        if(devices && devices.length)
        {
          device = devices.pop();
          $scope.updateState(device, devices);
        }

			  }, function(err)
			  {
				      //$scope.error = "Error en la comuniación con el dispositivo " + device.name + ": " + err.data;
			  }).$promise;
			}, 3);
		};

		$scope.updateStates = function()
		{
      var devices = $scope.devices.slice();
      var device = devices.pop();
      $scope.updateState(device, devices);

		};

		var getDevices = function()
		{
		  Device.all({class: "mx.makerlab.domodule"}, function(devices)
		  {
			if(devices.length > 0) {
				for(var i = 0; i < devices.length; i++)
				{
					devices[i].state = false;
          devices[i].watts = 0;
				}
				$scope.devices = devices;
			}
			else return $scope.error = "No se encontró ningún apagador";

			$scope.updateStates();

		  });
		};

		$scope.init = function()
		{
		  getDevices();

		  // update state each n seconds:
		  stateUpdateInterval = setInterval(function(){ $scope.updateStates(); }, 5000);

		  socketAquila.on('deviceAdded', getDevices);
		  socketAquila.on('deviceRemoved', getDevices);
      socketAquila.on('event', $scope.updateStates);

		  $scope.$on("$destroy", function()
		  {
		  	socketAquila.removeListener('deviceAdded', getDevices);
		  	socketAquila.removeListener('deviceRemoved', getDevices);
        socketAquila.removeListener('event', $scope.updateStates);
        clearInterval(stateUpdateInterval);
		  });
		};

	}]);

})();
