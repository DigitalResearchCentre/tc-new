var _ = require('lodash');

module.exports = _.assign({
  BACKEND_URL: 'http://localhost:3000/api/',
}, require('./' + process.env.TC_ENV + '.js'));
