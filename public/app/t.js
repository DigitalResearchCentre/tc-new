require('../../common/mixin');
var $ = require('jquery')
  , Dropzone = require('dropzone')
  , ElementRef = ng.core.ElementRef
  , config = require('./config')
;



var AppComponent = ng.core.Component({
  selector: 'tc-app',
  templateUrl: '/app/t.html',
  directives: [
  ],
}).Class({
  constructor: [ElementRef,
  function(elementRef) {
    this._elementRef = elementRef;
  }],
  ngOnInit: function() {
    var el = this._elementRef.nativeElement
      , $el = $(el)
      , self = this
      , url = config.IMAGE_UPLOAD_URL
      , $dropzone = $('.dropzone', $el)
    ;
    if (config.env !== 'production') {
      url += '?env=' + config.env;
    }
    $dropzone.dropzone({
      url: url,
      autoProcessQueue: false,
      uploadMultiple: true,
      addRemoveLinks: true,
      dictDefaultMessage:
        "Click here to upload a file, or drop image file or files here",
    });
    this.$dropzone = $dropzone;
    this.dropzone = $dropzone[0].dropzone;
    this.dropzone.on('success', function(file, res) {
//      console.log(file, res);
    });
    this.dropzone.on('addedfile', function(file) {
      var files = this.getQueuedFiles()
        , dropzone = this
      ;
//      console.log(files);
      _.each(files, function(f) {
        dropzone.removeFile(f)
      });
    });

    window.dropzone = this.dropzone;
  },
  upload: function() {
    this.dropzone.uploadFiles(this.getQueuedFiles());
  },
});

document.addEventListener('DOMContentLoaded', function() {
  ng.platform.browser.bootstrap(AppComponent, [
    ng.http.HTTP_PROVIDERS,
    ng.router.ROUTER_PROVIDERS,
    require('./services/rest'),
    require('./services/auth'),
    require('./services/community'),
    require('./services/doc'),
    require('./services/revision'),
    require('./services/ui'),
  ]).catch(function(err) {
    console.error(err);
  });
});
