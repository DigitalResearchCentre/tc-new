var $ = require('jquery');
var UIService = require('./services/ui')
  , DocService = require('./services/doc')
  , CommunityService = require('./services/community')
  , config = require('./config')
  , Router = ng.router.Router
  , async = require('async')
;

var CreateDefaultTranscriptsComponent = ng.core.Component({
  selector: 'tc-managemodal-create-defaulttranscripts',
  templateUrl: '/app/createdefaulttranscripts.html',
  directives: [
    require('./directives/modaldraggable'),
    require('./directives/filereader')
  ],
}).Class({
  constructor: [
    Router, CommunityService, UIService, DocService, function(
      router, communityService, uiService, docService
    ) {
//    var Doc = TCService.Doc, doc = new Doc();
    this._router = router;
    this.doc = {name:""};
    $('#manageModal').width("400px");
    $('#manageModal').height("600px");
    this.message="";
    this.success="";
    this.uiService = uiService;
    this.docService = docService;
    this.users=[];
    this.cAbbrev="";
    this.docName="";
    this.state=uiService.state;
    }],
  ngOnInit: function() {
    var self = this;
  },
  createDefaultTranscripts: function(){
    var self=this;
    if (this.docName==""||this.cAbbrev=="") {
      this.message="You must specify a document and community";
      return;
    }
    if (this.uiService.state.community.attrs.abbr!=this.cAbbrev) {
      this.message="You must select community "+this.cAbbrev;
      return;
    }
    var thisdoc=this.uiService.state.community.attrs.documents.filter(function (obj){return (obj.attrs.name== self.docName);})[0];
    if (!thisdoc) {
      this.message="Document "+self.docName+" is not in community "+self.cAbbrev;
      return;
    }
    self.docService.refreshDocument(thisdoc).subscribe(function(mydoc) {
      self.success+=" Now making default revisions for "+mydoc.attrs.children.length+" pages: "
      var counter=0;
      async.mapSeries(mydoc.attrs.children, function(page, callback){
        counter++;
        if (counter%5==0) self.success+=counter+" ";
        self.docService.getTextTree(page).subscribe(function(teiRoot) {
          var isDefault=false;
          var dbRevision = self.json2xml(prettyTei(teiRoot));
            self.docService.addRevision({
            doc: page.getId(),
            text: dbRevision,
            user: self.state.authUser._id,
            community: self.state.community.attrs.abbr,
            committed: new Date(),
            status: 'COMMITTED',
          }).subscribe(function(revision){
            callback(null);
          })
        })
      }, function(err){
        self.success+="Default page revisions written."
      });
    });
    //need to get full tei info for page breaks
  },
  json2xml: function(data) {
    return this.docService.json2xml(data);
  },
  closeModalVM: function() {
    this.message=this.success=this.cAbbrev="";
    $('#MMADdiv').css("margin-top", "30px");
    $('#MMADbutton').css("margin-top", "20px");
    $('#manageModal').modal('hide');
  },
});

function prettyTei(teiRoot) {
  _.dfs([teiRoot], function(el) {
    var children = [];
    _.each(el.children, function(childEl) {
      if (['pb', 'cb', 'lb', 'div','body', '/div'].indexOf(childEl.name) !== -1) {
        children.push({
          name: '#text',
          text: '\n',
        });
      }
      children.push(childEl);
    });
    el.children = children;
  });
  return teiRoot;
}


module.exports = CreateDefaultTranscriptsComponent;
