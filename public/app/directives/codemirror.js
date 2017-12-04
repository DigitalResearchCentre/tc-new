var CodeMirror = require('codemirror/lib/codemirror')
  , xmlmode = require('codemirror/mode/xml/xml')
  , $ = require('jquery')
  , EventEmitter = ng.core.EventEmitter
  , ElementRef = ng.core.ElementRef
  , UIService = require('../services/ui')
  , editInitialized=true;
;

var CodeMirrorComponent = ng.core.Component({
  selector: 'tc-codemirror',
  template: '<textarea [(ngModel)]="content"></textarea>',
  changeDetection: ng.core.ChangeDetectionStrategy.OnPush,
  inputs: [
    'content', 'smartIndent', 'state',
  ],
  outputs: [
    'contentChange',
  ],
}).Class({
  constructor: [ElementRef, UIService, function(elementRef, uiService) {
    var self=this;
    this._elementRef = elementRef;
    this._uiService=uiService;
    this.state=uiService.state;
    this.state.editor=this.editor;
    this.contentChange = new EventEmitter();
    this._uiService.requestEditorText$.subscribe(function(choice) {
      var text=self.editor.getValue();
      self._uiService.sendEditorText$.emit({text: text, choice: choice});
    });
    this._uiService.nullEditor$.subscribe(function(choice) {
      self.editor=null;
    });
  }],
  ngOnInit: function() {
    var el = this._elementRef.nativeElement
      , editor
    ;
    editor = CodeMirror.fromTextArea($(el).find('textarea')[0], {
      lineWrapping: true,
      lineNumbers: true,
      smartIndent: this.smartIndent,
      mode:  'xml'
    });
//    editor.on('change', this.textChange.bind(this));
    editor.setValue(this.content || '');
    this.editor = editor;
    this.state.editor = editor;
  },
  ngOnChanges: function(changeRecord) {
    //the editor is pretty slow -- updates editor and this.content after EVERY editing act
    //this should not be necessary. ToDo -- find a way that does NOT rely on updating after EVERY editing act
    //done that... but now we have a problem. Marking first line as readOnly and cancelling the change also
    //stops display of all changes
    //another problem: we can get out of sync with a call to commit the document on view and the document in memory.
    //not sure why there is this mismatch! but their sure is
    var editor = this.editor;
    if (editor) {
      if (this.content !== editor.getValue()) {
        if (this.content) this.content=adjustStart(this.content);
        editor.setValue(this.content || '');
      }
      editor.markText({line:0,ch:0},{line:0,ch:1000},{css:"background-color: #E5E5E5;", readOnly: true});
/*      editor.on('beforeChange',function(cm,change) {
      if ( ~readOnlyLines.indexOf(change.from.line) ) {
          change.cancel();
        }
      }); */
    }
  }, /*
  textChange: function(instance) {
   var newValue = instance.getValue();
    if (newValue !== this.content) {
      this.content = newValue;
      this.contentChange.emit(newValue);
    }
  }, */
});

function adjustStart(text) {
  var pbPlace=text.indexOf("/>");
  if (text.charAt(pbPlace+2)!='\n' && text.charAt(pbPlace+2)!='\r') text=[text.slice(0,pbPlace+2),'\n',text.slice(pbPlace+2)].join('');
  text=[text.slice(0, pbPlace).replace(/[\n\r]/g,''),text.slice(pbPlace)].join('');
  return(text);
}

module.exports = CodeMirrorComponent;
