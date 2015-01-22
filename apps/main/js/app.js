(function(){

  // Set your API server's url
  // use null for automatically setting same origin
  var server = null;

  var app = angular.module('aquila',
    [
      'sessionController','mainController','deviceController', 'deviceDetailsController', 'configuracionController','interactionController', 'consoleController',
      'deviceFactory','tokenFactory','interactionFactory','configFactory','socketWSerialFactory','socketAquilaFactory',
      'ngRoute','btford.socket-io'
    ]
  );

  app.config(['$routeProvider', '$httpProvider', '$sceDelegateProvider', function($routeProvider, $httpProvider, $sceDelegateProvider) {

      $sceDelegateProvider.resourceUrlWhitelist([
          // Allow same origin resource loads.
          'self',
          // Allow loading from our server.
          server + '**'
        ]);

      $httpProvider.defaults.headers.common['Content-Type'] = 'application/json; charset=utf-8';
      $httpProvider.defaults.headers.post['Content-Type'] = 'application/json; charset=utf-8';
      $httpProvider.interceptors.push('authInterceptor');

      $routeProvider.
        when('/', {
          templateUrl: 'main/views/dispositivos/dispositivos.html',
          controller: 'DeviceController'
        }).
        when('/device/:device_id', {
          templateUrl: 'main/views/dispositivos/device.html',
          controller: 'DeviceDetailsController'
        }).
        when('/login', {
          templateUrl: 'main/views/session/login.html',
          controller: 'SessionController'
        }).
        when('/interactions', {
          templateUrl: 'main/views/interacciones/interacciones.html',
          controller: 'InteractionController'
        }).
        when('/configuration', {
          templateUrl: 'main/views/configuracion/configuracion.html',
          controller: 'ConfiguracionController'
        }).
        when('/console', {
          templateUrl: 'main/views/console/console.html',
          controller:'ConsoleController'
        }).
        otherwise({
          redirectTo: '/404error'
        });

    }
  ]);

  app.factory('authInterceptor', function ($rootScope, $q, $window) {
    return {
      request: function (config) {
        config.headers = config.headers || {};
        if ($window.sessionStorage.token) {
          config.headers.Authorization = 'Bearer ' + $window.sessionStorage.token;
        }
        return config;
      },
      responseError: function (rejection) {
        if (rejection.status === 401) {
          // handle the case where the user is not authenticated
        }
        return $q.reject(rejection);
      }
    };
  });


  app.run( function($rootScope, $location, $window) {
    // Setting server URL global variable
    $rootScope.server = server ? server : $window.location.origin;
    if( $rootScope.server.substr($rootScope.server.length - 1) !== "/" ) $rootScope.server += "/";

    $rootScope.$on( "$routeChangeStart", function(event, next, current) {
      if($window.sessionStorage.token === undefined){
        $location.path('/login');
        $rootScope.userLogin = false;
      }else{
        $rootScope.userLogin = true;
        $rootScope.user = $window.sessionStorage.user;
        $rootScope.user = $rootScope.user.charAt(0).toUpperCase() + $rootScope.user.slice(1);
      }
    });
  });




})();
