var $ = require('jquery')
  , CommunityService = require('./services/community')
  , UpdateDbService = require('./services/updatedb')
;

var EditCollationComponent = ng.core.Component({
  selector: 'tc-managemodal-editcollation',
  templateUrl: '/app/editcollation.html',
  inputs : ['community', 'action'],
  directives: [
    require('./directives/modaldraggable')
  ],
}).Class({
  constructor: [CommunityService, function(communityService) {
//    var Doc = TCService.Doc, doc = new Doc()
    this._communityService = communityService;
    this.documents=this._communityService._docService.state.community.attrs.documents;
    this.witsdone=false;
    $('#manageModal').width("300px");
    $('#manageModal').height("100px");
    }],
  closeModalCE: function() {
    this.message=this.success="";
    $('#MMADdiv').css("margin-top", "30px");
    $('#MMADbutton').css("margin-top", "20px");
    $('#manageModal').modal('hide');
    this.witsdone=false;
  },
  ngOnChanges: function() {
//    this.communi
    this.message="";
    this.success="";
    $('#manageModal').width("300px");
    $('#manageModal').height("610px");
    var witnesses=this._communityService._docService.state.community.attrs.ceconfig.witnesses;
    if (this.action=="chooseBase") {
      this.base=this._communityService._docService.state.community.attrs.ceconfig.base_text;
      this.header="Choose Base Text for Collation";
    } else if (this.action=="chooseWitnesses") {
      this.header="Choose Witnesses for Collation";
    }
  },
 ngAfterViewChecked: function (){
    var witnesses=this._communityService._docService.state.community.attrs.ceconfig.witnesses;
    if (this.action=="chooseWitnesses" && !this.witsdone) {
      if (witnesses.length==0)  $('input').prop( "checked", true );
      else {
          $('input').prop( "checked", false );
          for (var i = 0; i < witnesses.length; i++) {
            var choice="#"+witnesses[i];
            $(choice).prop( "checked", true );
          }
      }
      this.witsdone=true;
    }
  },
  submit: function(){
      var self=this;
      if (this.action=='chooseBase') {
        var jsoncall='[{"abbr":"'+this._communityService._docService.state.community.attrs.abbr+'"},{"$set":{"ceconfig.base_text":"'+this.base+'"}}]';
          UpdateDbService("Community", jsoncall, function(result){
          if (result=="success") {
            self.message="";
            self._communityService._docService.state.community.attrs.ceconfig.base_text=self.base;
            self.success='"'+self.base+'" chosen as the base text.';
          }
          else self.message="The save failed. Maybe you have lost your internet connection.";
         });
      } else {
        //make an array of all the input values
        var documents=this._communityService._docService.state.community.attrs.documents;
        var witnesses=[];
        var cewitnesses=[];
        for (var i = 0; i < documents.length; i++) {
          var choice="#"+documents[i].attrs.name;
          if ($(choice).prop("checked")) {
            witnesses.push('"'+documents[i].attrs.name+'"');
            cewitnesses.push(documents[i].attrs.name);
          }
        }
        if (witnesses.length<2) {
          this.message="You must select at least two witnesses for collation.";
          return;
        }
        var baseChosen=witnesses.filter(function (obj){return obj == '"'+self._communityService._docService.state.community.attrs.ceconfig.base_text+'"'})[0];
        if (!baseChosen) {
          this.message="The base text \""+this._communityService._docService.state.community.attrs.ceconfig.base_text+"\" must be among those selected for collation.";
          return;
        }
        var jsoncall='[{"abbr":"'+this._communityService._docService.state.community.attrs.abbr+'"},{"$set":{"ceconfig.witnesses":['+witnesses+']}}]';
        UpdateDbService("Community", jsoncall, function(result){
          if (result=="success") {
            self.message="";
            self.success=witnesses.length+' witnesses chosen for collation and saved.';
            self._communityService._docService.state.community.attrs.ceconfig.witnesses=cewitnesses;
          }
          else self.message="The save failed. Maybe you have lost your internet connection.";
        });
    //    console.log(witnesses);
      }
  },
  selectAll: function (document) {
    $('input').prop( "checked", true );
  },
  clearAll: function (document) {
    $('input').prop( "checked", false );
  },
  chooseBase: function (document) {
    this.base=document;
    var selectBase="#"+document;
    $(selectBase).prop( "checked", true );
  },
});


module.exports = EditCollationComponent;
