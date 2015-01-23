(function () {

  var app = angular.module('configFactory', ['ngResource']);

  app.factory('Config', ['$resource', '$rootScope', '$http', function($resource, $rootScope, $http){
      var configFactory = {};

      configFactory.all = $resource($rootScope.server + "api/config", {}, {
          get: { method: 'GET' , isArray: false },
          post: { method: 'POST', isArray: false }
      });

      configFactory.pan = $resource($rootScope.server + "api/pan", {}, {
          get: { method: 'GET', isArray: false },
          post: { method: 'POST', isArray: false }
      });

      configFactory.security = $resource($rootScope.server + "api/security", {}, {
        get: { method: 'GET', isArray: false },
        post: { method: 'POST', isArray: false }
      });

      configFactory.ip = $resource($rootScope.server + "api/ip", {}, {
        get: { method: 'GET', isArray: false }
      });

      configFactory.version = $resource($rootScope.server + "api/version", {}, {
        get: { method: 'GET', isArray: false }
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
