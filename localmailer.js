var nodemailer = require('nodemailer');

let transporter = nodemailer.createTransport({
    sendmail: true,
    newline: 'unix',
    path: '/usr/sbin/sendmail'
});

exports.localmailer = transporter;
exports.addresses = {
	from: 'peter@sd-editions.com',
	replyto: 'peter@sd-editions.com'
};
