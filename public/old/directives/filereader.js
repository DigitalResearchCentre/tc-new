var filereader = function() {
 
  return {
    restrict: 'A',
    link: function($scope, $element, $attrs) {
      $element.bind('change', function(changeEvent) {
        var reader = new FileReader();
        reader.onload = function(evt) {
          $scope.$apply(function() {
            $scope.filereader = evt.target.result;
          });
        }
        reader.readAsText(changeEvent.target.files[0]);
      })
    }
  };
};

module.exports = filereader;
