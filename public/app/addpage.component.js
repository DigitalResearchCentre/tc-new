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
    require('./directives/modalresizable'),
  ],
  inputs: [
    'document', 'page', 'afterPage', 'parent', 'after', 'multiple'
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
    $('#manageModal').height("420px");
    this.isCancel=false;
    this.isAdd=true;
    if (this.multiple) this.oneormany="ManyPages";
    else this.oneormany="OnePage"
    if (config.env !== 'production') {
      url += '?env=' + config.env;
    }
    $dropzone.dropzone({
      url: url,
      autoProcessQueue: false,
      uploadMultiple: true,
      addRemoveLinks: true,
    });
    this.dropzone = $dropzone[0].dropzone;
    this.dropzone.on('queuecomplete', this.onQueueComplete.bind(this));
    this.dropzone.on('addedfile', function(file) {
      self.message="";
      if (self.oneormany=="ManyPages") $('#dzAdviseMultiple').html('<span style="color:red">Click "Add" to start uploading.<br>If the files appear outside the box: you can expand the window</span>');
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
  },
  showSingle: function() {
    var dropzone = this.dropzone
      , files = dropzone.getQueuedFiles()
    ;
    this.oneormany = "OnePage";
    _.each(files.slice(0, files.length-1), function(f) {
      dropzone.removeFile(f)
    });
    $('#dzMessage').text("Click here to upload an image file, or drop the file here")
    this.message="";

  },
  showMany: function(){
    this.oneormany="ManyPages";
    $('#dzMessage').text("Click here to upload image files, or drop the files here")
    this.message="";
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
      this.addPage(
        self.pageName,
        (_.last(images) || {})._id, function() {
          _.each(files, function(f) {
            dropzone.removeFile(f);
          });
        }
      );
    } else {
      async.whilst(function() {
        return !_.isEmpty(images);
      }, function(cb) {
        var image = images.shift();
        self.addPage(image.filename.split('.')[0], image._id, cb);
      }, function(err, n) {
        _.each(files, function(f) {
          dropzone.removeFile(f);
        });
        var bill=0;
        //we have to add facs attributes to tei for each page
      });
    }
  },
  addPage: function(pageName, image, cb) {
    var self = this
      , docService = this._docService
      , router = this._router
      , state = this.state
    ;
    var options = {};
    if (!_.isFunction(cb)) {
      cb = function() {}
    }
    if (this.pageName === "" && this.oneormany=="OnePage") {
      this.message="You must supply a name for the page";
      return cb(null);
    } else {
      this.message="";
      var matchedpage = _.find(this.state.document.attrs.children, function (obj){
        return obj.attrs.name === self.pageName;
      });
      if (matchedpage && this.oneormany=="OnePage") {
        this.message="There is already a page "+this.pageName;
        return cb(null);
      }
      if (this.parent) {
        options.parent = this.parent;
      } else if (this.after) {
        options.after = this.after;
      }
      //get name of file, if we have One
      if (this.oneormany=="ManyPages" && image && this.dropzone) {
        var facsel=this.dropzone.files.filter(function (obj){return obj.name.split('.')[0]== pageName;})[0];
        var myDoc={name: pageName, image: image, label: "pb", facs: facsel.name, children:[],}
      } else var myDoc={name: pageName, image: image, label: "pb", children:[],}
      docService.commit({
        doc: myDoc,
      }, options).subscribe(function(page) {
        //if this is first page -- then call new text Page
        //if not: call choose continue or add new text depending on what prevs tells us
  //        self.page = page;
          router.navigate(['Community', {
            id: state.community.getId(), route: 'view'
          }]);
          state.newTranscript=false;  //this triggers continue or new transcript for this page -- moved to confirm page now
          self.success="Page "+pageName+" added";
          self.isCancel=true;
          self.isAdd=false;
          //now ask: do you want to make a transcription? or add another page?
          //if this is the very first page of the document..
          if (!self.state.document.expand)
            self.uiService.choosePage$.emit(self.state.document);
          if (self.oneormany === "OnePage") {
            var header="Add a page after "+self.pageName+" in "+self.state.document.attrs.name+", or transcribe "+self.pageName;
            var warning="";
            var action="continueAddPage";
          } else {
            var warning="Either: <ul><li>Add more pages in "+self.state.document.attrs.name+"</li><li>Reorder and rename the pages</li><li>Start transcribing</li></ul>Once you have started transcribing, you cannot reorder the document pages (you can rename them)";
            var header="Add, reorder/rename or transcribe pages in "+self.state.document.attrs.name;
            var action="continueAddPages";
          }
          self.uiService.manageModal$.emit ({
            type: 'confirm-message',
            page: state.page,
            docname:self.pageName,
            header: header,
            warning: warning,
            action: action,
            document: self.document,
          })
          self.pageName="";
          cb(null, page);
      });
    }
  },
  submit: function() {
    if (this.oneormany=="ManyPages" && this.dropzone.getQueuedFiles().length==0) {
      this.message="Choose image files or drop them in the area below"
      return
    }
    this.message="";
    if (this.oneormany=="ManyPages") $('#dzAdviseMultiple').html('<span style="color:red">Keep clicking "Add" till all files are uploaded</span>');
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
