(function(){

  var app = angular.module('sessionController',[]);

  app.controller('SessionController', [ '$http' , '$scope','$window','$location','Token', function($http, $scope,$window,$location,Token){
      
      $scope.user = {user: 'javi', password: '123'};
      $scope.message = '';      

      $scope.submit = function () {        
        var data = Token.post({},$scope.user,function(){
          $window.sessionStorage.token = data.token;
          $scope.message = 'Welcome';
          console.log(data.token);
          $location.path('/');
        },function(){
          delete $window.sessionStorage.token;          
          $scope.message = 'Error: Invalid user or password';
        });    
      };

      $scope.test = function(){
        console.log($window.sessionStorage.token);
      }
          
      
    }]);
})();