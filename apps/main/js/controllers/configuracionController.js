(function(){

	var app = angular.module('configuracionController',[]);

	app.controller('ConfiguracionController', [ '$http' , '$scope', function($http, $scope)
	{
		config = this;
    config.pan = 0xCA5A;
		config.panString = "CA5A";
		config.secEnabled = false;
		config.secKey = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];
		config.showDisconnected = true;
		config.errorMsg = "";
		config.showError = false;
		config.localIp = "";
		config.extIp = "";

  	/*$('#PANADDRESS').keyup(function()
		{
  	    var $th = $(this);
  	    $th.val( $th.val().replace(/[^a-zA-Z0-9]/g, function(str) { alert('You typed " ' + str + ' ".\n\nPlease use only letters and numbers.'); return ''; } ) );
  	});*/

		config.init = function()
		{
			config.getPAN();
			config.getSec();
			config.getShowDisconnected();
			config.getIps();
		};

		config.displayError = function(show, msg)
		{
			config.showError = show;
			if(msg) config.errorMsg = msg;
		};

  	config.getPAN = function()
		{
  		$http.get('/api/pan').success(function(data, status, headers){
			  config.pan = data.pan;
			  config.panString = data.pan.toString(16).toUpperCase();;
	    });
  	};

  	config.setPAN = function()
		{
			config.displayError(false);
      var data = {
        pan: parseInt(config.panString, 16)
      };
      $http.post('/api/pan', data).success(function(data, status, headers){
        config.pan = data.pan;
				config.panString = data.pan.toString(16).toUpperCase();
      }).error(function(data, status, headers)
			{
				config.displayError(true, data);
			});
  	};

		config.getSec = function()
		{
			$http.get('/api/security').success(function(data, status, headers)
				{
					config.secEnabled = data.secEnabled;
					config.secKey = data.secKey;
				});
		};

		config.setSec = function()
		{
			config.displayError(false);
			var data = {
				secEnabled: config.secEnabled,
				secKey: config.secKey
			};
			$http.post('/api/security', data).success(function(data, status, headers)
				{
					config.secEnabled = data.secEnabled;
					config.secKey = data.secKey;
				}).error(function(data, status, headers)
				{
					config.displayError(true, data);
				});
		}

		config.getShowDisconnected = function()
		{
			$http.get('/api/config').success(function(data, status, headers)
				{
					config.showDisconnected = data.showDisconnected;
				});
		};

		config.setShowDisconnected = function()
		{
			config.displayError(false);
			var data = {
				showDisconnected: config.showDisconnected
			};
			$http.post('/api/config', data).success(function(data, status, headers)
				{
					config.showDisconnected = data.showDisconnected;
				}).error(function(data, status, headers)
				{
					config.displayError(true, data);
				});
		};

		config.getIps = function()
		{
			$http.get('/api/ip').success(function(data, status, headers)
				{
					config.localIp = data.localIp;
					config.extIp = data.extIp;
				}).error(function(data, status){console.log(data, status)});
		};


  }]);
})();
