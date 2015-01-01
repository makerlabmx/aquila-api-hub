(function () {

    var app = angular.module('configFactory', ['ngResource']);

    app.factory('Config', ['$resource',function($resource){
        return $resource("/api/config", {}, {
            get: { method: 'GET' },
            post: { method: 'POST' }
        });
    }]);

})();
