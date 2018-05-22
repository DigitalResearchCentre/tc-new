var CommunityService = require('./services/community')
  , UIService = require('./services/ui')
  , DocService = require('./services/doc')
  , RestService = require('./services/rest')
  , Router = ng.router.Router
  , config = require('./config')
  , async = require('async')
  , sortBy = require('sort-array')
  , $ = require('jquery')
;

var TranscriberHistoryComponent = ng.core.Component({
  selector: 'tc-managemodal-transcriber-history',
  templateUrl: '/app/transcriberhistory.html',
  styleUrls: ['/app/community/view.css'],
  directives: [
    require('./directives/modaldraggable')
  ],
  inputs: [
    'community', 'userid', 'username'
  ],
/*  queries: {
    viewer: new ng.core.ViewChild(Viewer),
  }, */
}).Class({
  constructor: [Router, CommunityService, UIService, DocService, RestService, function(
    router, communityService, uiService, docService, restService
  ) {
//    console.log('community view');
    var self=this;
    this._uiService = uiService;
    this._communityService = communityService;
    this._docService = docService;
    this._restService = restService
    this.state = uiService.state;
    this._router = router;
    this.periods=[];
    $('#manageModal').width("800px");
    $('#manageModal').height("750px");
    }],
  ngOnChanges: function(){
    var self=this;
    this.periods=[];
    this.message="Gathering information about the transcriptions. This may take a few moments."
    if (!this.state.community.attrs.created) {
      if (this.state.community.attrs.abbr=="CTP2") var time=new Date("2012-01-01");
      else if (this.state.community.attrs.abbr=="JDDP") var time=new Date("2013-01-01");
      else var time=new Date("2018-01-01");
    } else var time=new Date(this.state.community.attrs.created);
     var secs=time.getTime();
    $.get(config.BACKEND_URL+'getTranscriberRecord/?userId='+this.userid+'&since='+secs+'&community='+this.community.attrs.abbr+'&period=default', function(res) {
      self.message="";
      self.periods=sortPeriods(res);
    });
  },
  formatDate: function(rawdate) {
    var date = new Date(rawdate);
    var months=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    return date.getDate()+" "+months[date.getMonth()]+" "+date.getFullYear();
//    return date.toDateString()
  },
  submit: function(period) {
    var self=this;
    this.message="Gathering information about the transcriptions. This may take a few moments."
    if (this.community.attrs.created) var time=new Date(this.community.attrs.created);
    else time=new Date("2018-03-01");
    var secs=time.getTime();
    $.get(config.BACKEND_URL+'getTranscriberRecord/?userId='+this.userid+'&since='+secs+'&community='+this.community.attrs.abbr+'&period='+period, function(res) {
      self.message="";
      self.periods=sortPeriods(res);
    });
  },
  showPage: function(community, document, page) {
    var instruction = this._router.generate([
      'Community', {id: community.getId(), route: 'view', document:document, page:page}
    ]);
    window.location=instruction.toRootUrl();
  },
  toggleInstance: function(instance) {
    instance.expand = !instance.expand;
  },
  closeModalAP: function() {
    $('#manageModal').modal('hide');
  }
});

function sortPeriods(periods) {
  for (var i=0; i<periods.length; i++) {
    if (periods[i].assarray) {adjustNumbers((periods[i].assarray)); sortBy(periods[i].assarray, ['docName', 'sortable']);}
    if (periods[i].inprogarray) {adjustNumbers((periods[i].inprogarray)); sortBy(periods[i].inprogarray, ['docName', 'sortable']);}
    if (periods[i].submarray) {adjustNumbers((periods[i].submarray)); sortBy(periods[i].submarray, ['docName', 'sortable']);}
    if (periods[i].commarray) {adjustNumbers((periods[i].commarray)); sortBy(periods[i].commarray, ['docName', 'sortable']);}
    if (periods[i].apparray) {adjustNumbers((periods[i].apparray)); sortBy(periods[i].apparray, ['docName', 'sortable']);}
  }
  return periods;
}

function adjustNumbers(sourceArray) {
  for (var i=0; i<sourceArray.length; i++) {
    var nlen=0;
    var name=sourceArray[i].name[0];
    if (!isNaN(name[0])) {
      var nlen=0, newName=name;
      while (!isNaN(name[nlen])) nlen++;
      nlen=6-nlen;
      while (nlen> 0 ) {newName = "0" + newName; nlen--}
      sourceArray[i].sortable=newName;
    } else sourceArray[i].sortable=name;
  }
}

module.exports = TranscriberHistoryComponent;
