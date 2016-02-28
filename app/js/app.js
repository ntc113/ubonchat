'use strict';

// Declare app level module which depends on filters, and services
angular.module('myApp', [
  'ngRoute',
  'ngSanitize',
  'ngTouch',
  'ui.bootstrap',
  'mediaPlayer',
  'izhukov.utils',
  'izhukov.mtproto',
  'izhukov.mtproto.wrapper',
  'myApp.filters',
  'myApp.services',
  /*PRODUCTION_ONLY_BEGIN
  'myApp.templates',
  PRODUCTION_ONLY_END*/
  'myApp.directives',
  'myApp.controllers'
]).
config(['$locationProvider', '$routeProvider', '$compileProvider', 'StorageProvider', function($locationProvider, $routeProvider, $compileProvider, StorageProvider) {

  var icons = {}, reverseIcons = {}, i, j, hex, name, dataItem, row, column, totalColumns;

  for (j = 0; j < Config.EmojiCategories.length; j++) {
    totalColumns = Config.EmojiCategorySpritesheetDimens[j][1];
    for (i = 0; i < Config.EmojiCategories[j].length; i++) {
      dataItem = Config.Emoji[Config.EmojiCategories[j][i]];
      name = dataItem[1][0];
      row = Math.floor(i / totalColumns);
      column = (i % totalColumns);
      icons[':' + name + ':'] = [j, row, column, ':'+name+':'];
      reverseIcons[name] = dataItem[0];
    }
  }

  $.emojiarea.spritesheetPath = 'img/emojisprite_!.png';
  $.emojiarea.spritesheetDimens = Config.EmojiCategorySpritesheetDimens;
  $.emojiarea.iconSize = 20;
  $.emojiarea.icons = icons;
  $.emojiarea.reverseIcons = reverseIcons;

  $compileProvider.imgSrcSanitizationWhitelist(/^\s*(https?|ftp|file|blob|filesystem|chrome-extension|app):|data:image\//);
  $compileProvider.aHrefSanitizationWhitelist(/^\s*(https?|ftp|file|mailto|blob|filesystem|chrome-extension|app):|data:image\//);

  if (Config.Modes.test) {
    StorageProvider.setPrefix('t_');
  }

  $routeProvider.when('/', {templateUrl: templateUrl('welcome'), controller: 'AppWelcomeController'});
  $routeProvider.when('/login', {templateUrl: templateUrl('login'), controller: 'AppLoginController'});
  $routeProvider.when('/im', {templateUrl: templateUrl('im'), controller: 'AppIMController', reloadOnSearch: false});
  $routeProvider.otherwise({redirectTo: '/'});

}])
.run(function($rootScope, $location, SessionService, ErrorService){
    // $rootScope.$on('$locationChangeStart', function( event ) {
    //   var answer = confirm("Are you sure you want to leave this page?");
    //   if (!answer) {
    //       event.preventDefault();
    //   }
    // });

    /*$rootScope.$on("$locationChangeStart", function(event, next, current) {
        console.log ('location change start.');
        console.log (next);
        console.log (current);
        for(var i in window.routes) {
            if(next.indexOf(i) != -1) {
                if(window.routes[i].requireLogin && !SessionService.getUserAuthenticated()) {
                    ErrorService.alert("You need to be authenticated to see this page!");
                    $location.url ('/login');
                    event.preventDefault();
                }
            }
        }
    });*/

});

/*window.routes =
{
    '/': {templateUrl: templateUrl('welcome'), controller: 'AppWelcomeController', requireLogin: false},
    '/login': {templateUrl: templateUrl('login'), controller: 'AppLoginController', requireLogin: false},
    '/im': {templateUrl: templateUrl('im'), controller: 'AppIMController', reloadOnSearch: false, requireLogin: true}
};*/