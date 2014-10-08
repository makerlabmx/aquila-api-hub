(function(){

  var app = angular.module('sessionController',[]);

  app.controller('SessionController', [ '$http' , '$scope','$window','$location','Token', function($http, $scope,$window,$location,Token){
      
      $scope.user = {user: 'javi', password: '123'};
      $scope.message = '';      

      $scope.submit = function () {        
        var data = Token.post({},$scope.user,function(){          
          $window.sessionStorage.token = data.token;
          $window.sessionStorage.user = $scope.user.user;
          $location.path('/');
        },function(){
          delete $window.sessionStorage.token;          
          $scope.message = 'Error: Invalid user or password';
        });    
      };      
      
    }]);
})();