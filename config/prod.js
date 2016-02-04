module.exports = {
  database: {
    uri: 'mongodb://localhost/tc',
  },
  auth: {
    'facebookAuth' : {
        'clientID'      : '483987101763451', // your App ID
        'clientSecret'  : '743b4bc850e627d2c0d1faad7df04ac0', // your App Secret
        'callbackURL'   : 'http://206.12.59.55:3000/auth/facebook/callback'
    },

    'twitterAuth' : {
        'consumerKey'       : 'hfOZiDBGCOwhvu28AWl7jqvuT',
        'consumerSecret'    : 'uT7TI5jMzLi8l2ZCrYQkRP78wPABRqE4DKPb94e67EbReSnoVT',
        'callbackURL'       : 'http://206.12.59.55:3000/auth/twitter/callback'
    },

    'googleAuth' : {
        'clientID'      : '266995390551-b7a8bbccaelvbd0k5vsadki8kum4cps8.apps.googleusercontent.com',
        'clientSecret'  : 'DrG_pWbhlMF6vaTNaQf3gary',
        'callbackURL'   : 'http://206.12.59.55:3000/auth/google/callback'
    }
  },
  port: 80,
};
