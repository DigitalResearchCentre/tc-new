var _ = require('lodash');

var env = process.env.NODE_ENV;

module.exports = _.assign({
  env: env,
  BACKEND_URL: 'http://localhost:3000/api/',
  IMAGE_UPLOAD_URL: 'http://www.textualcommunities.org/api/upload/',
  IIIF_URL: 'http://www.textualcommunities.org:5004/',
  host_url: 'http://localhost:3000'
}, require('./' + env + '.js'));
