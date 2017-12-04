var EventEmitter = ng.core.EventEmitter
  , ElementRef = ng.core.ElementRef
  , $ = require('jquery')
  , JSZip = require('jszip')
;


var ZipFileReaderComponent = ng.core.Component({
  selector: 'tc-zipfilereader',
  template: '<input id="FRinput" class="btn wizardbutton" style="margin: auto; color: white; text-align: center" type="file"/>',
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
      var zip = new JSZip();
      zip.loadAsync(event.target.files[0])
        .then(function(zip){
          self.filechange.emit(zip)
        }, function() {alert("That is not a valid zip file")}); 
    });
  },
});

module.exports = ZipFileReaderComponent;
