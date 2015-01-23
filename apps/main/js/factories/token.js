(function () {

  var app = angular.module('tokenFactory', ['ngResource']);

  app.factory('Token', ['$resource', '$rootScope', function($resource, $rootScope){
      return $resource($rootScope.server + "api/token", {}, {
          post: { method:'POST' , isArray: false }
      });
  }]);

})();
