(function () {

  var app = angular.module('deviceFactory', ['ngResource']);

  app.factory('Device', ['$resource', '$rootScope', function($resource, $rootScope){
      return $resource($rootScope.server + "api/devices/:id", {id: "@id"}, {
          get: { method: 'GET'},
          all: { method:'GET', isArray:true },
          put: { method: 'PUT' },
          forget: { method: 'DELETE' }
      });
  }]);

  app.factory('Action', ['$resource', '$rootScope', function($resource, $rootScope){
      return $resource($rootScope.server + "api/devices/:id/action/:action/:param", {id: "@id", action: "@action", param: "@param"}, {
          do: { method: 'GET'}
      });
  }]);

  app.factory('Service', ['$resource', '$rootScope', function($resource, $rootScope){
    return $resource($rootScope.server + "api/devices/:id/service/:service", { id: "@id", service: "@service" }, {
      get: { method: 'GET'},
      post: { method:'POST' },
      put: { method: 'PUT' },
      delete: { method:'DELETE' }
    });
  }]);

})();
