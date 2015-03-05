(function () {

  var app = angular.module('taskFactory', ['ngResource']);

  app.factory('Task', ['$resource', '$rootScope', function($resource, $rootScope){
      return $resource($rootScope.server + "api/tasks/:id", {id: "@id"}, {
          get: { method: 'GET', isArray: false},
          create: { method: 'POST', isArray:true},
          delete: { method: 'DELETE', isArray:true},
          update: { method: 'PUT', isArray: false },
          all: {method:'GET', isArray:true}
      });
  }]);

})();
