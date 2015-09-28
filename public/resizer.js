var $ = require('jquery');

var resizer = function($document) {
 
  return {
    restrict: 'A',
    link: function($scope, $element, $attrs) {
      var $parent = $element.parent()
        , $left = $($attrs.resizerLeft, $parent)
        , $right = $($attrs.resizerRight, $parent)
        , $top = $($attrs.resizerTop, $parent)
        , $bottom = $($attrs.resizerBottom, $parent)
      ;

      $element.css({
        position: 'relative',
      });

      if ($attrs.resizer == 'vertical') {
        $element.css({
          top: 0, 
          height: '100%',
        });
      } else {
        $element.css({
          left: 0, 
          width: '100%',
        });
      }

      function mouseup() {
        $document.unbind('mousemove', mousemove);
        $document.unbind('mouseup', mouseup);
      }

      function getSize(size, min, max) {
        if (min && size < parseInt(min)) {
          size = parseInt(min);
        }
        if (max && size > parseInt(max)) {
          size = parseInt(max);
        }
        return size;
      }

      function mousemove(event) {
        if ($attrs.resizer == 'vertical') {
          var x = getSize(event.pageX, $attrs.resizerMin, $attrs.resizerMax);

          $element.css({
            left: x + 'px'
          });


          $left.css({
            width: x + 'px'
          });
          $right.css({
            left: (x + parseInt($attrs.resizerWidth)) + 'px'
          });

        } else {
          var y = getSize(window.innerHeight - event.pageY, 
                          $attrs.resizerMin, $attrs.resizerMax);

          $element.css({
            bottom: y + 'px'
          });

          $top.css({
            bottom: (y + parseInt($attrs.resizerHeight)) + 'px'
          });
          $bottom.css({
            height: y + 'px'
          });
        }
      }
 
      $element.on('mousedown', function(event){
        event.preventDefault();

        $document.on('mousemove', mousemove);
        $document.on('mouseup', mouseup);
      });

    }
  };
};
resizer.$inject = ['$document'];

module.exports = resizer;
