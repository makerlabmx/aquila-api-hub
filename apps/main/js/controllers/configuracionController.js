(function(){

	var app = angular.module('configuracionController',[]);

	app.controller('ConfiguracionController', [ '$http' , '$scope', function($http, $scope)
	{
		config = this;
    config.panel = 1;
    config.pan = 0xCA5A;
		config.panString = "CA5A";
		config.secEnabled = false;
		config.secKey = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];

		config.selectTab = function(index)
		{
			config.panel = index;
		};

		config.isSelected = function(index)
		{
    		return config.panel == index;
  	};

  	$('#PANADDRESS').keyup(function()
		{
  	    var $th = $(this);
  	    $th.val( $th.val().replace(/[^a-zA-Z0-9]/g, function(str) { alert('You typed " ' + str + ' ".\n\nPlease use only letters and numbers.'); return ''; } ) );
  	});

		config.init = function()
		{
			config.getPAN();
			config.getSec();
		};

  	config.getPAN = function()
		{
  		$http.get('/api/pan').success(function(data, status, headers, config){
			  config.pan = data.pan;
			  config.panString = data.pan.toString(16);
	    });
  	};

  	config.setPAN = function()
		{
      var data = {
        pan: parseInt(config.panString, 16)
      };
      $http.post('/api/pan', data).success(function(data, status, headers, config){
        config.pan = data.pan;
				config.panString = data.pan.toString(16);
      });
  	};

		config.getSec = function()
		{
			$http.get('/api/security').success(function(data, status, headers, config)
				{
					config.secEnabled = data.secEnabled;
					config.secKey = data.secKey;
				});
		};

		config.setSec = function()
		{
			var data = {
				secEnabled: config.secEnabled,
				secKey: config.secKey
			};
			$http.post('/api/security', data).success(function(data, status, headers, config)
				{
					config.secEnabled = data.secEnabled;
					config.secKey = data.secKey;
				});
		}


  }]);
})();
