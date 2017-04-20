var ElementRef = ng.core.ElementRef
  , $ = require('jquery')
;

var ModalResizable = ng.core.Directive({
  selector: '[modal-resizable]',
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
      var xWidth=$('#manageModal').width();
      var xHeight=$('#manageModal').height();
      var newX=xWidth+x;
      var newY=xHeight+y;
      var maxHeight=$(window).height();
      var maxWidth=$(window).width();
      if (newY<420) newY=420;
      if (newX<530) newX=530;
      var eTop = $('#manageModal').offset().top
      var eLeft = $('#manageModal').offset().left
      if (eTop<5) $('#manageModal').css({top: '5px'})
      if (eLeft<5) $('#manageModal').css({left: '5px'})
      if (newY>maxHeight) newY=maxHeight-20;
      if (newX>maxWidth) newX=maxWidth-20;
      $('#manageModal').width(newX+'px');
      $('#manageModal').height(newY+'px');
      //set new size...
//      $('#manageModal').width(x+'px');
//      $('#manageModal').height(y+'px');
    }

    function mouseup() {
      $document.off('mousemove', mousemove);
      $document.off('mouseup', mouseup);
    }
  }
});


module.exports = ModalResizable;
