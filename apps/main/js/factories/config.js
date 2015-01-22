(function () {

  var app = angular.module('configFactory', ['ngResource']);

  app.factory('Config', ['$resource', '$rootScope', '$http', function($resource, $rootScope, $http){
      var configFactory = {};

      configFactory.all = $resource($rootScope.server + "api/config", {}, {
          get: { method: 'GET' },
          post: { method: 'POST' }
      });

      configFactory.pan = $resource($rootScope.server + "api/pan", {}, {
          get: { method: 'GET' },
          post: { method: 'POST' }
      });

      configFactory.security = $resource($rootScope.server + "api/security", {}, {
        get: { method: 'GET' },
        post: { method: 'POST' }
      });

      configFactory.ip = $resource($rootScope.server + "api/ip", {}, {
        get: { method: 'GET' }
      });

      configFactory.version = $resource($rootScope.server + "api/version", {}, {
        get: { method: 'GET' }
      });

      configFactory.reload = function()
      {
        $http.get($rootScope.server + 'api/reload');
      };

      configFactory.discover = function()
      {
        $http.get($rootScope.server + 'api/discover');
      };

      return configFactory;
  }]);

})();
