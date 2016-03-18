var mongoose = require('mongoose')
  , Grid = require('gridfs-stream')
  , fs = require('fs')
  , _ = require('lodash')
  , gfs
;

mongoose.connection.once('open', function () {
  gfs = Grid(mongoose.connection.db, mongoose.mongo); 
  storage.gfs = gfs;
});

function GridFSStorage(opts) {
}

_.assign(GridFSStorage.prototype, {
  _handleFile: function(req, file, cb) {
    var id = mongoose.Types.ObjectId();

    var ws = gfs.createWriteStream({
      _id: id,
      filename: file.originalname,
      mimetype: file.mimetype,
    });

    file.stream.pipe(ws);

    ws.on('close', function(f) {
      cb(null, f);
    });
  },
  _removeFile: function(req, file, cb) {
    gfs.remove({_id: req.params.id}, function(err) {
      cb(err);
    });
  },
});


var storage = new GridFSStorage();

module.exports = storage;

