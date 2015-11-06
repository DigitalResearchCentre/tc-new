var CodeMirror = require('codemirror/lib/codemirror')
  , xmlmode = require('codemirror/mode/xml/xml')
  , $ = require('jquery')
;

var codemirror = function() {
  return {
    require: '?ngModel',
    restrict: 'A',

    compile: function(tElement, tAttrs, transclude) {
      return function(scope, iElement, iAttrs, ngModel) {
        var editor = CodeMirror.fromTextArea($('textarea', iElement)[0], {
          lineWrapping: true,
          lineNumbers: true,
          mode:  'xml'
        });
        ngModel.$render = function() {
          editor.setValue(ngModel.$viewValue || '');
        };
        editor.on('change', function(instance) {
          var newValue = instance.getValue();
          if (newValue !== ngModel.$viewValue) {
            scope.$evalAsync(function() {
              ngModel.$setViewValue(newValue);
            });
          }
        });
      };
    },
  };
};
codemirror.$inject = [];

module.exports = codemirror;
