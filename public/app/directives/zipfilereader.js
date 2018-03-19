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
  inputs: [
    'context'
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
      self.context.message="About to load "+event.target.files["0"].name+". This may take a few moments<br/>";
      var dateBefore = new Date();
      zip.loadAsync(event.target.files[0])
        .then(function(zip){
          var dateAfter = new Date();
          self.context.message+="Zip file loaded in "+(dateAfter - dateBefore) +  " ms<br/> "
          self.filechange.emit(zip)
        }, function() {alert("That is not a valid zip file")});
    });
  },
});

module.exports = ZipFileReaderComponent;
