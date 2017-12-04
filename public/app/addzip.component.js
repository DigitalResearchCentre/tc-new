var $ = require('jquery')
  , async = require('async')
  , UIService = require('./services/ui')
  , DocService = require('./services/doc')
  , ElementRef = ng.core.ElementRef
  , config = require('./config')
  , JSZip = require('jszip')
  , async = require('async')
;

var AddZipComponent = ng.core.Component({
  selector: 'tc-managemodal-addzip',
  templateUrl: '/app/addzip.html',
  directives: [
    require('./directives/modaldraggable'),
    require('./directives/zipfilereader'),
  ],
  inputs: [
    'document',
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
    this.fileNames=[];
    this.zip=null;
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
    $('#manageModal').width("580px");
    $('#manageModal').height("275px");
    if (config.env !== 'production') {
      url += '?env=' + config.env;
    }
    this.message="<p style='text-align: left; margin-left:10px'>Zip files may only contain image files (jpg, tiff, png). \
        <br>If the document is empty: TC will use the image names to constuct a skeleton XML document.</p>\
        <p style='text-align: left; margin-left:10px'>If the document is not empty, TC will match the file names to page names (or facs attributes) in the document.</p>"
  },
  filechange: function(zip) {
    var self=this;
    var matchedFiles="";
    var unMatchedFiles="";
    self.zip=zip;
    for (var key in zip.files) {
       var myFile=zip.files[key];
       //make a catalog of the imaage files here; check for types .jpg .tif .png
       //check against doc for matches with facs and page names
       //if document has no pages -- add all these using the file names as page names
       if (!myFile.dir && myFile.name.indexOf("/.")==-1) {
         var fname=myFile.name.slice(myFile.name.lastIndexOf('/')+1);
         var pname=fname.split('.')[0];
         var facsDoc=self.document.attrs.children.filter(function (obj){return (obj.attrs.facs && obj.attrs.facs.toLowerCase()== fname.toLowerCase());})[0];
         if (facsDoc) {
           if (matchedFiles!="") matchedFiles+=", ";
           matchedFiles+=facsDoc.attrs.name+ " ("+fname+")";
           self.fileNames.push({"key": key, "file":fname, "page": facsDoc.attrs.name, "id":facsDoc.attrs._id});
         } else {
           var nameDoc=self.document.attrs.children.filter(function (obj){return obj.attrs.name.toLowerCase()== pname.toLowerCase();})[0];
           if (nameDoc) {
             if (matchedFiles!="") matchedFiles+=", ";
             matchedFiles+=nameDoc.attrs.name+ " ("+fname+")";
             self.fileNames.push({"key": key, "file":fname, "page": nameDoc.attrs.name, "id":nameDoc.attrs._id});
           } else {  //did not match this page, ho ho
             if (unMatchedFiles!="") unMatchedFiles+=", ";
             unMatchedFiles+=fname;
           }
         }
       }
    }
    $.post(config.BACKEND_URL+'isDocTranscript?'+'docid='+self.document._id, function(res) {
      if (!res.isDocText) {
        //we have no text in this document
        var message="This document has no text. TC will create a page for each image file in this zip file: "+unMatchedFiles;
      } else {
        var message="<p>TC will add images for these pages in this document: "+matchedFiles+". Click the <span style='background-color:#337ab7; color:white'>Load</span> button below to add these images.</p>";
        if (unMatchedFiles!="") message+="<p>These images do not match any page or facs attribute in this document: "+unMatchedFiles+". TC will ignore them.</p>";
      }
      self.message=message;
  /*    if (confirm(message) == true) {
           var bill=1;
           zip.files[fileNames[0].key].async("base64").then(function (myImage) {
             var parseFile = new Parse.File(fileNames[0].file, { base64: myImage }, "image/jpeg");
             loadImage(parseFile,  function (img) {
                 var bill=2;
             });
           });
       } else {
         var bill=2;
       } */
    });
  },
  ngOnChanges: function() {
    this.pageName = _.get(this.page, 'attrs.name');
  },
  submit: function() {
    if (!this.zip) {
      this.message="No zip file chosen, or chosen file processed.";
      return;
    } else {
      var self=this;
      self.message="Commencing upload of "+self.fileNames.length+" files to the server"
      var i=0;
      var url = config.IMAGE_UPLOAD_URL;
      if (config.env !== 'production') {
        url += '?env=' + config.env;
      }
      //make this async..
        async.forEachOf(self.fileNames, function(thisFile) {
          const cb2 = _.last(arguments);
          self.zip.files[thisFile.key].async("blob").then(function (myImage) {
            var fd = new FormData();                  // Creating object of FormData class
  //          fd.append("filename", self.fileNames[i].file);
            var blob = new Blob([myImage], { type: "image/jpeg"});
            fd.append('file', blob, thisFile.file);
            $.ajax({
        			type: 'POST',
        			url: url,
              enctype: 'multipart/form-data',
              contentType: false,
              dataType: false,
              processData: false,
        			data: fd,
        		})
        		.done (function(data){
              self._docService.update(thisFile.id, {image:data[0]._id}, {}).subscribe(function(page){
                i++;
                self.message+="<br>Image file "+thisFile.file+" added for page "+thisFile.page+" ("+i+" of "+self.fileNames.length+")";
                cb2(null);
              })
        		})
        		.fail (function(data){
        			cb2({message:"error processing "+thisFile.file})
        		});
          });
       }, function (err) {
         if (err) console.error(err.message);
          self.message+="<br>"+i+" files written.";
          self.fileNames=[];
          self.zip=null;
        }
      );
   }
 },
  closeModalAP: function() {
    $('#manageModal').modal('hide');
    this.zip=null;
    this.fileNames=[];
  }
});



module.exports = AddZipComponent;
