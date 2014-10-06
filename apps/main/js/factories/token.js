(function () {

    var app = angular.module('tokenFactory', ['ngResource']);

    app.factory('Token', ['$resource',function($resource){        
        return $resource("/api/token", {}, {            
            post: {method:'POST'}
        });
    }]);    

})();
  