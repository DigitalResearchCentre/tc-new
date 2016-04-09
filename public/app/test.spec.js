var AuthService = require('./services/auth');

describe('hello', function() {
  var as = new AuthService();
  console.log(as);
  it('test', function() {
    expect('a').toEqual('a');
  });
});
var requireAll = (requireContext) => { 
  requireContext.keys().map(requireContext); 
};


