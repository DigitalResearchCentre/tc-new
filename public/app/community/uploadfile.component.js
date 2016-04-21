var CommunityService = require('../services/community')
  , UIService = require('../services/ui')
  , RESTService = require('../services/rest')
;


var UploadFileComponent = ng.core.Component({
  selector: 'tc-uploadfile-community',
  templateUrl: '/app/community/uploadfile.html',
  directives: [
    require('../directives/modaldraggable'),
    require('../directives/filereader'),
  ],
  inputs: [
    'community','filetype',
  ],
}).Class({
  constructor: [
    CommunityService, UIService, RESTService, function(
      communityService, uiService, restService) {
    var self=this;
    this._communityService = communityService;
    this._uiService = uiService;
    this.restService= restService;
    $('#manageModal').width("400px");
    $('#manageModal').height("400px");
  }],
  ngOnInit: function() {
    var self=this;
    this.initEdit(this.community);
    if (this.filetype=="css") {
        if (!this.edit.css || this.edit.css=="") {
          self.restService.http.get('/app/directives/default.css').subscribe(function(cssfile) {
            self.text=cssfile._body;});
        }
    }
  },
  initEdit: function(community) {
      this.edit = _.clone(community.toJSON());
      this.community = community;
      this.origname=community.attrs.name;
  },
  closeModalUPLC: function() {
    $('#manageModal').modal('hide');
  },
  filechange: function(filecontent) {
    this.text = filecontent;
  },
 submit: function() {
    //is there a community with this name?
    this.message=this.success="";
    var self=this;
    this._communityService.save(this.edit).subscribe(function(community) {
      self.success='Community "'+self.edit.name+'" saved';
      self.initEdit(community);
      self._uiService.setCommunity(community);
      document.getElementById("ECSuccess").scrollIntoView(true);
    }, function(err) {
      self.message = err.message;
    });
  },
});

module.exports = UploadFileComponent;
