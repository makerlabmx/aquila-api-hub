(function(){
  
  var app = angular.module('aquila',
    [
      'mainController',
      'deviceController',
      //'interactionController',
      'configuracionController',
      'ngRoute'    
    ]
  );
  
  app.config(['$routeProvider',
  function($routeProvider) {
    $routeProvider.
      when('/', {
        templateUrl: 'main/views/dispositivos/dispositivos.html',
        controller: 'DeviceController'
      }).
      /*when('/interacciones', {
        templateUrl: 'main/views/interacciones/interacciones.html',
        controller: 'InteractionController'
      }).*/
      when('/configuraciones', {
        templateUrl: 'main/views/configuracion/configuracion.html',
        controller: 'ConfiguracionController'
      }).
      otherwise({
        redirectTo: '/404error'
      });
  }]);

  


})();