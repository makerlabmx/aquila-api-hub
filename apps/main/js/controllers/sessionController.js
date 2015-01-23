(function(){

  var app = angular.module('sessionController',[]);

  app.controller('SessionController', [ '$scope', '$window', '$location', 'Token', function($scope, $window, $location, Token){

      $scope.user = {user: '', password: ''};
      $scope.message = '';

      $scope.submit = function () {
        var data = Token.post({},$scope.user,function(){
          $window.localStorage.token = data.token;
          $window.localStorage.user = $scope.user.user;
          $location.path('/');
        },function(){
          delete $window.localStorage.token;
          $scope.error = 'Invalid User or Password';
        });
      };

    }]);
})();
