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

  app.factory('socketAquila',['socketFactory','$window', function(socketFactory,$window){
    var myIoSocket = io.connect('/',{query: "token=" + $window.sessionStorage.token});
    socket = socketFactory({
      ioSocket: myIoSocket
    });
    return socket;
  }]);

})();
