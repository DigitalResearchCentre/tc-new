//emailer ======================================================================
var nodemailer = require('nodemailer');
var mg = require('nodemailer-mailgun-transport');
var auth = {
  auth: {
    api_key: 'key-894ec3e3c9a7c1dfc64d2ba204186ead',
    domain: 'sandboxffe4fd20caa34236aa24e41fdfae8643.mailgun.org'
  }
};


exports.localmailer = nodemailer.createTransport(mg(auth));

exports.addresses = {
	from: 'peter@sd-editions.com',
	replyto: 'peter@sd-editions.com'
};
