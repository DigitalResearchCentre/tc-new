var CommunityService = require('./community.service');



var EditCommunityComponent = ng.core.Component({
  selector: 'tc-edit-community',
  templateUrl: 'community/manage/tmpl/edit-community.html',
  inputs: [
    'community',
  ],
}).Class({
  constructor: [CommunityService, function(communityService) {
    this._communityService = communityService;
  }],
  ngOnInit: function() {
    var community = this.community;
    if (!community) {
      this.community = community = this._communityService.create({
        public: false,
        name: "",
        abbr: "",
        longName: "",
        description: "",
        accept: false,
        autoaccept: false,
        alldolead: false,
        haspicture: false,
        image: false,
      });
    }
    this.message="";
    this.isCreate=true;
  },
  submit: function() {
    this.message=checkCommunity(this.community);
      if (this.message!="") {
        this._communityService.save(this.community);
  //      $location.path('app/new-community')
      }
    }
/*      if (this.message=="") {
          community.$save(function() {
            $scope.isCreate=true;
            //if this is the first community -- send to the main screen, set to add pages
            //ie: only one membership, and a leader of that!
            if ($scope.$parent.$parent.userStatus=="1") {
              $scope.$parent.$parent.community=community;
              $scope.$parent.$parent.userStatus=="2";
            }
            $location.path('/community/' + community._id + '/home');
          });
        }*/
});

module.exports = EditCommunityComponent;
