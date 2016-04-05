var EventEmitter = ng.core.EventEmitter
  , ContentChildren = ng.core.ContentChildren
  , ElementRef = ng.core.ElementRef
  , $ = require('jquery')
;

var Pane = ng.core.Component({
  selector: 'tc-pane',
  template: [
    '<ng-content></ng-content>',
  ].join(' '),
}).Class({
  constructor: function() {},
});

var Splitter = ng.core.Class({
  constructor: [ElementRef, function(elementRef) { 
    this._elementRef = elementRef;
    this.resize = new EventEmitter();
  }],
  ngOnInit: function() {
    var el = this._elementRef.nativeElement
      , $el = $(this._elementRef.nativeElement)
      , $splitter = $el.find('>.splitter').first()
      , $document = $(document)
      , self = this
      , $left, $right
    ;
    $el.find('tc-pane').first().after($splitter);
    $left = $splitter.prev();
    $right = $splitter.next();

    $splitter.on('mousedown', function(evt) {
      event.preventDefault();

      $document.on('mousemove', mousemove);
      $document.on('mouseup', mouseup);
    });

    function mousemove (evt) {
      var offset = $el.offset()
        , size , leftSize , fullSize
      ;

      if (!$el.hasClass('horizontal')) {
        size = getSize(evt.pageX - offset.left, self.min, self.max);
        leftSize = size - $splitter[0].offsetWidth / 2;
        fullSize = $left[0].offsetWidth + $right[0].offsetWidth;
      } else {
        size = getSize(evt.pageY - offset.top, self.min, self.max);
        leftSize = size - $splitter[0].offsetHeight / 2;
        fullSize = $left[0].offsetHeight + $right[0].offsetHeight;
      }
      $left.css('flex', '1 1 0');
      $right.css(
        'flex', 
        ((fullSize - leftSize) / leftSize).toString() + ' 1 ');
      self.resize.emit();


      function getSize(size, min, max) {
        if (min && size < parseInt(min)) {
          size = parseInt(min);
        }
        if (max && size > parseInt(max)) {
          size = parseInt(max);
        }
        return size;
      }
    }

    function mouseup(evt) {
      $document.unbind('mousemove', mousemove);
      $document.unbind('mouseup', mouseup);
    }
  },
});

ng.core.Component({
  selector: 'tc-splitter',
  template: [
    '<ng-content></ng-content>',
    '<div class="splitter"></div>',
  ].join(' '),
  directives: [
    Pane, Splitter,
  ],
  inputs: [
    'min', 'max',
  ],
  outputs: [
    'resize'
  ],
})(Splitter);

module.exports = {
  Splitter: Splitter,
  Pane: Pane,
  SPLITTER_DIRECTIVES: [Splitter, Pane],
};



