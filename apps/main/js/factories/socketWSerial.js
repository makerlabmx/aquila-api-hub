(function () {

  var app = angular.module('socketWSerialFactory', ['btford.socket-io']);

  app.factory('socketWSerial',['socketFactory', '$window', '$rootScope', function(socketFactory, $window, $rootScope){
    var myIoSocket = io.connect($rootScope.server + 'wserial', {query: "token=" + $window.sessionStorage.token});
    socket = socketFactory({
      ioSocket: myIoSocket
    });
    return socket;
  }]);

})();
