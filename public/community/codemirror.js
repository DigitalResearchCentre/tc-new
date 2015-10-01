var CodeMirror = require('codemirror/lib/codemirror')
  , $ = require('jquery')
;

var codemirror = function() {
  return {
    restrict: 'A',
    controller: function($scope, $element) {
      var editor = CodeMirror.fromTextArea($('textarea', $element)[0], {
        lineWrapping: true,
        lineNumbers: true,
      });
      $scope.$watch('text', function() {
        editor.setValue($scope.text || '');
      });
      editor.setValue($scope.text || '');
    },
  };
};
codemirror.$inject = [];

module.exports = codemirror;
