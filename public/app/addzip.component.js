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
    this.fileNames=[];   //holds info for files which match n or facs on existing pages
    this.unmatchedFileNames=[]; //holds info for files which do not match n or facs on existing pages; used when adding images for empty document
    this.zip=null;
    this.context=this;
    this.pageName="";
    this.state = uiService.state;
    this.isDocTranscript=true;  //reset later if false
    this.hideLoad=true;
    this.showReorder=false;
    this.showFileChooser=true;
  }],
  ngOnInit: function() {
    var el = this._elementRef.nativeElement
      , $el = $(el)
      , self = this
      , url = config.IMAGE_UPLOAD_URL
      , $dropzone = $('.dropzone', $el)
    ;
    this.pageName = _.get(this.page, 'attrs.name');
    this.state.lastDocCreated = null;
    $('#manageModal').width("580px");
    $('#manageModal').height("575px");
    if (config.env !== 'production') {
      url += '?env=' + config.env;
    }
    this.message="<p style='text-align: left; margin-left:10px'>Zip files may only contain image files (jpg, tiff, png). \
        <br>If the document is empty: TC will use the image names to constuct a skeleton XML document.</p>\
        <p style='text-align: left; margin-left:10px'>If the document is not empty, TC will match the file names to page names (or facs attributes) in the document.</p>\
        <p>After choosing the zip file, wait!</p>"
  },
  filechange: function(zip) {
    var self=this;
    this.showReorder=false;
    var matchedFiles="";
    var unMatchedFiles="";
    self.zip=zip;
    var docService = this._docService
    //we need to be sure the document is fully loaded before we do this...
    self.message+="Starting processing now..."
    docService.refreshDocument(this.document).subscribe(function(doc) {
        for (var key in zip.files) {
         var myFile=zip.files[key];
         //make a catalog of the imaage files here; check for types .jpg .tif .png
         //check against doc for matches with facs and page names
         //if document has no pages -- add all these using the file names as page names
         if (!myFile.dir && myFile.name.indexOf("/.")==-1) {
           var fname=myFile.name.slice(myFile.name.lastIndexOf('/')+1);
           var pname=fname.split('.')[0];
           //there could be several facs docs!! same image shared in several places say
           var facsDoc=self.document.attrs.children.filter(function (obj){return (obj.attrs.facs && obj.attrs.facs.toLowerCase()== fname.toLowerCase());});
           if (facsDoc[0]) {
             for (var i=0; i<facsDoc.length; i++) {
               if (self.message!="") self.message+=", ";
               if (matchedFiles!="") matchedFiles+=", ";
               self.message+=facsDoc[i].attrs.name+ " ("+fname+")";
               matchedFiles+=facsDoc[i].attrs.name+ " ("+fname+")";
               self.fileNames.push({"key": key, "file":fname, "page": facsDoc[i].attrs.name, "id":facsDoc[i].attrs._id});
             }
           } else {
             var nameDoc=self.document.attrs.children.filter(function (obj){return (obj.attrs.name && obj.attrs.name[0].toLowerCase()== pname.toLowerCase());})[0];
             if (nameDoc) {
               if (matchedFiles!="") matchedFiles+=", ";
               if (self.message!="") self.message+=", ";
               matchedFiles+=nameDoc.attrs.name+ " ("+fname+")";
               self.message+=nameDoc.attrs.name+ " ("+fname+")";
               self.fileNames.push({"key": key, "file":fname, "page": nameDoc.attrs.name, "id":nameDoc.attrs._id});
             } else {  //did not match this page, ho ho
               if (unMatchedFiles!="") unMatchedFiles+=", ";
               if (self.message!="") self.message+=", ";
               unMatchedFiles+=fname;
               self.message+=fname+" (unmatched)";
               self.unmatchedFileNames.push({"key":key, "file":fname, "page": pname})
             }
           }
         }
      }
      self.message+="<br/>Processed the files."
      $.post(config.BACKEND_URL+'isDocTranscript?'+'docid='+self.document._id, function(res) {
        if (!res.isDocText) {
          //we have no text in this document
          self.isDocTranscript=false;
          var message="<p>This document has no text. TC will create a page for each image file in this zip file: "+unMatchedFiles+". </p><p>Click the <span style='background-color:#337ab7; color:white'>Load</span> button below to add these pages. (You can reorder the document's pages after they are added)</p>";
        } else {
          var message="<p>Click the <span style='background-color:#337ab7; color:white'>Load</span> button below to add these images.</p>";
          if (unMatchedFiles!="") message+="<p>These images do not match any page or facs attribute in this document: "+unMatchedFiles+". TC will ignore them.</p>";
        }
        self.message+=message;
        self.hideLoad=false;
        self.showFileChooser=false;
      });
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
      self.hideLoad=true;
      self.showFileChooser=false;
      var state=this.state;
      if (self.isDocTranscript) self.message="Commencing upload of files for "+self.fileNames.length+" pages to the server"
      else self.message="Commencing upload of "+self.unmatchedFileNames.length+" files to the server"
      var i=0;
      var url = config.IMAGE_UPLOAD_URL;
      if (config.env !== 'production') {
        url += '?env=' + config.env;
      }
      //do it in parallek async for matched files, ie document is not empty
      //do it in series async where document is empty
      //
      if (self.isDocTranscript) {
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
            self.message+="<br>Images for "+i+" pages written.";
            self.fileNames=[];
            self.zip=null;
          }
        );
      } else { //we are adding files to an empty document
        async.mapSeries(self.unmatchedFileNames, function(thisFile) {
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
              var options={};
    					if (self.document.attrs.children.length==0 && !state.lastDocCreated) options.parent=self.document;
    					else if (self.document.attrs.children.length>0 && !state.lastDocCreated) options.after=self.document.attrs.children[self.document.attrs.children.length];
    					else if (state.lastDocCreated) options.after=state.lastDocCreated;
              var myDoc={name: thisFile.page, image: data[0]._id, label: "pb", children:[], community: self.state.community.attrs.abbr}
              //this is different for files not matching any pages as always in empty documents
              self._docService.commit({doc: myDoc}, options).subscribe(function(page){
                i++;
                self.message+="<br>Image file "+thisFile.file+" added for page "+thisFile.page+" ("+i+" of "+self.unmatchedFileNames.length+")";
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
          self.unmatchedFileNames=[];
          //set up to show reorder and renumber button
          self.showReorder=true;
          self.zip=null;
        });
      }
   }
 },
 reorderDocument: function(doc) {
   this.uiService.manageModal$.emit({
     type:'reorder-document',
     document:doc,
   });
 },
  closeModalAP: function() {
    $('#manageModal').modal('hide');
    this.message="<p style='text-align: left; margin-left:10px'>Zip files may only contain image files (jpg, tiff, png). \
        <br>If the document is empty: TC will use the image names to constuct a skeleton XML document.</p>\
        <p style='text-align: left; margin-left:10px'>If the document is not empty, TC will match the file names to page names (or facs attributes) in the document.</p>"
    this.zip=null;
    this.fileNames=[];
    this.unmatchedFileNames=[];
    this.showReorder=false;
    this.hideLoad=true;
    this.showFileChooser=true;

  }
});



module.exports = AddZipComponent;
