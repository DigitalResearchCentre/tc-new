var $ = require('jquery')
  , async = require('async')
  , UIService = require('./services/ui')
  , DocService = require('./services/doc')
  , ElementRef = ng.core.ElementRef
  , config = require('./config')
  , JSZip = require('jszip')
  , async = require('async')
;

var AddIIIFComponent = ng.core.Component({
  selector: 'tc-managemodal-addiiif',
  templateUrl: '/app/addiiif.html',
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
    this.pageName="";
    this.state = uiService.state;
    this.isDocTranscript=true;  //reset later if false
    this.showReorder=false;
    this.doc={iiif:""};
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
    $('#manageModal').height("390px");
    if (config.env !== 'production') {
      url += '?env=' + config.env;
    }
    this.message=""
  },
  submit: function() {
    var docService = this._docService
      , community = this.state.community
      , self=this
      ;
    if (this.doc.iiif.trim() === "" ) {
      this.message="A IIIF manifest address must be provided";
      addToHeight(100);
      return;
    }
    if (!this.doc.iiif.trim().startsWith("http://") && !this.doc.iiif.trim().startsWith("https://")) {
      this.message='"'+this.doc.iiif+'" is not a web address';
      addToHeight(100);
      return;
    }
    this.message="";
    addToHeight(100);
    this.success='Valid web address found. Testing if "'+self.doc.iiif+'" is a valid IIIF manifest'
    $.get('http://iiif.io/api/presentation/validator/service/validate?format=json&version=2.0&url='+this.doc.iiif, function (data, status) {
      if (data.error.toLowerCase()=="none") {
        self.success='"'+self.doc.iiif+'" appears to be a valid IIIF manifest. Now reading it...'
        $.get(self.doc.iiif, function(myiiif, status) {
          if (status=="success") {
            //two choices. document has pages, in which case we try and match them. Or, no pages: then add every page in the IIIF manifest
            var matchedLabels=[];
            if (self.document.attrs.children.length==0) {//no children!
              $('#manageModal').height("490px");
              self.success='"'+self.doc.iiif+'" successfully read. '+myiiif.sequences[0].canvases.length+' pages found. Document "'+self.document.attrs.name+'" has no pages; now adding pages from the IIIIF document.'
              var pages=[];
              for (var i=0; i<myiiif.sequences[0].canvases.length; i++) {
                var canvas=myiiif.sequences[0].canvases[i];
                pages.push({name: canvas.label, label:"pb", image: canvas.images[0].resource.service['@id'], community: self.state.community.attrs.abbr});
              }
              $.ajax({
                url:config.BACKEND_URL+'saveManyPagesDoc?document='+self.document._id+'&community='+self.state.community.attrs.abbr,
                type: 'POST',
                data: JSON.stringify(pages),
                accepts: 'application/json',
                contentType: 'application/json; charset=utf-8',
                dataType: 'json'
              })
               .done(function(data){
                 self.success=data.npages+' pages written in document "'+self.document.attrs.name+'" ('+myiiif.label+'). Processing finished.';
                 self.uiService.docService$.emit({
                   type: 'refreshDocument',
                   payload: data.document,
                 });
               })
               .fail(function( jqXHR, textStatus, errorThrown) {
                alert( "error" + errorThrown );
               });
            } else {
              $('#manageModal').height("490px");
              self.success='"'+self.doc.iiif+'" successfully read. '+myiiif.sequences[0].canvases.length+' pages found. Now matching the IIIF labels with <pb> attributes in "'+self.document.attrs.name+'" .'
              //match it all here
              //try and match facs attributes first
              self.success="Matches found for:"
              for (var i=0; i<myiiif.sequences[0].canvases.length; i++) {
                var canvas=myiiif.sequences[0].canvases[i];
                var canvaslabel=canvas.label;
                var facsDoc=self.document.attrs.children.filter(function (obj){return (obj.attrs.facs && obj.attrs.facs.toLowerCase()== canvaslabel.toLowerCase());});
                if (facsDoc[0])  {
                  canvas.matched=true;
                  for (var j=0; j<facsDoc.length; j++) {
                    self.success+=" "+canvaslabel;
                    matchedLabels.push({_id: facsDoc[j].attrs._id, image: canvas.images[0].resource.service['@id'], name: canvaslabel});
                  }
                } else {  //look in pb elements
                  var nameDoc=self.document.attrs.children.filter(function (obj){return (obj.attrs.facs && obj.attrs.name.toLowerCase()== canvaslabel.toLowerCase());});
                  if (nameDoc[0])  {
                    canvas.matched=true;
                    for (var j=0; j<nameDoc.length; j++) {
                      self.success+=" "+canvaslabel;
                      matchedLabels.push({_id: nameDoc[j].attrs._id, image: canvas.images[0].resource.service['@id'], name: canvaslabel});
                    }
                  }
                }
              }
              self.success+=": "+matchedLabels.length+" IIIF canvases matched"
              var unmatched=[];
              var unmatchedString="";
              for (var k=0; k<myiiif.sequences[0].canvases.length; k++) {
                var canvas=myiiif.sequences[0].canvases[k];
                if (!canvas.matched) {
                    unmatched.push({label: canvas.label});
                    unmatchedString+=" "+canvas.label;
                }
              }
              self.message+=unmatched.length+" IIIF labels not matched:"+unmatchedString+". Processing finished";
              addToHeight(100);
              //write them to the database
              $.ajax({
                url:config.BACKEND_URL+'saveIIIFDoc?document='+self.document._id+'&community='+self.state.community.attrs.abbr,
                type: 'POST',
                data: JSON.stringify(matchedLabels),
                accepts: 'application/json',
                contentType: 'application/json; charset=utf-8',
                dataType: 'json'
              })
              .done(function(data){
                self.success=data.npages+' pages written in document "'+self.document.attrs.name+'" ('+myiiif.label+'). Processing finished.';
                self.uiService.docService$.emit({
                  type: 'refreshDocument',
                  payload: data.document,
                });
              })
              .fail(function( jqXHR, textStatus, errorThrown) {
               alert( "error" + errorThrown );
              });
            }
          } else {
            self.success="";
            self.message='Although "'+self.doc.iiif+'" seems to be a valid IIIF manifest, something went wrong when reading it.';
          }
        });
      } else {
        self.success="";
        $('#manageModal').height("490px");
        self.message='"'+self.doc.iiif+'" does not seem to be a valid IIIF manifest. Test it against "http://iiif.io/api/presentation/validator/service/".';
      }
    });
 },
  closeModalAP: function() {
    $('#manageModal').modal('hide');
    this.zip=null;
    this.fileNames=[];
    this.unmatchedFileNames=[];
    this.showReorder=false;
    this.message=this.success="";
    $('#manageModal').height("360px");
  }
});

function addToHeight(what){
  var heightNow=$('#manageModal').height();
  $('#manageModal').height(heightNow+what+"px");
}


module.exports = AddIIIFComponent;
