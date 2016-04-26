var AuthService = require('./services/auth');
var UIService = require('./services/auth');

describe('hello', function() {
  /*
  var as = new AuthService(new UIService());
  console.log(as);
  it('test', function() {
    expect('a').toEqual('a');
  });
  */
});
var requireAll = (requireContext) => { 
  requireContext.keys().map(requireContext); 
};


