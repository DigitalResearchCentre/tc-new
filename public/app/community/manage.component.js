var CommunityService = require('../services/community')
  , UIService = require('../ui.service')
  , DocService = require('../services/doc')
  , AuthService = require('../services/auth')
;

var ManageCommunityComponent = ng.core.Component({
  selector: 'tc-manage-community',
  templateUrl: '/app/community/manage.html',
  directives: [
  ],
}).Class({
  constructor: [UIService, AuthService,  function(uiService, authService) {
    this._uiService = uiService;
    this._authService = authService;
  }],
  loadModal: function(which) {
    this._uiService.manageModal$.emit(which);
  },
});

module.exports = ManageCommunityComponent;
