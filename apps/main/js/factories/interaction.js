(function () {

    var app = angular.module('interactionFactory', ['ngResource']);

    app.factory('Interaction', ['$resource',function($resource){        
        return $resource("/api/interactions/:id", {id: "@id"}, {
            get: { method: 'GET'},  
            create: { method: 'POST', isArray:true},
            delete: { method: 'DELETE', isArray:true},
            all: {method:'GET', isArray:true}
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
  