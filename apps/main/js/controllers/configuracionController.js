(function(){

	var app = angular.module('configuracionController',[]);

	app.controller('ConfiguracionController', [ '$http' , '$scope', function($http, $scope){    
		config = this;
    config.panel = 1;
    config.pan = 12;

		config.selectTab = function(index){
			config.panel = index;
		};

		config.isSelected = function(index){
      		return config.panel == index;
    	};

    	$('#PANADDRESS').keyup(function() {    		
    	    var $th = $(this);
    	    $th.val( $th.val().replace(/[^a-zA-Z0-9]/g, function(str) { alert('You typed " ' + str + ' ".\n\nPlease use only letters and numbers.'); return ''; } ) );
    	});
    	
    	config.getPAN = function(){
    		$http.get('/api/pan').success(function(data, status, headers, config){				
				  config.pan = data.pan;				
				  hexString = data.pan.toString(16);				
				  $("#PANADDRESS").val(hexString);
		    }); 			
    	};

    	config.setPAN = function(pan){
        var data = {
          pan: parseInt(pan, 16)
        };
        $http.post('/api/pan', data).success(function(data, status, headers, config){
          config.pan = data.pan;        
          hexString = data.pan.toString(16);        
          $("#PANADDRESS").val(hexString);
        });		
    	};    	
       
      
  	}]);
})();