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
		this.state.lastDocCreated = null;
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
      $('#dzAdviseMultiple').html('<span style="color:red">Click "Add Images" to start uploading.<br>If the files appear outside the box: you can expand the window</span>');
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
			, docService = this._docService
			, router = this._router
			, state = this.state
			, myDocId=this.document.getId();
    ;
		state.lastDocCreated = null;
		self.unMatchedFiles=[];
		self.nameFiles=[];
		self.facsFiles=[];
		//somewhat wierd.. file info is embedded in xhr response for two files at a time. why? anyways, we hack a solution

		for (var i=0; i<files.length; i++) {
			var data=JSON.parse(files[i].xhr.responseText);
			if (i % 2 === 0) {
        images.push({filename: data[0].originalname, _id: data[0]._id})
	    }
	    else {
	      images.push({filename: data[1].originalname, _id: data[1]._id})
	    }
		}
		self.success="Adding images and pages"
		self.message="";
		$('#dzAdviseMultiple').html("");
		async.mapSeries(images, function(image) {
			const cb2 = _.last(arguments);
			var options={};
			if (!image || !self.dropzone) {cb2({error: "No image? no dropzone?"}); return}
			var facsDoc=self.document.attrs.children.filter(function (obj){return obj.attrs.facs== image.filename;})[0];
			if (facsDoc) {
				docService.update(facsDoc.getId(), {image: image}, options).subscribe(function(page){
						self.facsFiles.push({name: facsDoc.attrs.name, facs: image.filename});
						cb2(null);
				})
			} else {
				var splitname=image.filename.split('.')[0];
				var nameDoc=self.document.attrs.children.filter(function (obj){return obj.attrs.name== splitname;})[0];
				if (nameDoc) {
					docService.update(nameDoc.getId(), {image: image,}, options).subscribe(function(page){
							self.nameFiles.push({name: nameDoc.attrs.name, facs: image.filename});
							cb2(null);
					})
				} else { //not in facs element, not matching page name. Just add the page!
					//issues. if pages already present and state.lastDocCreated is null, locate last page and add it after that
					//if there are no pages in document and state.lastDocCreated is null: this is the first page we are adding in document, set parent
					// if state.lastDocCreated is not null: we must add this page after the last page made
					//set options accordingly!
					var options={};
					if (self.document.attrs.children.length==0 && !state.lastDocCreated) options.parent=self.document;
					else if (self.document.attrs.children.length>0 && !state.lastDocCreated) options.after=self.document.attrs.children[self.document.attrs.children.length];
					else if (state.lastDocCreated) options.after=state.lastDocCreated;
					var myDoc={name: splitname, image: image, label: "pb", children:[],}
					docService.commit({
						doc: myDoc,
					}, options).subscribe(function(page) {
						self.message+="<br/>"+splitname+" ("+image.filename+"; no page name or facs attribute matched)";
						self.unMatchedFiles.push({pageName: splitname, fileName: image.filename});
						cb2(null);
					});
				}
			}
		}, function (err) {
			if (err) console.error(err.message);
			else {
				if (self.facsFiles.length>0) {
					self.success="Page images added by facs attribute to existing files: ";
					for (var i = 0; i < self.facsFiles.length; i++) {
						self.success+=self.facsFiles[i].name+" ("+self.facsFiles[i].facs+")";
						if (i<self.facsFiles.length-1) self.success+=", "
					}
					self.success+=". "
				}
				if (self.nameFiles.length>0) {
					self.success+="Page images added by name to existing files: ";
					for (var i = 0; i < self.nameFiles.length; i++) {
						self.success+=self.nameFiles[i].name+" ("+self.nameFiles[i].facs+")";
						if (i<self.nameFiles.length-1) self.success+=", "
					}
				}
				if (self.unMatchedFiles.length==1) {
					self.success+="<br/>No corresponding facs attributes or page names found for an image file. One page made and image added";
				}
				if (self.unMatchedFiles.length>1) {
					self.success+="<br/>No corresponding facs attributes or page names found for "+self.unMatchedFiles.length+" image files; "+self.unMatchedFiles.length+" pages made and images added";
				}
			}
			_.each(files, function(f) {
				dropzone.removeFile(f);
			});
		});
  },
  addPage: function(pageName, image, cb2) {
    var self = this
      , docService = this._docService
      , router = this._router
      , state = this.state
    ;
    var options = {};
    this.message="";
    //get name of file, if we have One
    //check page name against facs attribute; if none found, check against page name; if none found, warning

    if (image && this.dropzone) {
      //is there a matching facs?
      var options = {};
    }
  },
  submit: function() {
    if (this.oneormany=="ManyPages" && this.dropzone.getQueuedFiles().length==0) {
      this.message="Choose image files or drop them in the area below"
      return
    }
    this.message="";
		this.success="";
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
