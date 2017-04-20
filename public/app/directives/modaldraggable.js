var ElementRef = ng.core.ElementRef
  , $ = require('jquery')
;

var ModalDraggable = ng.core.Directive({
  selector: '[modal-draggable]',
}).Class({
  constructor: [ElementRef, function(elementRef) {
    this._elementRef = elementRef;
  }],
  ngOnInit: function() {
    var el = this._elementRef.nativeElement
      , $el = $(el)
      , $document = $(document)
      , startX = 0, startY = 0, x = 0, y = 0
    ;
    $el.css({
     position: 'relative',
     cursor: 'pointer',
     display: 'block',
    });
    $el.on('mousedown', function(event) {
      // Prevent default dragging of selected content
      event.preventDefault();
      startX = event.screenX - x;
      startY = event.screenY - y;
      $document.on('mousemove', mousemove);
      $document.on('mouseup', mouseup);
    });

    function mousemove(event) {
      y = event.screenY - startY;
      x = event.screenX - startX;
      $('#manageModal').css({
        top: y + 'px',
        left:  x + 'px'
      });
    }

    function mouseup() {
      $document.off('mousemove', mousemove);
      $document.off('mouseup', mouseup);
    }
  }
});


module.exports = ModalDraggable;
