var nodemailer = require('nodemailer');

let transporter = nodemailer.createTransport({
    sendmail: true,
    newline: 'unix',
    path: '/usr/sbin/sendmail'
});

exports.localmailer = transporter;
exports.addresses = {
	from: 'textualcommunities@usask.ca',
	replyto: 'textualcommunities@usask.ca'
};
