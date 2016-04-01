var _ = require('lodash');

var env = process.env.NODE_ENV;

module.exports = _.assign({
  env: env,
  BACKEND_URL: 'http://localhost:3000/api/',
  IMAGE_UPLOAD_URL: 'http://206.12.59.55/api/upload/',
  IIIF_URL: 'http://206.12.59.55:5004/',
}, require('./' + env + '.js'));
