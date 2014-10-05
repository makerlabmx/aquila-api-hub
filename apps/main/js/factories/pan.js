(function () {

    var app = angular.module('personsFactory', ['ngResource']);

    app.factory('Persons', ['$resource',function($resource){        
        return $resource("/api/pan", {}, {
            get: { method: 'GET' },
            post: {}
        });
    }]);    

})();
  