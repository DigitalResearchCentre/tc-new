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

var AddBulkImagesComponent = ng.core.Component({
  selector: 'tc-managemodal-addbulkimages',
  templateUrl: '/app/addbulkimages.html',
  directives: [
    require('./directives/modaldraggable'),
    require('./directives/modalresizable'),
  ],
  inputs: [
    'document',
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
    this.oneormany="ManyPages";
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
      $('#dzAdviseMultiple').html('<span style="color:red">Click "Add" to start uploading.<br>If the files appear outside the box: you can expand the window</span>');
    });
    window.dropzone = this.dropzone;
  },
  ngOnChanges: function() {
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
    self.facsFiles=[];
    self.nameFiles=[];
		self.unmatchedFiles=[];
    async.whilst(function() {
      return !_.isEmpty(images);
    }, function(cb) {
      var image = images.shift();
      //look here for facs; else look for page name
      self.addPage(image.filename, image._id, cb);
    }, function(err, n) {
			if (self.facsFiles.length>0) {
				self.success="Page images added by facs attribute: ";
				for (var i = 0; i < self.facsFiles.length; i++) {
					self.success+=self.facsFiles[i].name+" ("+self.facsFiles[i].facs+")";
					if (i<self.facsFiles.length-1) self.success+=", "
				}
				self.success+=". "
			}
			if (self.nameFiles.length>0) {
				self.success+="Page images added by name: ";
				for (var i = 0; i < self.nameFiles.length; i++) {
					self.success+=self.nameFiles[i].name+" ("+self.nameFiles[i].facs+")";
					if (i<self.nameFiles.length-1) self.success+=", "
				}
			}
			if (self.unmatchedFiles.length>0) {
				self.message+="No corresponding facs attributes or page names found for image files: ";
				for (var i = 0; i < self.unmatchedFiles.length; i++) {
					self.message+=self.unmatchedFiles[i];
					if (i<self.unmatchedFiles.length-1) self.message+=", "
				}
				self.message+="."
			}
      _.each(files, function(f) {
        dropzone.removeFile(f);
      });
      var bill=0;
      //we have to add facs attributes to tei for each page
    });
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
    this.message="";
    //get name of file, if we have One
    //check page name against facs attribute; if none found, check against page name; if none found, warning

    if (image && this.dropzone) {
      //is there a matching facs?
      var options = {};
      var facsDoc=self.document.attrs.children.filter(function (obj){return obj.attrs.facs== pageName;})[0];
      if (facsDoc) {
	      docService.update(facsDoc.getId(), {image: image,}, options).subscribe(function(page){
	          self.facsFiles.push({name: facsDoc.attrs.name, facs: pageName});
						cb(null, page);
	      })
			} else {
				var splitname=pageName.split('.')[0];
				var nameDoc=self.document.attrs.children.filter(function (obj){return obj.attrs.name== splitname;})[0];
				if (nameDoc) {
		      docService.update(nameDoc.getId(), {image: image,}, options).subscribe(function(page){
		          self.nameFiles.push({name: nameDoc.attrs.name, facs: pageName});
							cb(null, page);
		      })
				} else { //not in facs element, not matching page name
					self.unmatchedFiles.push(pageName);
					cb(null, null);
				}
			}
    }
  },
  submit: function() {
    if (this.oneormany=="ManyPages" && this.dropzone.getQueuedFiles().length==0) {
      this.message="Choose image files or drop them in the area below"
      return
    }
    this.message="";
    if (this.oneormany=="ManyPages") $('#dzAdviseMultiple').html('<span style="color:red">Keep clicking "Add Images" till all files are uploaded</span>');
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
    $('MMADBS').prop('checked', true);
    $('#manageModal').modal('hide');
    this.isCancel = false;
    this.isAdd = true;
    this.dropzone.removeAllFiles();
  }
});



module.exports = AddBulkImagesComponent;
