var _ = require('lodash');

console.log(process.env.TC_ENV);
module.exports = _.assign({
  auth: {
    'facebookAuth' : {
        'clientID'      : '483987101763451', // your App ID
        'clientSecret'  : '743b4bc850e627d2c0d1faad7df04ac0', // your App Secret
        'callbackURL'   : 'http://localhost:8080/auth/facebook/callback'
    },

    'twitterAuth' : {
        'consumerKey'       : 'hfOZiDBGCOwhvu28AWl7jqvuT',
        'consumerSecret'    : 'uT7TI5jMzLi8l2ZCrYQkRP78wPABRqE4DKPb94e67EbReSnoVT',
        'callbackURL'       : 'http://localhost:8080/auth/twitter/callback'
    },

    'googleAuth' : {
        'clientID'      : '266995390551-7r1vhnrc97df8d86tlukh1tb479naict.apps.googleusercontent.com',
        'clientSecret'  : 'UzUB13NL_6P-JEXZiS3vhqFG',
        'callbackURL'   : 'http://localhost:8080/auth/google/callback'
    }
  }

}, require('./' + process.env.TC_ENV));
