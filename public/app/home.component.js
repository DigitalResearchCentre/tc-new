var HomeComponent = ng.core.Component({
  selector: 'tc-home',
  templateUrl: '/app/home.html',
}).Class({
  constructor: function() {
    
    console.log('home');
  },
});

module.exports = HomeComponent;

