var CommunityService = require('./services/community')
  , UIService = require('./services/ui')
  , DocService = require('./services/doc')
  , RestService = require('./services/rest')
  , config = require('./config')
  , async = require('async')
  , $ = require('jquery')
;

var AssignPagesComponent = ng.core.Component({
  selector: 'tc-managemodal-assign-pages',
  templateUrl: '/app/assignpages.html',
  styleUrls: ['/app/community/view.css'],
  directives: [
    require('./directives/modaldraggable')
  ],
  inputs: [
    'community', 'user', 'memberId', 'source'
  ],
/*  queries: {
    viewer: new ng.core.ViewChild(Viewer),
  }, */
}).Class({
  constructor: [CommunityService, UIService, DocService, RestService, function(
    communityService, uiService, docService, restService
  ) {
//    console.log('community view');
    var self=this;
    this._uiService = uiService;
    this._communityService = communityService;
    this._docService = docService;
    this._restService = restService
    this.state = uiService.state;
    this.success="";
    $('#manageModal').width("541px");
    $('#manageModal').height("600px");
  }],
  ngOnInit: function(){
    this.community.attrs.documents[0].expand=false;
  },
  toggleDoc: function(doc) {
    doc.expand = !doc.expand;
    if (doc.expand) {
      this._docService.selectDocument(doc);
    }
  },
  submit: function() {
    //got get all the boxes checked at write them to the document, page by page
    //we will get all the pages together then write them to the database
    var selected=[];
    var self=this;
    for (var i=0; i<this.community.attrs.documents.length; i++) {
      for (var j=0; j<this.community.attrs.documents[i].attrs.children.length; j++) {
        if (this.community.attrs.documents[i].attrs.children[j].selected) {
          selected.push({pageId:this.community.attrs.documents[i].attrs.children[j]._id, record:{userId:this.user._id, name: this.user.local.name, status: "ASSIGNED", memberId:this.memberId}});
        }
      }
    }
    $.ajax({
      url: config.BACKEND_URL+'saveAssignPages',
      type: 'POST',
      data:  JSON.stringify({selected: selected}),
      accepts: 'application/json',
      contentType: 'application/json; charset=utf-8',
      dataType: 'json'
    }).done(function( data ) {
      self.success="Page assignments saved";
      for (var i=0; i<self.source.members.length; i++){
        if (self.source.members[i]._id==self.memberId)
          self.source.members[i].assigned+=selected.length;
      }
      document.getElementById("APSuccess").scrollIntoView(true);
       })
    .fail(function( jqXHR, textStatus, errorThrown) {
       alert( "error" + errorThrown );
   });
    //right. Now send this infor for each page to the database
  },
  closeModalAP: function() {
    this.message=this.success="";
    $('#manageModal').modal('hide');
  }
});

module.exports = AssignPagesComponent;
