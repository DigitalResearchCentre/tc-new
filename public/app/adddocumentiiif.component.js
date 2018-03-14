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

var AddDocumentIIIF = ng.core.Component({
  selector: 'tc-managemodal-adddocument-IIIF',
  templateUrl: '/app/adddocumentiiif.html',
  directives: [
    require('./directives/modaldraggable'),
    require('./directives/modalresizable'),
  ],
  inputs: [
    'community',
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
    this.doc = {name:"", label: 'text', iiif:""};
    $('#manageModal').width("580px");
    $('#manageModal').height("330px");
    }],
  ngOnInit: function() {
  },
  ngOnChanges: function() {
  },
  submit: function() {
    var self = this
      , uiService = this.uiService
      , docService = this._docService
      , community = this.state.community
    ;
    if (this.doc.name === undefined || this.doc.name.trim() === "" ) {
      this.message = 'The document must have a name';
      $('#MMADdiv').css("margin-top", "0px");
      $('#MMADbutton').css("margin-top", "10px");
    } else if (self.alreadyDoc(community, self.doc.name.trim())){
        self.message='Document "'+self.doc.name+' "already exists';
        return;
    } else if (!self.validIIIFLink(self)) return;
  },
  validIIIFLink: function(self) {
    var docService = self._docService
    , community = self.state.community;
    if (self.doc.iiif.trim() === "" ) {
      self.message="A IIIF manifest address must be provided";
      return(false);
    }
    if (!self.doc.iiif.trim().startsWith("http://") && !self.doc.iiif.trim().startsWith("https://")) {
      self.message='"'+self.doc.iiif+'" is not a web address';
      return(false);
    }  //ok. lets get this and see what we get
    self.message="";
    self.success='Valid web address found. Now reading "'+self.doc.iiif;
  //  $.get('http://iiif.io/api/presentation/validator/service/validate?format=json&version=2.0&url='+self.doc.iiif, function (data, status) {
  //    if (data.error.toLowerCase()=="none") {
  //      self.success='"'+self.doc.iiif+'" appears to be a valid IIIF manifest. Now reading it...'
        $.get(self.doc.iiif, function(myiiif, status) {
          if (status=="success") {
            self.success='"'+self.doc.iiif+'" successfully read. '+myiiif.sequences[0].canvases.length+' pages found. Now creating a new document "'+self.doc.name+'" with these pages.'
            //create the document
            var now = new Date();
            var months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
            var days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
            var teiHeader='<teiHeader>\r<fileDesc>\r<titleStmt>\r<title>A transcription of document '+self.doc.name+'\r</title>\r</titleStmt>\r<publicationStmt>\r<p>Prepared within the Textual Communities system</p>\r</publicationStmt>\r<sourceDesc>\r<p>Created as a new document within community '+community.attrs.abbr+' from a IIIF manifest at '+self.doc.iiif+' ('  +')</p>\r</sourceDesc>\r</fileDesc>\r<revisionDesc>\r<change when="'+now+'">Created on '+days[now.getDay()]+' '+now.getDate()+' '+months[now.getMonth()]+' '+now.getFullYear()+' by '+state.authUser.attrs.local.name+' ('+state.authUser.attrs.local.email+')</change>\r</revisionDesc>\r</teiHeader>';
            self.doc.teiHeader=teiHeader;
            self.doc.community=community.attrs.abbr;
            docService.commit({
              doc:self.doc,
              }, {
              community: community.getId()
              }).subscribe(function(doc) {
                //trying to add 500+ pages runs into queuing problems. So turn it into a single call to the database
                var pages=[];
                for (var i=0; i<myiiif.sequences[0].canvases.length; i++) {
                  var canvas=myiiif.sequences[0].canvases[i];
                  pages.push({name: canvas.label, label:"pb", image: canvas.images[0].resource.service['@id'], community: self.state.community.attrs.abbr});
                }
                $.ajax({
                  url:config.BACKEND_URL+'saveManyPagesDoc?document='+self.state.lastDocCreated._id+'&community='+self.state.community.attrs.abbr,
                  type: 'POST',
                  data: JSON.stringify(pages),
                  accepts: 'application/json',
                  contentType: 'application/json; charset=utf-8',
                  dataType: 'json'
                })
                 .done(function(data){
                   self.success=data.npages+' pages written in document "'+self.doc.name+'" ('+myiiif.label+'). Processing finished.';
                   self.uiService.docService$.emit({
                     type: 'refreshDocument',
                     payload: data.document,
                   });
                 })
                 .fail(function( jqXHR, textStatus, errorThrown) {
                  alert( "error" + errorThrown );
                 });
              });
            } else {
              self.success="";
              self.message='Although "'+self.doc.iiif+'" seems to be a valid IIIF manifest, something went wrong when reading it.';
            }
          });
  //      }  else {
  //        self.success="";
//          self.message='"'+self.doc.iiif+'" does not seem to be a valid IIIF manifest. Test it against "http://iiif.io/api/presentation/validator/service/".';
//        }
//    });
  },
  alreadyDoc: function(community, docname) {
    if (community.attrs.documents.length>0) {
      var matcheddoc=community.attrs.documents.filter(function (obj){return obj.attrs.name === docname;})[0];
      if (matcheddoc) return true;
      else return false;
    } else {
      return false;
    }
  },
  closeModalAD: function() {
    this.message = this.success = this.doc.name = "";
    $('#manageModal').modal('hide');
  }
});



module.exports = AddDocumentIIIF;
