(function(){

  var app = angular.module('mainController',[]);

  app.controller('MainController', [ '$http' , '$scope','$window','$location','Token', function($http, $scope,$window,$location,Token){
      
      $scope.logout = function(){
        delete $window.sessionStorage.token;
        $location.path('/login');
      }

      $scope.reload = function(){
        $http.get('/api/reload');
      }
  }]);
})();