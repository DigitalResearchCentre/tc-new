require('script!angular2/bundles/angular2-polyfills');
require('script!rxjs/bundles/Rx.umd');
require('script!angular2/bundles/angular2-all.umd');

var AppComponent = require('./app.component');

console.log(require("libxmljs"));

document.addEventListener('DOMContentLoaded', function() {
  ng.platform.browser.bootstrap(AppComponent, [
    ng.http.HTTP_PROVIDERS,
    ng.router.ROUTER_PROVIDERS,
    require('./ui.service'),
    require('./auth.service'),
    require('./services/community'),
    require('./services/doc'),
    require('./rest.service'),
  ]).catch(function(err) {
    console.error(err);
  });
});
