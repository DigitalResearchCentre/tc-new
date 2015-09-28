var communityHeader = function() {

  
  return {
    restrict: 'A',
    scope: {
      community: '=',
      tab: '=',
    },
    templateUrl: './community/tmpl/header.html',
  };
};
communityHeader.$inject = [];

module.exports = communityHeader;
