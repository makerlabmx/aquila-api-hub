(function () {

  var app = angular.module('interactionFactory', ['ngResource']);

  app.factory('Interaction', ['$resource', '$rootScope', function($resource, $rootScope){
      return $resource($rootScope.server + "api/interactions/:id", {id: "@id"}, {
          get: { method: 'GET', isArray: false},
          create: { method: 'POST', isArray:true},
          delete: { method: 'DELETE', isArray:true},
          all: {method:'GET', isArray:true}
      });
  }]);

})();
