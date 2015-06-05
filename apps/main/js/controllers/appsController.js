(function() {

  var app = angular.module('appsController',[]);

  app.controller('AppsController', function($scope) {

  	$scope.error        = false;
  	$scope.modal_title  = "";
  	$scope.save_element = false;
  	$scope.edit_element = false;

    $scope.newToken = function() {
      $scope.error        = false;
      $scope.save_element = true;
      $scope.edit_element = false;
      $scope.modal_title  = "Create new token";
      $('#modal-token').modal('show');
    };

    $scope.editToken = function(name) {
      $scope.error        = false;
      $scope.save_element = false;
      $scope.edit_element = true;
      $scope.modal_title  = "Edit token";
      $('#modal-token').modal('show');
    };

  });
})();
