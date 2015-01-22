(function () {

  var app = angular.module('socketAquilaFactory', ['btford.socket-io']);

  app.factory('socketAquila',['socketFactory', '$window', '$rootScope', function(socketFactory, $window, $rootScope){
    var myIoSocket = io.connect($rootScope.server, {query: "token=" + $window.sessionStorage.token});
    socket = socketFactory({
      ioSocket: myIoSocket
    });
    return socket;
  }]);

})();
