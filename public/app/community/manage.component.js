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
  constructor: [UIService, function(uiService) {
    this._uiService = uiService;
  }],
  loadModal: function(which) {
    if (which=='uploadcss-community') this._uiService.manageModal$.emit({type: "uploadfile-community", community: this.community, filetype: "css"});
    else if (which=='uploadjs-community') this._uiService.manageModal$.emit({type: "uploadfile-community", community: this.community, filetype: "js"});
    else if (which=='uploaddtd-community') this._uiService.manageModal$.emit({type: "uploadfile-community", community: this.community, filetype: "dtd"});
    else if (which=='add-xml-document') this._uiService.manageModal$.emit({type: "add-xml-document", community: this.community});
    else this._uiService.manageModal$.emit(which);
  },
  isLeader: function() {
    var memberships = _.get(this._uiService.state, 'authUser.attrs.memberships');
    var community = _.get(this._uiService.state, 'community');
    return _.find(memberships, function (obj){
      return obj.community === community && obj.role === "LEADER";
    });
  },
  isCreator: function(){
    var memberships = _.get(this._uiService.state, 'authUser.attrs.memberships');
    var community = _.get(this._uiService.state, 'community');
    return _.find(memberships, function (obj){
      return obj.community === community && obj.role === "CREATOR";
    });
   },
});

module.exports = ManageCommunityComponent;
