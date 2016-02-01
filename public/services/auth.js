auth.$inject = ['$http'];
function auth($http) {
  $http.get('/api/auth/', {
    data: {populate: JSON.stringify('memberships.community')},
  }).then(function(resp) {
    console.log(resp);
  }, function(resp) {
    console.log('error: ');
    console.log(resp);
  });

  return {
    isLoggedIn: function() {
      return true;
    }
  };
}

module.exports = auth;
