(function () {

    var app = angular.module('deviceFactory', ['ngResource']);

    app.factory('Device', ['$resource',function($resource){
        return $resource("/api/devices/:id", {id: "@id"}, {
            get: { method: 'GET'},
            all: {method:'GET', isArray:true},
            put: { method: 'PUT' },
            forget: { method: 'DELETE' }
        });
    }]);

    app.factory('Action', ['$resource',function($resource){
        return $resource("/api/devices/:id/action/:action/:range", {id: "@id", action: "@action", range: "@range"}, {
            get: { method: 'GET'},
            all: {method:'GET', isArray:true},
            doit: { method: 'GET'},
            range: {method:'GET'}
        });
    }]);


})();
