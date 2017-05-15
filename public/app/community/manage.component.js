var CommunityService = require('../services/community')
  , UIService = require('../services/ui')
  , DocService = require('../services/doc')
  , config = require('../config')
;

var ManageCommunityComponent = ng.core.Component({
  selector: 'tc-manage-community',
  templateUrl: '/app/community/manage.html',
  inputs: [ 'community',],
  directives: [
  ],
}).Class({
  constructor: [UIService, CommunityService, function(
    uiService, communityService
  ) {
    this._uiService = uiService;
    this._communityService = communityService;
    this.state = uiService.state;
  }],
  loadModal: function(which) {
    if (which=='uploadcss-community') this._uiService.manageModal$.emit({type: "uploadfile-community", community: this.community, filetype: "css"});
    else if (which=='uploadjs-community') this._uiService.manageModal$.emit({type: "uploadfile-community", community: this.community, filetype: "js"});
    else if (which=='uploaddtd-community') this._uiService.manageModal$.emit({type: "uploadfile-community", community: this.community, filetype: "dtd"});
    else if (which=='add-xml-document') this._uiService.manageModal$.emit({type: "add-xml-document", community: this.community});
    else if (which=='collationeditor-community') this._uiService.manageModal$.emit({type: "uploadfile-community", community: this.community, filetype:"json"});
    else if (which=='collationeditor-choosebase') this._uiService.manageModal$.emit({type: "choosebase-community", community: this.community});
    else if (which=='collationeditor-choosewitnesses') this._uiService.manageModal$.emit({type: "choosebase-choosewitnesses", community: this.community});
    else this._uiService.manageModal$.emit(which);
  },
  isLeader: function() {
    var state = this.state;
    return this._communityService.isLeader(state.community, state.authUser);
  },
  isCreator: function(){
    var state = this.state;
    return this._communityService.isCreator(state.community, state.authUser);
  },
  deleteAllDocs: function(){
    this._uiService.manageModal$.emit({
       type: 'confirm-message',
       page: "",
       docname: "",
       header: "Delete all documents from community "+this.community.attrs.name,
       warning: "Are you sure? This will delete all documents, transcripts, encodings, and images from this community. It cannot be undone.",
       action: 'deleteAllDocs'
     });
  },
});

module.exports = ManageCommunityComponent;
