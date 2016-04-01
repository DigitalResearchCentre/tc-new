var _ = require('lodash');

module.exports = _.assign({
  BACKEND_URL: 'http://localhost:3000/api/',
}, require('./' + process.env.NODE_ENV + '.js'));
