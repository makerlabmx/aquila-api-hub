(function(){

  // Set your API server's url
  // use null for automatically setting same origin
  var server = null;

  var app = angular.module('aquila',
    [
      'sessionController','mainController', 'dashboardController', 'deviceController', 'deviceDetailsController', 'configuracionController','interactionController', 'taskController', 'consoleController',
      'deviceFactory','tokenFactory','interactionFactory', 'taskFactory', 'configFactory','socketWSerialFactory','socketAquilaFactory',
      'ngRoute','btford.socket-io', 'ui.bootstrap.datetimepicker', 'appsController'
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
          redirectTo: '/devices'
        }).
        when('/dashboard', {
          templateUrl: 'main/views/dashboard/dashboard.html',
          controller: 'DashboardController'
        }).
        when('/devices', {
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
        when('/tasks', {
          templateUrl: 'main/views/tasks/tasks.html',
          controller: 'TaskController'
        }).
        when('/configuration', {
          templateUrl: 'main/views/configuracion/configuracion.html',
          controller: 'ConfiguracionController'
        }).
        when('/console', {
          templateUrl: 'main/views/console/console.html',
          controller:'ConsoleController'
        }).
        when('/apps', {
          templateUrl: 'main/views/apps/apps.html',
          controller: 'AppsController'
        }).
        otherwise({
          redirectTo: '/404error'
        });

    }
  ]);

  app.factory('authInterceptor', function ($rootScope, $q, $window, $location) {
    return {
      request: function (config) {
        config.headers = config.headers || {};
        if ($window.localStorage.token) {
          config.headers.Authorization = 'Bearer ' + $window.localStorage.token;
        }
        return config;
      },
      responseError: function (rejection) {
        if (rejection.status === 401) {
          // handle the case where the user is not authenticated
          delete $window.localStorage.token;
          $location.path('/login');
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
      if($window.localStorage.token === undefined){
        $location.path('/login');
        $rootScope.userLogin = false;
      }else{
        $rootScope.userLogin = true;
        $rootScope.user = $window.localStorage.user;
        $rootScope.user = $rootScope.user.charAt(0).toUpperCase() + $rootScope.user.slice(1);
      }
    });
  });




})();
