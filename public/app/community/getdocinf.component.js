var CommunityService = require('../services/community')
  , UIService = require('../services/ui')
  , RESTService = require('../services/rest')
  , DocService = require('../services/doc')
;

var GetDocInfComponent = ng.core.Component({
  selector: 'tc-community-getdocinf',
  templateUrl: '/app/community/getdocinf.html',
  directives: [
    require('../directives/modaldraggable'),
    require('../directives/filereader'),
  ],
  inputs: [
    'community', 'document',
  ],
}).Class({
  constructor: [
    CommunityService, UIService, RESTService, DocService, function(
      communityService, uiService, restService, docService) {
    var self=this;
    this._docService = docService;
    this._communityService = communityService;
    this._uiService = uiService;
    this.restService= restService;
    this.message=this.success="";
    this.state = uiService.state;
    $('#manageModal').width("600px");
    $('#manageModal').height("700px");
  }],
  ngOnChanges: function(){
    var self=this;
    var docService = this._docService
    docService.refreshDocument(this.document).subscribe(function(doc) {
      if (!doc.attrs.docinf) {
        //get default info out of teiheader
        var myXMLDOM = new DOMParser().parseFromString(doc.attrs.teiHeader, "text/xml");
        var x = myXMLDOM.getElementsByTagName("msDesc")[0];
        if (x) {
          var mstitle=x.getElementsByTagName("msName")[0].innerHTML;
          var msidno=x.getElementsByTagName("idno")[0].innerHTML;
          var mssettlement=x.getElementsByTagName("settlement")[0].innerHTML;
          var msrepository=x.getElementsByTagName("repository")[0].innerHTML;
          self.description="<h4 style='text-align:center'>"+mstitle+"</h4><p style='text-align:center'>"+mssettlement+", "+msrepository+" "+msidno+"</p>"
        } else {
          var title = myXMLDOM.getElementsByTagName("titleStmt")[0].getElementsByTagName("title")[0].innerHTML;
            self.description="<h4 style='text-align:center'>"+title+"</h4>";
        }
      }
      else self.description=doc.attrs.docinf;
      self.title="TEI Header for "+doc.attrs.name+":";
    })
  },
  ngOnInit: function() {
    var self=this;
    this.description="";
    if (this.state.authUser._id) {
      for (var i=0; i<this.state.authUser.attrs.memberships.length; i++) {
        if (this.state.authUser.attrs.memberships[i].community.attrs._id==this.state.community.attrs._id)
          this.role=this.state.authUser.attrs.memberships[i].role;
      }
    } else this.role="NONE";
    if (this.role!="LEADER"&&this.role!="CREATOR") $('#manageModal').height("625px");
  },
  closeModalUPLC: function() {
    this.message=this.success="";
    $('#manageModal').modal('hide');
  },
  submit: function(doc) {
    //is there a community with this name?
    var self=this;
    this.message=this.success="";
    this._docService.update(doc.getId(), {docinf: this.description,}, {}).subscribe(function(mydoc){
      self.success="Description saved."
    });
  },
});

module.exports = GetDocInfComponent;
