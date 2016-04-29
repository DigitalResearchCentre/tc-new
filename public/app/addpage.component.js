var $ = require('jquery')
  , async = require('async')
  , Router = ng.router.Router
  , UIService = require('./services/ui')
  , CommunityService = require('./services/community')
  , DocService = require('./services/doc')
  , Dropzone = require('dropzone')
  , ElementRef = ng.core.ElementRef
  , config = require('./config')
;

var AddPageComponent = ng.core.Component({
  selector: 'tc-managemodal-addpage',
  templateUrl: '/app/addpage.html',
  directives: [
    require('./directives/modaldraggable'),
  ],
  inputs: [
    'parent', 'after',
  ]
}).Class({
  constructor: [
    Router, CommunityService, UIService, DocService, ElementRef,
  function(
    router, communityService, uiService, docService, elementRef
  ) {
    this._docService = docService;
    this._router = router;
    this._elementRef = elementRef;

    this.uiService = uiService;
    this.message="";
    this.success="";
    this.oneormany="OnePage";
    this.pageName="";
    this.imageUrl = '';
    this.state = uiService.state;
  }],
  ngOnInit: function() {
    var el = this._elementRef.nativeElement
      , $el = $(el)
      , self = this
      , url = config.IMAGE_UPLOAD_URL
      , $dropzone = $('.dropzone', $el)
    ;
    $('#manageModal').width("530px");
    $('#manageModal').height("415px");
    this.isCancel=false;
    this.isAdd=true;
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
    this.dropzone = $dropzone[0].dropzone;
    this.dropzone.on('queuecomplete', this.onQueueComplete.bind(this));
    this.dropzone.on('addedfile', function(file) {
      if (self.oneormany === "OnePage") {
        var files = this.getQueuedFiles()
          , dropzone = this
        ;
        _.each(files, function(f) {
          dropzone.removeFile(f);
        });
      }
    });
    window.dropzone = this.dropzone;
  },
  ngOnChanges: function() {
    console.log(this.parent);
    console.log(this.after);
  },
  showSingle: function() {
    var dropzone = this.dropzone
      , files = dropzone.getQueuedFiles()
    ;
    this.oneormany = "OnePage";
    _.each(files.slice(0, files.length-1), function(f) {
      dropzone.removeFile(f)
    });
  },
  showMany: function(){
    this.oneormany="ManyPages";
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
    if (this.oneormany=="OnePage") {
      if (this.pageName === "") {
        this.message="You must supply a name for the page";
        return;
      } else {
        this.message="";
        var matchedpage= state.document.attrs.children.filter(function (obj){return obj.attrs.name === self.pageName;})[0];
        if (matchedpage) {
          this.message="There is already a page "+this.pageName;
          return;
        }
        this.addPage(
          self.pageName,
          (_.last(images) || {})._id, function() {
            _.each(files, function(f) {
              dropzone.removeFile(f);
            });
          }
        );
      }
    } else {
      async.whilst(function() {
        return !_.isEmpty(images);
      }, function(cb) {
        var image = images.shift();
        console.log(image);
        self.addPage(image.filename.split('.')[0], image._id, cb);
      }, function(err, n) {
        _.each(files, function(f) {
          dropzone.removeFile(f);
        });
      });
    }
  },
  onImageUploaded: function(file, res) {
    console.log(this.dropzone.getQueuedFiles());
    console.log(file);
    console.log(res);
  },
  addPage: function(pageName, image, cb) {
    var self = this
      , docService = this._docService
      , router = this._router
      , state = this.state
    ;
    var options = {};
    if (this.parent) {
      options.parent = this.parent;
    } else if (this.after) {
      options.after = this.after;
    }
    docService.commit({
      doc: {
        name: pageName,
        image: image,
        label: 'pb',
        children: [],
      },
    }, options).subscribe(function(page) {
      self.page = page;
      router.navigate(['Community', {
        id: state.community.getId(), route: 'view'
      }]);
      self.success="Page "+pageName+" added";
      self.isCancel=true;
      self.isAdd=false;
      self.pageName="";
      cb(null, page);
    });
  },
  submit: function() {
    var self = this
      , state = this.state
      , router = this._router
      , dropzone = this.dropzone
    ;
    if (dropzone.getQueuedFiles().length > 0) {
      dropzone.processQueue();
    } else {
      this.addPage(this.pageName);
    }
  },
  closeModalAP: function() {
    this.message = this.success = this.pageName = "";
    this.oneormany = "OnePage";
    $('MMADBS').prop('checked', true);
    $('#manageModal').modal('hide');
    this.isCancel = false;
    this.isAdd = true;
    this.dropzone.removeAllFiles();
  }
});



module.exports = AddPageComponent;
