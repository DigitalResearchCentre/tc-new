var EventEmitter = ng.core.EventEmitter
  , ElementRef = ng.core.ElementRef
  , $ = require('jquery')
;


var FileReaderComponent = ng.core.Component({
  selector: 'tc-filereader',
  template: '<input type="file"/>',
  // style="width: 250px; display: inline-block" 
  outputs: [
    'filechange'
  ],
}).Class({
  constructor: [ElementRef, function(elementRef) { 
    this._elementRef = elementRef;

    this.filechange = new EventEmitter();
  }],
  ngOnInit: function() {
    var el = this._elementRef.nativeElement
      , $el = $(el)
      , self = this
    ;
    $el.bind('change', function(event) {
      var reader = new FileReader();
      reader.onload = function(evt) {
        self.filechange.emit(evt.target.result);
      };
      reader.readAsText(event.target.files[0]);
    });
  },
});

module.exports = FileReaderComponent;

