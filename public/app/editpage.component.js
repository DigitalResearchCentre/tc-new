var $ = require('jquery')
  , async = require('async')
  , UIService = require('./services/ui')
  , DocService = require('./services/doc')
  , Dropzone = require('dropzone')
  , ElementRef = ng.core.ElementRef
  , config = require('./config')
;

var AddPageComponent = ng.core.Component({
  selector: 'tc-managemodal-editpage',
  templateUrl: '/app/editpage.html',
  directives: [
    require('./directives/modaldraggable'),
  ],
  inputs: [
    'page',
  ]
}).Class({
  constructor: [
    UIService, DocService, ElementRef,
  function(
    uiService, docService, elementRef
  ) {
    this._docService = docService;
    this._elementRef = elementRef;

    this.uiService = uiService;
    this.message="";
    this.success="";
    this.pageName="";
    this.state = uiService.state;
  }],
  ngOnInit: function() {
    var el = this._elementRef.nativeElement
      , $el = $(el)
      , self = this
      , url = config.IMAGE_UPLOAD_URL
      , $dropzone = $('.dropzone', $el)
    ;
    this.pageName = _.get(this.page, 'attrs.name');
    $('#manageModal').width("530px");
    $('#manageModal').height("300px");
    if (config.env !== 'production') {
      url += '?env=' + config.env;
    }
    $dropzone.dropzone({
      url: url,
      autoProcessQueue: false,
      uploadMultiple: true,
      addRemoveLinks: true,
      dictDefaultMessage:
        "Click here to upload an image file, or drop image file here",
    });
    this.dropzone = $dropzone[0].dropzone;
    this.dropzone.on('queuecomplete', this.onQueueComplete.bind(this));
    this.dropzone.on('addedfile', function(file) {
      var files = this.getQueuedFiles()
        , dropzone = this
      ;
      _.each(files, function(f) {
        dropzone.removeFile(f);
      });
    });
  },
  ngOnChanges: function() {
    this.pageName = _.get(this.page, 'attrs.name');
  },
  onQueueComplete: function() {
    var dropzone = this.dropzone
      , files = dropzone.getAcceptedFiles()
      , imagesMap = {}
      , images = []
      , self = this
    ;
    _.each(files, function(f) {
      var data = JSON.parse(f.xhr.responseText);
      _.each(data, function(image) {
        imagesMap[image._id] = image;
      });
    });
    images = _.values(imagesMap);
    this.editPage(self.pageName, (_.last(images) || {})._id, function() {
      _.each(files, function(f) {
        dropzone.removeFile(f);
      });
    });
  },
  editPage: function(pageName, image, cb) {
    var self = this
      , docService = this._docService
    ;
    var options = {};
    if (!_.isFunction(cb)) {
      cb = function() {};
    }
    docService.update(this.page.getId(), {
//      name: pageName,
      image: image,
    }, options).subscribe(function(page) {
      self.page = page;
//      self.pageName="";
      cb(null, page);
    });
  },
  submit: function() {
    var self = this
      , state = this.state
      , dropzone = this.dropzone
    ;
    if (dropzone.getQueuedFiles().length > 0) {
      dropzone.processQueue();
    } else {
      this.editPage(this.pageName);
    }
  },
  closeModalAP: function() {
    $('MMADBS').prop('checked', true);
    $('#manageModal').modal('hide');
    this.dropzone.removeAllFiles();
  }
});



module.exports = AddPageComponent;
