var CommunityService = require('../services/community')
  , UIService = require('../services/ui')
  , DocService = require('../services/doc')
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
});

module.exports = ManageCommunityComponent;
