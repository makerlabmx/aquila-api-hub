(function(){

  var app = angular.module('mainController',[]);

  app.controller('MainController', [ '$http' , '$scope', function($http, $scope){    
      main = this;        

      main.doReload = function(){
        //Aq.reload();
      };
          
      
    }]);
})();