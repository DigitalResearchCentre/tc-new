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
    'community','filetype', 'text',
  ],
}).Class({
  constructor: [
    CommunityService, UIService, RESTService, function(
      communityService, uiService, restService) {
    var self=this;
    this._communityService = communityService;
    this._uiService = uiService;
    this.restService= restService;
    this.message=this.success="";
    $('#manageModal').width("480px");
    $('#manageModal').height("485px");
  }],
  ngOnInit: function() {
    var self=this;
    this.initEdit(this.community);
  },
  initEdit: function(community) {
      this.edit = _.clone(community.toJSON());
      this.community = community;
  },
  closeModalUPLC: function() {
    this.message=this.success="";
    $('#manageModal').modal('hide');
  },
 filechange: function(filecontent) {
    this.text = filecontent;
  },
 default: function() {
   var self=this;
   if (this.filetype=='css') {
     self.restService.http.get('/app/directives/default.css').subscribe(function(cssfile) {self.text=cssfile._body;});
   }
   if (this.filetype=='js') {
     self.restService.http.get('/app/directives/default.js').subscribe(function(jsfile) {self.text=jsfile._body;});
   }
   if (this.filetype=='dtd') {
     self.restService.http.get('/app/directives/default.dtd').subscribe(function(dtdfile) {self.text=dtdfile._body;});
   }
 },
 submit: function() {
    //is there a community with this name?
    this.message=this.success="";
    if (this.filetype=="css") this.edit.css=this.text;
    if (this.filetype=="js") this.edit.js=this.text;
    if (this.filetype=="dtd") this.edit.dtd=this.text;
    var self=this;
    this._communityService.save(this.edit).subscribe(function(community) {
      self.success=self.filetype+' document for community "'+self.edit.name+'" saved';
      self.initEdit(community);
      self._uiService.setCommunity(community);
      document.getElementById("ECSuccess").scrollIntoView(true);
    }, function(err) {
      self.message = err.message;
      document.getElementById("ECMessage").scrollIntoView(true);
    });
  },
});

module.exports = UploadFileComponent;
