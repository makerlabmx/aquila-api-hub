(function(){

	var app = angular.module('configuracionController',[]);

	app.controller('ConfiguracionController', [ 'Config' , '$scope', function(Config, $scope)
	{
		var config = this;
    	config.pan = 0xCA5A;
		config.panString = "CA5A";
		config.channel = 26;
		config.channels = range(11, 26, 1);
		config.secEnabled = false;
		config.secKey = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];
		config.showDisconnected = true;
		config.errorMsg = "";
		config.showError = false;
		config.localIp = "";
		config.extIp = "";
		config.version = "";

  	/*$('#PANADDRESS').keyup(function()
		{
  	    var $th = $(this);
  	    $th.val( $th.val().replace(/[^a-zA-Z0-9]/g, function(str) { alert('You typed " ' + str + ' ".\n\nPlease use only letters and numbers.'); return ''; } ) );
  	});*/

		function range(start, stop, step){
			var a=[start], b=start;
			while(b<stop){b+=step;a.push(b)}
				return a;
			};

		config.init = function()
		{
			config.getPAN();
			config.getSec();
			config.getShowDisconnectedAndChan();
			config.getIps();
			config.getVersion();
		};

		config.displayError = function(show, msg)
		{
			config.showError = show;
			if(msg) config.errorMsg = msg;
		};

  	config.getPAN = function()
		{
			Config.pan.get({}, function(data, status, headers)
			{
				config.pan = data.pan;
				config.panString = data.pan.toString(16).toUpperCase();
			});
  	};

  	config.setPAN = function()
		{
			config.displayError(false);
      var data = {
        pan: parseInt(config.panString, 16)
      };

			Config.pan.post({}, data, function(data, status, headers)
			{
				config.pan = data.pan;
				config.panString = data.pan.toString(16).toUpperCase();
			}, function(data, status, headers)
			{
				config.displayError(true, data);
			});
  	};


		config.getSec = function()
		{
			Config.security.get({}, function(data, status, headers)
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

			Config.security.post({}, data, function(data, status, headers)
			{
				config.secEnabled = data.secEnabled;
				config.secKey = data.secKey;
			}, function(data, status, headers)
			{
				config.displayError(true, data);
			});
		};

		config.getShowDisconnectedAndChan = function()
		{
			Config.all.get({}, function(data, status, headers)
			{
				config.showDisconnected = data.showDisconnected;
				config.channel = data.channel;
			});
		};

		config.setShowDisconnectedAndChan = function()
		{
			config.displayError(false);
			var data = {
				showDisconnected: config.showDisconnected,
				channel: parseInt(config.channel)
			};

			Config.all.post({}, data, function(data, status, headers)
			{
				config.showDisconnected = data.showDisconnected;
				config.channel = data.channel;
			}, function(data, status, headers)
			{
				config.displayError(true, data);
			});
		};

		config.getIps = function()
		{
			Config.ip.get({}, function(data, status, headers)
			{
				config.localIp = data.localIp;
				config.extIp = data.extIp;
				config.sysTime = moment(data.sysTime).format("MMMM Do YYYY, h:mm a");
			}, function(data, status){console.log(data, status);});
		};

		config.getVersion = function()
		{
			Config.version.get({}, function(data, status, headers)
			{
				config.version = data.version;
			}, function(data, status){console.log(data, status);});
		};

  }]);
})();
