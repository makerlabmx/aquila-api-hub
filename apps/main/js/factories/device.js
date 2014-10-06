(function () {

    var app = angular.module('deviceFactory', ['ngResource']);

    app.factory('Device', ['$resource',function($resource){        
        return $resource("/api/devices", {}, {
            get: { method: 'GET' },
            post: {method:'POST'},
            all: {method:'GET', isArray:true}
        });
    }]);    

})();
  