(function(){
  
  var app = angular.module('aquila',
    [
      'mainController',
      'deviceController',
      //'interactionController',
      'configuracionController',
      'ngRoute',
      'btford.socket-io'
    ]
  );

  app.factory('notifications', function (socketFactory) 
  {
    var notifications = socketFactory();
    notifications.forward('deviceDiscovered');
    notifications.forward('deviceAdded');
    notifications.forward('deviceRemoved');
    notifications.forward('event');
    return notifications;
  });
  

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