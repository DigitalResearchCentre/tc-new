var EventEmitter = ng.core.EventEmitter
  , ElementRef = ng.core.ElementRef
  , $ = require('jquery')
;


var UploaderComponent = ng.core.Component({
  selector: 'tc-uploader',
  templateUrl: '/app/directives/uploader.html',
  // style="width: 250px; display: inline-block" 
  outputs: [
    'filechange'
  ],
  inputs: [
    'url',
  ]
}).Class({
  constructor: [ElementRef, function(elementRef) { 
    this._elementRef = elementRef;

    this.filechange = new EventEmitter();
  }],
  ngOnInit: function() {
    var el = this._elementRef.nativeElement
      , $el = $(el)
      , self = this
    ;
    this.$form = $('form.fileupload', $el);
    $el.bind('change', function(event) {
      var reader = new FileReader();
      reader.onload = function(evt) {
        self.filechange.emit(evt.target.result);
      };
      reader.readAsText(event.target.files[0]);
    });
  },
  /*
  onFileAdd: function(file) {
    var name = this.getName()
      , path = file.get(name)
      , url = mediaURL + path
      , $li = $(
      '<li data-pk="' + file.id + '">' + 
      '<a target="_blank" href="' + url + '">' + path + '</a>' +
      '<a href="#" class="close" style="float: none">×</a>' +
      '</li>')
      , fList = this.getFileList()
    ;
    $('.close', $li).click(function() {
      var id = $li.data('pk');
      fList.get(id).destroy().done(function() {
        $li.remove();
      }).fail(function(resp) {
        this.$('.error').removeClass('hide').html(resp.responseText);
      });
    });
    this.$('.file-list').append($li);
  },
  */
  onUpload: function() {
    var $form = this.$form;
      , $progress = $('.progress', $form).show()
      , $srOnly = $('.sr-only', $progress)
      , $error = this.$('.error')
      , fList = this.getFileList()
    ;
    $error.addClass('hide');
    $.ajax({
      url: this.url,
      type: 'POST',
      data: new FormData($form[0]),
      contentType: false,
      processData: false,
      xhr: function() {  // Custom XMLHttpRequest
        var myXhr = $.ajaxSettings.xhr()
          , $bar = $('.progress-bar', $progress)
        ;
        if(myXhr.upload){ // Check if upload property exists
          myXhr.upload.addEventListener('progress', function(e) {
            if(e.lengthComputable){
              var percent = (e.loaded*100.0)/e.total + '%';
              $bar.attr({
                  'aria-valuenow': e.loaded, 'aria-valuemax': e.total
              }).width(percent);
              $srOnly.text(percent);
            } 
          }, false); // For handling the progress of the upload
        }
        return myXhr;
      }
    }).done(_.bind(function() {
      this.$('.alert-success').removeClass('hide').show();
      this.$('.error').addClass('hide');
    }, this)).fail(_.bind(function(resp) {
      this.$('.alert-success').hide();
      this.$('.error').removeClass('hide').html(resp.responseText);
    }, this));

  }
});

module.exports = UploaderComponent;



