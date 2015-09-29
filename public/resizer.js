var $ = require('jquery');

var resizer = function($document) {
 
  return {
    restrict: 'A',
    link: function($scope, $element, $attrs) {
      var $parent = $($element.parent())
        , $left = $($attrs.resizerLeft, $parent)
        , $right = $($attrs.resizerRight, $parent)
        , $top = $($attrs.resizerTop, $parent)
        , $bottom = $($attrs.resizerBottom, $parent)
        , offset = $parent.offset()
      ;

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
          var x = getSize(event.pageX - offset.left, 
                          $attrs.resizerMin, $attrs.resizerMax)
            , leftWidth = x - $element[0].offsetWidth / 2
            , fullWidth = $left[0].offsetWidth + $right[0].offsetWidth
          ;

          $left.css('flex', '1');
          $right.css('flex', ((fullWidth - leftWidth) / leftWidth).toString());
        } else {
          var y = getSize(event.pageY - offset.top,
                          $attrs.resizerMin, $attrs.resizerMax)
            , topHeight = y - $element[0].offsetHeight / 2
            , fullHeight = $top[0].offsetHeight + $bottom[0].offsetHeight
          ;

          $top.css('flex', '1');
          $bottom.css('flex', ((fullHeight-topHeight) / topHeight).toString());
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
