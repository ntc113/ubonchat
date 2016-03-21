'use strict';

/* Controllers */

angular.module('myApp.controllers', ['myApp.i18n'])

  .controller('AppWelcomeController', function ($scope, $location, $modal, $modalStack, MtpApiManager, ErrorService, SessionService) {
    //close modal every where
    $modalStack.dismissAll();

    $scope.login = function () {
      ErrorService.confirm({
        type: 'REQUIRED_MOBILEAPP',
      }).then(function () {
        $location.url ('/login');
      });
    }

    $scope.logout = function () {
      console.log ('remove authen.');
      SessionService.setUserAuthenticated(false);  
    }

    MtpApiManager.getUserID().then(function (id) {
      if (id) {
        $location.url('/im');
        return;
      }
      $scope.showWelcome = true;
    });
  })

  .controller('AppLoginController', function (UsersManager, $scope, $rootScope, $location, $timeout, $modal, $modalStack, Storage, SessionService, MtpApiManager, ErrorService, NotificationsManager, ChangelogNotifyService, _, socket, BaseService) {

    //close modal every where
    $modalStack.dismissAll();

    MtpApiManager.getUserID().then(function (id) {
      if (id) {
        $location.url('/im');
        return;
      }
    });

    var options = {dcID: 113, createNetworker: false},
        countryChanged = false,
        selectedCountry = false;

    $scope.credentials = {phone_country: '', phone_country_name: '', phone_number: '', phone_full: ''};
    $scope.progress = {};

    $scope.chooseCountry = function () {
      var modal = $modal.open({
        templateUrl: templateUrl('country_select_modal'),
        controller: 'CountrySelectModalController',
        windowClass: 'countries_modal_window mobile_modal'
      });

      modal.result.then(selectCountry);
    };

    function initPhoneCountry () {
      var langCode = (window.navigator.userLanguage || window.navigator.language).toLowerCase(), // get language by browser
          countryIso2 = Config.LangCountries[langCode],
          shouldPregenerate = !Config.Navigator.mobile;

      if (['en', 'en-us', 'en-uk'].indexOf(langCode) == -1) {
        if (countryIso2 !== undefined) {
          selectPhoneCountryByIso2(countryIso2);
        } else if (langCode.indexOf('-') > 0) {
          selectPhoneCountryByIso2(langCode.split('-')[1].toUpperCase());
        } else {
          selectPhoneCountryByIso2('US');
        }
      } else {
        selectPhoneCountryByIso2('US');
      }

      if (!shouldPregenerate) {
        return;
      }
    }

    function selectPhoneCountryByIso2 (countryIso2) {
      var i, country;
      for (i = 0; i < Config.CountryCodes.length; i++) {
        country = Config.CountryCodes[i];
        if (country[0] == countryIso2) {
          return selectCountry({name: _(country[1] + '_raw'), code: country[2]});
        }
      }
      return selectCountry({name: _('country_select_modal_country_us_raw'), code: '+1'});
    }

    function selectCountry (country) {
      selectedCountry = country;
      if ($scope.credentials.phone_country != country.code) {
        $scope.credentials.phone_country = country.code;
      } else {
        updateCountry();
      }
      $scope.$broadcast('country_selected');
    }

    function updateCountry () {
      var pn = $scope.credentials.phone_number || '';
      if (pn != '' && pn.indexOf('0') == 0) {
        $scope.credentials.phone_number = pn.substring(1);
      };
      var phoneNumber = (
            ($scope.credentials.phone_country || '') +
            ($scope.credentials.phone_number || '')
          ).replace(/\D+/g, ''),
          i, j, code,
          maxLength = 11,
          maxName = false;

      if (phoneNumber.length) {
        if (selectedCountry && !phoneNumber.indexOf(selectedCountry.code.replace(/\D+/g, ''))) {
          maxName = selectedCountry.name;
        } else {
          for (i = 0; i < Config.CountryCodes.length; i++) {
            for (j = 2; j < Config.CountryCodes[i].length; j++) {
              code = Config.CountryCodes[i][j].replace(/\D+/g, '');
              if (code.length > maxLength && !phoneNumber.indexOf(code)) {
                maxLength = code.length;
                maxName = _(Config.CountryCodes[i][1] + '_raw');
              }
            }
          }
        }
      }

      $scope.credentials.phone_full = phoneNumber;
      $scope.credentials.phone_country_name = maxName || _('login_controller_unknown_country_raw');
    };

    $scope.$watch('credentials.phone_country', updateCountry);
    $scope.$watch('credentials.phone_number', updateCountry);
    initPhoneCountry();

    function saveAuth (result) {
      MtpApiManager.setUserAuth(result);
    };

    $scope.sendCode = function () {

      ErrorService.confirm({
        type: 'LOGIN_PHONE_CORRECT',
        country_code: $scope.credentials.phone_country,
        phone_number: $scope.credentials.phone_number
      }).then(function () {
        $scope.progress.enabled = true;

        onContentLoaded(function () {
          $scope.$broadcast('ui_height');
        });

        var authKeyStarted = tsNow();
        /*ntc113*/
        // request ubon server with phone_full. UBon server send *code* to ubon app mobile, send *hash* to browser
        // if success
        $scope.progress.enabled = false;

        $scope.credentials.phone_code_hash = 'hash_code';
        $scope.credentials.phone_occupied = true; // has account on mobile before use web
        $scope.credentials.viaApp = false; // send code via app
        $scope.error = {};

        // if error
        /**
        $scope.progress.enabled = false;
        console.log('sendCode error', error);
        $scope.error = {field: 'phone'};
         */
      });
    }

    $scope.editPhone = function () {
      delete $scope.credentials.phone_code;
      delete $scope.credentials.phone_code_hash;
      delete $scope.credentials.phone_unoccupied;
      delete $scope.credentials.phone_code_valid;
      delete $scope.credentials.viaApp;
    }

    $scope.logIn = function () {
      /*ntc113*/
      // request to ubon server with 3 arguments phone_full, phone_code and hash
      // UBon server send result after check code
      // if success
      /*saveAuth*/
      // if error
      /**
      $scope.progress.enabled = false;
      $scope.error = {field: 'phone_code'};
       */
      var promises = MtpApiManager.loginViaPass ($scope.credentials.phone_full, $scope.credentials.phone_code);
      socket.on ('WebPacket', function (packet) {
        // $timeout.cancel (socketTimeout);

        if (packet.service == 2) {
          try {
            var body = JSON.parse (packet.body);
            if (body.resultCode == 1) {
              UsersManager.setCurrentUser(packet.body);
              $scope.progress.enabled = true;
              // saveAuth ({id:body.userId, username: $scope.credentials.phone_full, password: $scope.credentials.phone_code});
            } else {
              $scope.progress.enabled = false;
              $scope.error = {field: 'phone_code'};
            }
          } catch (ex) {
            $scope.progress.enabled = false;
            $scope.error = {field: 'phone_code'};
            console.log ('ERROR LOGINVIAPASS :: %s', ex);
          }
        } else {
          console.log ('-------- %d ---------: %s', packet.service, Math.round(+new Date()/1000));
          
          BaseService.process (packet);
        }
      });
      socket.on ('disconnect', function () {
        console.log ('has disconnect.', Math.round(+new Date()/1000));
      });
    };

    // var socketTimeout = $timeout (function () {
    //   console.log ('socket timeout: -- ', Math.round(+new Date()/1000));
    //   ErrorService.alert ('Alert!', 'Socket is timeout.');
    // }, 5000);
    
    $scope.findFriend = function () {
      var phoneNumber = (
            ($scope.credentials.phone_country || '') +
            ($scope.credentials.phone_number || '')
          ).replace(/\D+/g, '');
      MtpApiManager.findFriend(phoneNumber);
      // console.log ('----------findFriend--------');
    }
  })

  .controller('AppIMController', function ($scope, $location, $routeParams, $modal, $interval, Storage, $rootScope, $modalStack, socket, MtpApiManager, AppUsersManager, AppChatsManager, ContactsSelectService, ChangelogNotifyService, ErrorService, AppRuntimeManager, HttpsMigrateService, LayoutSwitchService, UsersManager, ThreadsManager, HistoriesManager) {
    //close modal every where
    $modalStack.dismissAll();
    // console.log(socket);

    $scope.threads = ThreadsManager.getThreads();

    socket.on ('WebPacket', function (packet) {
      console.log ('-------- has packet: ', packet.service, Math.round(+new Date()/1000));
      //$interval.cancel (socketTimeout);
    });
    // $scope.$on('$destroy', function (event) {
    //     socket.removeAllListeners();
        // or something like
        // socket.removeListener(this);
    // });

    var socketTimeout = $interval (function () {
      sendPacket(socket, {service:1, body:''});
      // MtpApiManager.pingToServer();
    }, 120000);

    /*ntc113*/
    // console.log ('----------');
        // console.log (socket.socket.connecting);
    // socket.on ('disconnect', function () {
    //     console.log ('has disconnect.', Math.round(+new Date()/1000));
    //     ErrorService.alert('Alert!', 'Has disconnection.');
    // });

    // var isConnected = MtpApiManager.getStatusSocket();

    /*MtpApiManager.getUserID().then(function (id) {
      if (!id) {
        $location.url('/login');
        return;
      } else if (!isConnected) {
        Storage.get('user_auth').then(function (auth) {*/
          // MtpApiManager.loginViaPass ( auth.username, auth.password );
          // console.log('relogin......');
          // socket.emit ('WebPacket', {service: 29, body: angular.toJson()});
          // socket.emit('WebPacket', {service: 2, body: angular.toJson({username:phonenumber, password:md5(password)})});
        /*});
      };
    });*/

    /*$scope.$on('$routeUpdate', updateCurDialog);

    $scope.$on('history_focus', function (e, peerData) {
      console.log ('peerData: %s', angular.toJson(peerData));
      $modalStack.dismissAll();
      if (peerData.peerString == $scope.curDialog.peer && peerData.messageID == $scope.curDialog.messageID) {
        $scope.$broadcast(peerData.messageID ? 'ui_history_change_scroll' : 'ui_history_focus');
      } else {
        $location.url('/im?p=' + peerData.peerString + (peerData.messageID ? '&m=' + peerData.messageID : ''));
      }
    });*/


    $scope.isLoggedIn = true;
    $scope.isEmpty = {};
    $scope.search = {};
    $scope.historyFilter = {mediaType: false};
    $scope.historyPeer = {};
    $scope.historyState = {selectActions: false, typing: []};

    /*$scope.sendMsg = function () {
      // console.log ('you send msg');
      MtpApiManager.sendMsg('Hi');
    }*/

    $scope.openSettings = function () {
      /*$modal.open({
        templateUrl: templateUrl('settings_modal'),
        controller: 'SettingsModalController',
        windowClass: 'settings_modal_window mobile_modal'
      });*/
    }

    $scope.openContacts = function () {
      ContactsSelectService.selectContact().then(function (userID) {
        $scope.dialogSelect(AppUsersManager.getUserString(userID));
      });
    };
    $scope.openGroup = function () {
      ContactsSelectService.selectContacts({action: 'new_group'}).then(function (userIDs) {

        if (userIDs.length == 1) {
          $scope.dialogSelect(AppUsersManager.getUserString(userIDs[0]));
        } else if (userIDs.length > 1) {
          var scope = $rootScope.$new();
          scope.userIDs = userIDs;

          $modal.open({
            templateUrl: templateUrl('chat_create_modal'),
            controller: 'ChatCreateModalController',
            scope: scope,
            windowClass: 'group_edit_modal_window mobile_modal'
          });
        }

      });
    };

    $scope.importContact = function () {
      AppUsersManager.openImportContact().then(function (foundContact) {
        if (foundContact) {
          $rootScope.$broadcast('history_focus', {
            peerString: AppUsersManager.getUserString(foundContact)
          });
        }
      });
    };
    /*$scope.dialogSelect = function (peerString, messageID) {
      console.log ('dialogSelect');
      var params = {peerString: peerString, messageID:0};
      if (messageID) {
        params.messageID = messageID;
      }
      else if ($scope.search.query) {
        $scope.searchClear();
      }
      var peerID = AppPeersManager.getPeerID(peerString);
      var converted = AppMessagesManager.convertMigratedPeer(peerID);
      if (converted) {
        params.peerString = AppPeersManager.getPeerString(converted);
      }
      // $rootScope.$broadcast('history_focus', params);
    };*/

    $scope.logOut = function () {
      ErrorService.confirm({type: 'LOGOUT'}).then(function (logout) {
        console.log('logOut: %s', angular.toJson(logout));

        MtpApiManager.logOut();/**/
        $scope.isLoggedIn = false;
        location.hash = '/login';
        AppRuntimeManager.reload();
      })
    };
    $scope.showPeerInfo = function () {
      if ($scope.curDialog.peerID > 0) {
        AppUsersManager.openUser($scope.curDialog.peerID)
      } else if ($scope.curDialog.peerID < 0) {
        AppChatsManager.openChat(-$scope.curDialog.peerID)
      }
    };

    $scope.toggleEdit = function () {
      $scope.$broadcast('history_edit_toggle');
    };
    $scope.selectedFlush = function () {
      $scope.$broadcast('history_edit_flush');
    };
    $scope.toggleMedia = function (mediaType) {
      $scope.$broadcast('history_media_toggle', mediaType);
    };
    $scope.returnToRecent = function () {
      $scope.$broadcast('history_return_recent');
    };
    $scope.toggleSearch = function () {
      $scope.$broadcast('dialogs_search_toggle');
    };
    /*updateCurDialog();

    var lastSearch = false;
    function updateCurDialog() {
      if ($routeParams.q) {
        if ($routeParams.q !== lastSearch) {
          $scope.search.query = lastSearch = $routeParams.q;
          $scope.search.messages = true;
          if ($scope.curDialog !== undefined) {
            return false;
          }
        }
      } else {
        lastSearch = false;
      }
      $scope.curDialog = {
        peer: $routeParams.p || false,
        messageID: $routeParams.m || false
      };
      // console.log ('CONTROLLER: curDialog: %s', angular.toJson($scope.curDialog));
    }*/

    $scope.randomAvatarColor = function(uid) {
        return 'user_bgcolor_' + uid%7;
    }
    $scope.getAvatarText = function(fullname){
        var key = "";
        if (!fullname) return "";

        var words = fullname.split(" ");
        if (words.length == 1) {
            key = words[0].substring(0, words[0].length == 1 ? 1 : 2);
        } else {
            key = words[0].substring(0, 1) + words[words.length - 1].substring(0, 1);
        }

        return key.toUpperCase();
    };
    $scope.threadSelect = function (userId) {
      $rootScope.selectedUserId = userId;
      var selectedUserInfo = UsersManager.getUserById(userId);
      $scope.$broadcast('history_selected', selectedUserInfo);
    };
  })

  .controller('AppImDialogsController', function ($scope, $location, $q, $timeout, $routeParams, MtpApiManager, AppUsersManager, AppChatsManager, AppMessagesManager, AppPeersManager, PhonebookContactsService, ErrorService) {

    $scope.dialogs = [];
    $scope.contacts = [];
    $scope.foundUsers = [];
    $scope.contactsLoaded = false;
    if ($scope.search === undefined) {
      $scope.search = {};
    }
    if ($scope.isEmpty === undefined) {
      $scope.isEmpty = {};
    }
    $scope.phonebookAvailable = PhonebookContactsService.isAvailable();

    var offset = 0,
        maxID = 0,
        hasMore = false,
        jump = 0,
        peersInDialogs = {},
        contactsShown;
    /*ntc113*/
    // get contactList from Storage
    MtpApiManager.getContacts ().then (function (friendlist) {
      if (typeof friendlist === 'string') {
        friendlist = JSON.parse (friendlist);
      }
      // console.log ('-------friendlist ----------', friendlist);
      $scope.contacts = friendlist.friends;
    });

    $scope.searchClear = function () {
      $scope.search.query = '';
      $scope.search.messages = false;
      $scope.$broadcast('search_clear');
    }
    $scope.$on('ui_dialogs_search_clear', $scope.searchClear);

  })

  .controller('AppImHistoryController', function (UsersManager, ThreadsManager, HistoriesManager, MessagesManager, $modalStack, $scope, $location, $timeout, $rootScope, MtpApiManager, AppUsersManager, AppChatsManager, AppMessagesManager, AppPeersManager, ApiUpdatesManager, PeersSelectService, IdleManager, StatusManager, ErrorService) {

    var selectedUser = {};
    $scope.$on('history_selected', function (e, selectedUserInfo) {
      $modalStack.dismissAll();
      $scope.histories = MessagesManager.getMessages(); //HistoriesManager.getHistories();
      // $scope.currentHistory = MessagesManager.getMessageByUserId($rootScope.selectedUserId); //HistoriesManager.getHistoryById($rootScope.selectedUserId);
      $scope.selectedUser = selectedUserInfo;
      // console.log($scope.currentHistory);
      // console.log($scope.histories);
    });
    $scope.randomAvatarColor = function(uid) {
        return 'user_bgcolor_' + uid%7;
    }
    $scope.getAvatarText = function(fullname){
        var key = "";
        if (!fullname) return "";

        var words = fullname.split(" ");
        if (words.length == 1) {
            key = words[0].substring(0, words[0].length == 1 ? 1 : 2);
        } else {
            key = words[0].substring(0, 1) + words[words.length - 1].substring(0, 1);
        }

        return key.toUpperCase();
    };

    ApiUpdatesManager.attach();
    IdleManager.start();
    StatusManager.start();

    $scope.peerHistories = [];
    $scope.skippedHistory = false;
    $scope.selectedMsgs = {};
    $scope.selectedCount = 0;
    $scope.historyState.selectActions = false;
    $scope.missedCount = 0;
    $scope.state = {};

    $scope.toggleMessage = toggleMessage;
    $scope.selectedDelete = selectedDelete;
    $scope.selectedForward = selectedForward;
    $scope.selectedCancel = selectedCancel;
    $scope.selectedFlush = selectedFlush;

    $scope.toggleEdit = toggleEdit;
    $scope.toggleMedia = toggleMedia;
    $scope.returnToRecent = returnToRecent;

    $scope.$on('history_edit_toggle', toggleEdit);
    $scope.$on('history_edit_flush', selectedFlush);
    $scope.$on('history_media_toggle', function (e, mediaType) {
      toggleMedia(mediaType);
    });


    $scope.$on('history_return_recent', returnToRecent);
    var peerID,
        peerHistory = false,
        hasMore = false,
        hasLess = false,
        maxID = 0,
        minID = 0,
        lastSelectID = false,
        inputMediaFilters = {
          photos: 'inputMessagesFilterPhotos',
          video: 'inputMessagesFilterVideo',
          documents: 'inputMessagesFilterDocument',
          audio: 'inputMessagesFilterAudio'
        },
        jump = 0,
        moreJump = 0,
        moreActive = false,
        morePending = false,
        lessJump = 0,
        lessActive = false,
        lessPending = false;

    function applyDialogSelect (newDialog, oldDialog) {

      var newPeer = newDialog.peer || $scope.curDialog.peer || '';
      peerID = AppPeersManager.getPeerID(newPeer);


      if (peerID == $scope.curDialog.peerID && oldDialog.messageID == newDialog.messageID) {
        return false;
      }

      $rootScope.selectedPeerID = peerID;
      $scope.curDialog.peerID = peerID;
      $scope.curDialog.inputPeer = AppPeersManager.getInputPeer(newPeer);
      $scope.historyFilter.mediaType = false;

      selectedCancel(true);

      if (oldDialog.peer && oldDialog.peer == newDialog.peer && newDialog.messageID) {
        messageFocusHistory();
      }
      else if (peerID) {
        updateHistoryPeer(true);
        loadHistory();
      }
      else {
        showEmptyHistory();
      }
    }
    function historiesQueuePush (peerID) {
      var pos = -1,
          maxLen = 10,
          i,
          history,
          diff;

      for (i = 0; i < $scope.peerHistories.length; i++) {
        if ($scope.peerHistories[i].peerID == peerID) {
          pos = i;
          break;
        }
      }
      if (pos > -1) {
        history = $scope.peerHistories[pos];
        // if (pos) {
        //   $scope.peerHistories.splice(pos, 1);
        //   $scope.peerHistories.unshift(history);
        // }
        return history;
      }
      history = {peerID: peerID, messages: []};
      $scope.peerHistories.unshift(history);
      diff = $scope.peerHistories.length - maxLen;
      if (diff > 0) {
        $scope.peerHistories.splice(maxLen - 1, diff);
      }

      return history;
    }

    function historiesQueueFind (peerID) {
      var i;
      for (i = 0; i < $scope.peerHistories.length; i++) {
        if ($scope.peerHistories[i].peerID == peerID) {
          return $scope.peerHistories[i];
        }
      }
      return false;
    }
    function updateHistoryPeer(preload) {
      var peerData = AppPeersManager.getPeer(peerID);
      // console.log('update', preload, peerData);
      // if (!peerData/* || peerData.deleted*/) {
      //   safeReplaceObject($scope.state, {loaded: false});
      //   // return false;
      // }

      peerHistory = historiesQueuePush(peerID);

      safeReplaceObject($scope.historyPeer, {
        id: peerID,
        data: peerData,
        photo: AppPeersManager.getPeerPhoto(peerID, 'User', 'Group')
      });

      MtpApiManager.getUserID().then(function (id) {
        $scope.ownPhoto = AppUsersManager.getUserPhoto(id, 'User');
      });

      if (preload) {
        $scope.historyState.typing.splice(0, $scope.historyState.typing.length);
        $scope.$broadcast('ui_peer_change');
        $scope.$broadcast('ui_history_change');
        safeReplaceObject($scope.state, {loaded: true, empty: !peerHistory.messages.length});
      }
      $scope.state = {loaded: true}; //ntc113 test
    }

    function messageFocusHistory () {
      var i,
          found = false,
          history = historiesQueueFind();

      if (history) {
        for (i = 0; i < history.messages.length; i++) {
          if ($scope.curDialog.messageID == history.messages[i].id) {
            found = true;
            break;
          }
        }
      }

      if (found) {
        $scope.historyUnread = {};
        $scope.$broadcast('messages_focus', $scope.curDialog.messageID);
        $scope.$broadcast('ui_history_change_scroll');
      } else {
        loadHistory();
      }
    }

    function showLessHistory () {
      if (!hasLess) {
        return;
      }
      if (moreActive) {
        lessPending = true;
        return;
      }
      lessPending = false;
      lessActive = true;

      var curJump = jump,
          curLessJump = ++lessJump,
          limit = 0,
          backLimit = 20;
      AppMessagesManager.getHistory($scope.curDialog.inputPeer, minID, limit, backLimit).then(function (historyResult) {
        lessActive = false;
        if (curJump != jump || curLessJump != lessJump) return;

        var i, id;
        for (i = historyResult.history.length - 1; i >= 0; i--) {
          id = historyResult.history[i];
          if (id > minID) {
            peerHistory.messages.push(AppMessagesManager.wrapForHistory(id));
          }
        }

        if (historyResult.history.length) {
          minID = historyResult.history.length >= backLimit
                    ? historyResult.history[0]
                    : 0;
          if (AppMessagesManager.regroupWrappedHistory(peerHistory.messages, -backLimit)) {
            $scope.$broadcast('messages_regroup');
          }
          delete $scope.state.empty;
          $scope.$broadcast('ui_history_append');
        } else {
          minID = 0;
        }
        $scope.skippedHistory = hasLess = minID > 0;

        if (morePending) {
          showMoreHistory();
        }
      });
    }

    function showMoreHistory () {
      if (!hasMore) {
        return;
      }
      if (lessActive) {
        morePending = true;
        return;
      }
      morePending = false;
      moreActive = true;

      var curJump = jump,
          curMoreJump = moreJump,
          inputMediaFilter = $scope.historyFilter.mediaType && {_: inputMediaFilters[$scope.historyFilter.mediaType]},
          limit = Config.Mobile ? 20 : 0,
          getMessagesPromise = inputMediaFilter
        ? AppMessagesManager.getSearch($scope.curDialog.inputPeer, '', inputMediaFilter, maxID, limit)
        : AppMessagesManager.getHistory($scope.curDialog.inputPeer, maxID, limit);

      getMessagesPromise.then(function (historyResult) {
        moreActive = false;
        if (curJump != jump || curMoreJump != moreJump) return;

        angular.forEach(historyResult.history, function (id) {
          peerHistory.messages.unshift(AppMessagesManager.wrapForHistory(id));
        });

        hasMore = historyResult.count === null ||
                  historyResult.history.length && peerHistory.messages.length < historyResult.count;

        if (historyResult.history.length) {
          delete $scope.state.empty;
          maxID = historyResult.history[historyResult.history.length - 1];
          $scope.$broadcast('ui_history_prepend');
          if (AppMessagesManager.regroupWrappedHistory(peerHistory.messages, historyResult.history.length + 1)) {
            $scope.$broadcast('messages_regroup');
          }
        }

        if (lessPending) {
          showLessHistory();
        }
      });
    };
    
    function loadHistory (forceRecent) {
      $scope.missedCount = 0;

      hasMore = false;
      $scope.skippedHistory = hasLess = false;
      maxID = 0;
      minID = 0;
      peerHistory = [];//historiesQueuePush(peerID);


      var limit = 0, backLimit = 0;

      if ($scope.curDialog.messageID) {
        maxID = parseInt($scope.curDialog.messageID);
        limit = 10;
        backLimit = 10;
      }
      else if (forceRecent) {
        limit = 10;
      }

      moreActive = false;
      morePending = false;
      lessActive = false;
      lessPending = false;

      var prerenderedLen = 0;//peerHistory.messages.length;
      if (prerenderedLen && (maxID || backLimit)) {
        prerenderedLen = 0;
        peerHistory.messages = [];
      }

      var curJump = ++jump,
          inputMediaFilter = $scope.historyFilter.mediaType && {_: inputMediaFilters[$scope.historyFilter.mediaType]},
          getMessagesPromise = inputMediaFilter
        ? AppMessagesManager.getSearch($scope.curDialog.inputPeer, '', inputMediaFilter, maxID)
        : AppMessagesManager.getHistory($scope.curDialog.inputPeer, maxID, limit, backLimit, prerenderedLen);


      $scope.state.mayBeHasMore = true;
      getMessagesPromise.then(function (historyResult) {
        if (curJump != jump) return;

        var fetchedLength = historyResult.history.length;

        minID = (historyResult.unreadSkip || maxID && historyResult.history.indexOf(maxID) >= backLimit - 1)
                  ? historyResult.history[0]
                  : 0;
        maxID = historyResult.history[historyResult.history.length - 1];

        $scope.skippedHistory = hasLess = minID > 0;
        hasMore = historyResult.count === null ||
                  fetchedLength && fetchedLength < historyResult.count;

        updateHistoryPeer();
        safeReplaceObject($scope.state, {loaded: true, empty: !fetchedLength});

        peerHistory.messages = [];
        angular.forEach(historyResult.history, function (id) {
          var message = AppMessagesManager.wrapForHistory(id);
          if ($scope.skippedHistory) {
            delete message.unread;
          }
          if (historyResult.unreadOffset) {
            message.unreadAfter = true;
          }
          peerHistory.messages.push(message);
        });
        peerHistory.messages.reverse();

        if (AppMessagesManager.regroupWrappedHistory(peerHistory.messages)) {
          $scope.$broadcast('messages_regroup');
        }

        if (historyResult.unreadOffset) {
          $scope.historyUnreadAfter = historyResult.history[historyResult.unreadOffset - 1];
        }
        else if ($scope.historyUnreadAfter) {
          delete $scope.historyUnreadAfter;
        }
        $scope.$broadcast('messages_unread_after');
        onContentLoaded(function () {
          $scope.$broadcast('messages_focus', $scope.curDialog.messageID || 0);
        });
        $scope.$broadcast('ui_history_change');

        AppMessagesManager.readHistory($scope.curDialog.inputPeer);

      }, function () {
        safeReplaceObject($scope.state, {error: true});
      });
    }

    // not select user to chat
    function showEmptyHistory () {
      safeReplaceObject($scope.state, {notSelected: true});
      peerHistory = false;
      hasMore = false;

      $scope.$broadcast('ui_history_change');
    }
    function toggleMessage (messageID, $event) {
      var target = $event.target,
          shiftClick = $event.shiftKey;

      if (shiftClick) {
        $scope.$broadcast('ui_selection_clear');
      }

      if (!$scope.historyState.selectActions && !$(target).hasClass('icon-select-tick') && !$(target).hasClass('im_content_message_select_area')) {
        return false;
      }

      if ($scope.selectedMsgs[messageID]) {
        lastSelectID = false;
        delete $scope.selectedMsgs[messageID];
        $scope.selectedCount--;
        if (!$scope.selectedCount) {
          $scope.historyState.selectActions = false;
          $scope.$broadcast('ui_panel_update');
        }
      } else {

        if (!shiftClick) {
          lastSelectID = messageID;
        } else if (lastSelectID != messageID) {
          var dir = lastSelectID > messageID,
              i, startPos, curMessageID;

          for (i = 0; i < peerHistory.messages.length; i++) {
            if (peerHistory.messages[i].id == lastSelectID) {
              startPos = i;
              break;
            }
          }

          i = startPos;
          while (peerHistory.messages[i] &&
                 (curMessageID = peerHistory.messages[i].id) != messageID) {
            if (!$scope.selectedMsgs[curMessageID]) {
              $scope.selectedMsgs[curMessageID] = true;
              $scope.selectedCount++;
            }
            i += dir ? -1 : +1;
          }
        }

        $scope.selectedMsgs[messageID] = true;
        $scope.selectedCount++;
        if (!$scope.historyState.selectActions) {
          $scope.historyState.selectActions = true;
          $scope.$broadcast('ui_panel_update');
        }
      }
      $scope.$broadcast('messages_select');
    }

    function selectedCancel (noBroadcast) {
      $scope.selectedMsgs = {};
      $scope.selectedCount = 0;
      $scope.historyState.selectActions = false;
      lastSelectID = false;
      if (!noBroadcast) {
        $scope.$broadcast('ui_panel_update');
      }
      $scope.$broadcast('messages_select');
    }
    function selectedFlush () {
      ErrorService.confirm({type: 'HISTORY_FLUSH'}).then(function () {
        AppMessagesManager.flushHistory($scope.curDialog.inputPeer).then(function () {
          selectedCancel();
        });
      })
    };

    function selectedDelete () {
      if ($scope.selectedCount > 0) {
        var selectedMessageIDs = [];
        angular.forEach($scope.selectedMsgs, function (t, messageID) {
          selectedMessageIDs.push(messageID);
        });
        AppMessagesManager.deleteMessages(selectedMessageIDs).then(function () {
          selectedCancel();
        });
      }
    }


    function selectedForward () {
      if ($scope.selectedCount > 0) {
        var selectedMessageIDs = [];
        angular.forEach($scope.selectedMsgs, function (t, messageID) {
          selectedMessageIDs.push(messageID);
        });

        PeersSelectService.selectPeer({confirm_type: 'FORWARD_PEER'}).then(function (peerString) {
          var peerID = AppPeersManager.getPeerID(peerString);
          AppMessagesManager.forwardMessages(peerID, selectedMessageIDs).then(function () {
            selectedCancel();
            $rootScope.$broadcast('history_focus', {peerString: peerString});
          });
        });

      }
    }

    function toggleEdit () {
      if ($scope.historyState.selectActions) {
        selectedCancel();
      } else {
        $scope.historyState.selectActions = true;
        $scope.$broadcast('ui_panel_update');
      }
    }

    function toggleMedia (mediaType) {
      $scope.historyFilter.mediaType = mediaType || false;
      peerHistory.messages = [];
      $scope.state.empty = true;
      loadHistory();
    }

    function returnToRecent () {
      if ($scope.historyFilter.mediaType) {
        toggleMedia();
      } else {
        if ($scope.curDialog.messageID) {
          $rootScope.$broadcast('history_focus', {peerString: $scope.curDialog.peer});
        } else {
          loadHistory(true);
        }
      }
    }

    $scope.$on('history_update', angular.noop);

    var typingTimeouts = {};
    $scope.$on('history_append', function (e, addedMessage) {
      var history = historiesQueueFind(addedMessage.peerID);
      if (!history) {
        return;
      }
      var curPeer = addedMessage.peerID == $scope.curDialog.peerID;
      if (curPeer) {
        if ($scope.historyFilter.mediaType || $scope.skippedHistory) {
          if (addedMessage.my) {
            returnToRecent();
          } else {
            $scope.missedCount++;
          }
          return;
        }
        delete $scope.state.empty;
      }
      // console.log('append', addedMessage);
      // console.trace();
      history.messages.push(AppMessagesManager.wrapForHistory(addedMessage.messageID));
      if (AppMessagesManager.regroupWrappedHistory(history.messages, -3)) {
        $scope.$broadcast('messages_regroup');
      }

      if (curPeer) {
        $scope.historyState.typing.splice(0, $scope.historyState.typing.length);
        $scope.$broadcast('ui_history_append_new', {my: addedMessage.my});
        if (addedMessage.my && $scope.historyUnreadAfter) {
          delete $scope.historyUnreadAfter;
          $scope.$broadcast('messages_unread_after');
        }

        // console.log('append check', $rootScope.idle.isIDLE, addedMessage.peerID, $scope.curDialog.peerID);
        if (!$rootScope.idle.isIDLE) {
          $timeout(function () {
            AppMessagesManager.readHistory($scope.curDialog.inputPeer);
          });
        }
      }
    });

    $scope.$on('history_delete', function (e, historyUpdate) {
      var history = historiesQueueFind(historyUpdate.peerID);
      if (!history) {
        return;
      }
      var newMessages = [],
          i;

      for (i = 0; i < history.messages.length; i++) {
        if (!historyUpdate.msgs[history.messages[i].id]) {
          newMessages.push(history.messages[i]);
        }
      };
      history.messages = newMessages;
      AppMessagesManager.regroupWrappedHistory(history.messages);
      $scope.$broadcast('messages_regroup');
      if (historyUpdate.peerID == $scope.curDialog.peerID) {
        $scope.state.empty = !newMessages.length;
      }
    });

    $scope.$on('dialog_flush', function (e, dialog) {
      var history = historiesQueueFind(dialog.peerID);
      if (history) {
        history.messages = [];
        if (dialog.peerID == $scope.curDialog.peerID) {
          $scope.state.empty = true;
        }
      }
    });

    $scope.$on('history_focus', function (e, peerData) {
      if ($scope.historyFilter.mediaType) {
        toggleMedia();
      }
    });

    $scope.$on('apiUpdate', function (e, update) {
      switch (update._) {
        case 'updateUserTyping':
        case 'updateChatUserTyping':
          AppUsersManager.forceUserOnline(update.user_id);
          if (AppUsersManager.hasUser(update.user_id) &&
              $scope.curDialog.peerID == (update._ == 'updateUserTyping'
                ? update.user_id
                : -update.chat_id
              )) {
            if ($scope.historyState.typing.indexOf(update.user_id) == -1) {
              $scope.historyState.typing.push(update.user_id);
            }
            $timeout.cancel(typingTimeouts[update.user_id]);

            typingTimeouts[update.user_id] = $timeout(function () {
              var pos = $scope.historyState.typing.indexOf(update.user_id);
              if (pos !== -1) {
                $scope.historyState.typing.splice(pos, 1);
              }
            }, 6000);
          }
          break;
      }
    });

    $scope.$on('history_need_less', showLessHistory);
    $scope.$on('history_need_more', showMoreHistory);

    $rootScope.$watch('idle.isIDLE', function (newVal) {
      if (!newVal && $scope.curDialog && $scope.curDialog.peerID && !$scope.historyFilter.mediaType && !$scope.skippedHistory) {
        AppMessagesManager.readHistory($scope.curDialog.inputPeer);
      }
    });
  })

  .controller('AppImPanelController', function($scope, UsersManager) {
    // $scope.selectedUserId = UsersManager.getSelectedUserId();
    // $scope.$on('user_update', angular.noop);
  })

  .controller('AppImSendController', function (socket, MessagesManager, ThreadsManager, HistoriesManager, $scope, $rootScope, $timeout, MtpApiManager, Storage, AppPeersManager, AppMessagesManager, ApiUpdatesManager, MtpApiFileManager) {

    // var toUserId = $rootScope.selectedUserId;
    $scope.sendMsg = function () {
      var NOW = Math.round(+new Date()/1000);
      NOW++;
      var msgBody = {to: $rootScope.selectedUserId, msg:$scope.draftMessage.text, msgId:NOW};
      sendPacket(socket, {service:72,body:angular.toJson(msgBody)});
      MessagesManager.addMessage(msgBody);
      ThreadsManager.addThread(msgBody);
      HistoriesManager.addHistory(msgBody);
      $scope.$broadcast('history_selected');
      $scope.draftMessage = {text:""};
    }
    $scope.keypress = function(event){
        if (event.which === 13) {
            $scope.sendMsg();
        } else {
            sendPacket(socket, {service:142,body:JSON.stringify({to:$rootScope.selectedUserId})});
        }

    };

    $scope.$watch('curDialog.peer', resetDraft);
    $scope.$on('user_update', angular.noop);
    $scope.$on('ui_typing', onTyping);

    $scope.draftMessage = {text: '', send: sendMessage};
    // $scope.$watch('draftMessage.text', onMessageChange);
    $scope.$watch('draftMessage.files', onFilesSelected);

    function sendMessage (e) {
      $scope.$broadcast('ui_message_before_send');

      $timeout(function () {
        var text = $scope.draftMessage.text;

        if (angular.isString(text) && text.length > 0) {
          text = text.replace(/:([a-z0-9\-\+\*_]+?):/gi, function (all, name) {
            var utfChar = $.emojiarea.reverseIcons[name];
            if (utfChar !== undefined) {
              return utfChar;
            }
            return all;
          });

          var timeout = 0;
          do {

            (function (peerID, curText, curTimeout) {
              setTimeout(function () {
                AppMessagesManager.sendText(peerID, curText);
              }, curTimeout)
            })($scope.curDialog.peerID, text.substr(0, 4096), timeout);

            text = text.substr(4096);
            timeout += 100;

          } while (text.length);
        }

        resetDraft();
        $scope.$broadcast('ui_message_send');
      });

      return cancelEvent(e);
    }


    function resetDraft (newPeer) {
      if (newPeer) {
        Storage.get('draft' + $scope.curDialog.peerID).then(function (draftText) {
          // console.log('Restore draft', 'draft' + $scope.curDialog.peerID, draftText);
          $scope.draftMessage.text = draftText || '';
          // console.log('send broadcast', $scope.draftMessage);
          $scope.$broadcast('ui_peer_draft');
        });
      } else {
        // console.log('Reset peer');
        $scope.draftMessage.text = '';
        $scope.$broadcast('ui_peer_draft');
      }
    }

    function onMessageChange(newVal) {
      // console.log('ctrl text changed', newVal);
      // console.trace('ctrl text changed', newVal);

      if (newVal && newVal.length) {
        if (!$scope.historyFilter.mediaType && !$scope.skippedHistory) {
          AppMessagesManager.readHistory($scope.curDialog.inputPeer);
        }

        var backupDraftObj = {};
        backupDraftObj['draft' + $scope.curDialog.peerID] = newVal;
        Storage.set(backupDraftObj);
        // console.log('draft save', backupDraftObj);
      } else {
        Storage.remove('draft' + $scope.curDialog.peerID);
        // console.log('draft delete', 'draft' + $scope.curDialog.peerID);
      }
    }

    function onTyping () {
      MtpApiManager.invokeApi('messages.setTyping', {
        peer: $scope.curDialog.inputPeer,
        action: {_: 'sendMessageTypingAction'}
      });
    }

    function onFilesSelected (newVal) {
      if (!angular.isArray(newVal) || !newVal.length) {
        return;
      }

      for (var i = 0; i < newVal.length; i++) {
        AppMessagesManager.sendFile($scope.curDialog.peerID, newVal[i], {
          isMedia: $scope.draftMessage.isMedia
        });
        $scope.$broadcast('ui_message_send');
      }
    }
  })

  .controller('AppLangSelectController', function ($scope, _, Storage, ErrorService, AppRuntimeManager) {
    $scope.supportedLocales = Config.I18n.supported;
    $scope.langNames = Config.I18n.languages;
    $scope.curLocale = Config.I18n.locale;
    $scope.form = {locale: Config.I18n.locale};

    $scope.localeSelect = function localeSelect (newLocale) {
      newLocale = newLocale || $scope.form.locale;
      if ($scope.curLocale !== newLocale) {
        ErrorService.confirm({type: 'APPLY_LANG_WITH_RELOAD'}).then(function () {
          Storage.set({i18n_locale: newLocale}).then(function () {
            AppRuntimeManager.reload();
          });
        }, function () {
          $scope.form.locale = $scope.curLocale;
        });
      }
    };
  })

  .controller('AppFooterController', function ($scope, LayoutSwitchService) {
    // $scope.switchLayout = function (mobile) {
    //   LayoutSwitchService.switchLayout(mobile);
    // }
  })

  .controller('PhotoModalController', function ($q, $scope, $rootScope, $modalInstance, AppPhotosManager, AppMessagesManager, AppPeersManager, PeersSelectService, ErrorService) {

    $scope.photo = AppPhotosManager.wrapForFull($scope.photoID);
    $scope.nav = {};

    $scope.download = function () {
      AppPhotosManager.downloadPhoto($scope.photoID);
    };

    if (!$scope.messageID) {
      return;
    }


    $scope.forward = function () {
      var messageID = $scope.messageID;
      PeersSelectService.selectPeer({confirm_type: 'FORWARD_PEER'}).then(function (peerString) {
        var peerID = AppPeersManager.getPeerID(peerString);
        AppMessagesManager.forwardMessages(peerID, [messageID]).then(function () {
          $rootScope.$broadcast('history_focus', {peerString: peerString});
        });
      });
    };

    $scope.goToMessage = function () {
      var messageID = $scope.messageID;
      var peerID = AppMessagesManager.getMessagePeer(AppMessagesManager.getMessage(messageID));
      var peerString = AppPeersManager.getPeerString(peerID);
      $modalInstance.dismiss();
      $rootScope.$broadcast('history_focus', {peerString: peerString, messageID: messageID});
    };

    $scope['delete'] = function () {
      var messageID = $scope.messageID;
      ErrorService.confirm({type: 'MESSAGE_DELETE'}).then(function () {
        AppMessagesManager.deleteMessages([messageID]);
      });
    };

    var peerID = AppMessagesManager.getMessagePeer(AppMessagesManager.getMessage($scope.messageID)),
        inputPeer = AppPeersManager.getInputPeerByID(peerID),
        inputQuery = '',
        inputFilter = {_: 'inputMessagesFilterPhotos'},
        list = [$scope.messageID],
        preloaded = {},
        maxID = $scope.messageID,
        hasMore = true;

    preloaded[$scope.messageID] = true;

    updatePrevNext();

    AppMessagesManager.getSearch(inputPeer, inputQuery, inputFilter, 0, 1000).then(function (searchCachedResult) {
      if (searchCachedResult.history.indexOf($scope.messageID) >= 0) {
        list = searchCachedResult.history;
        maxID = list[list.length - 1];

        updatePrevNext();
        preloadPhotos(+1);
      }
      loadMore();
    }, loadMore);


    var jump = 0;
    function movePosition (sign) {
      var curIndex = list.indexOf($scope.messageID),
          index = curIndex >= 0 ? curIndex + sign : 0,
          curJump = ++jump;

      var promise = index >= list.length ? loadMore() : $q.when();
      promise.then(function () {
        if (curJump != jump) {
          return;
        }

        var messageID = list[index];
        var message = AppMessagesManager.getMessage(messageID);
        if (!message ||
            !message.media ||
            !message.media.photo ||
            !message.media.photo.id) {
          console.error('Invalid photo message', index, list, messageID, message);
          return;
        }

        $scope.messageID = messageID;
        $scope.photoID = message.media.photo.id;
        $scope.photo = AppPhotosManager.wrapForFull($scope.photoID);

        preloaded[$scope.messageID] = true;

        updatePrevNext();

        if (sign > 0 && hasMore && list.indexOf(messageID) + 1 >= list.length) {
          loadMore();
        } else {
          preloadPhotos(sign);
        }
      });
    };

    function preloadPhotos (sign) {
      // var preloadOffsets = sign < 0 ? [-1,-2,1,-3,2] : [1,2,-1,3,-2];
      var preloadOffsets = sign < 0 ? [-1,-2] : [1,2];
      var index = list.indexOf($scope.messageID);
      angular.forEach(preloadOffsets, function (offset) {
        var messageID = list[index + offset];
        if (messageID !== undefined && preloaded[messageID] === undefined) {
          preloaded[messageID] = true;
          var message = AppMessagesManager.getMessage(messageID);
          var photoID = message.media.photo.id;
          AppPhotosManager.preloadPhoto(photoID);
        }
      })
    }

    var loadingPromise = false;
    function loadMore () {
      if (loadingPromise) return loadingPromise;

      return loadingPromise = AppMessagesManager.getSearch(inputPeer, inputQuery, inputFilter, maxID).then(function (searchResult) {
        if (searchResult.history.length) {
          maxID = searchResult.history[searchResult.history.length - 1];
          list = list.concat(searchResult.history);
          hasMore = list.length < searchResult.count;
        } else {
          hasMore = false;
        }

        updatePrevNext(searchResult.count);
        loadingPromise = false;

        if (searchResult.history.length) {
          return $q.reject();
        }

        preloadPhotos(+1);
      });
    };

    function updatePrevNext (count) {
      var index = list.indexOf($scope.messageID);
      if (hasMore) {
        if (count) {
          $scope.count = Math.max(count, list.length);
        }
      } else {
        $scope.count = list.length;
      }
      $scope.pos = $scope.count - index;
      $scope.nav.hasNext = index > 0;
      $scope.nav.hasPrev = hasMore || index < list.length - 1;
      $scope.canForward = $scope.canDelete = $scope.messageID > 0;
    };

    $scope.nav.next = function () {
      if (!$scope.nav.hasNext) {
        return false;
      }

      movePosition(-1);
    };

    $scope.nav.prev = function () {
      if (!$scope.nav.hasPrev) {
        return false;
      }
      movePosition(+1);
    };

    $scope.$on('history_delete', function (e, historyUpdate) {
      if (historyUpdate.peerID == peerID) {
        if (historyUpdate.msgs[$scope.messageID]) {
          if ($scope.nav.hasNext) {
            $scope.nav.next();
          } else if ($scope.nav.hasPrev) {
            $scope.nav.prev();
          } else {
            return $modalInstance.dismiss();
          }
        }
        var newList = [];
        for (var i = 0; i < list.length; i++) {
          if (!historyUpdate.msgs[list[i]]) {
            newList.push(list[i]);
          }
        };
        list = newList;
      }
    });

  })

  .controller('UserpicModalController', function ($q, $scope, $rootScope, $modalInstance, AppPhotosManager, AppUsersManager, AppPeersManager, AppMessagesManager, PeersSelectService, ErrorService) {

    $scope.photo = AppPhotosManager.wrapForFull($scope.photoID);
    $scope.nav = {};
    $scope.canForward = true;

    var inputUser = AppUsersManager.getUserInput($scope.userID),
        list = [$scope.photoID],
        maxID = $scope.photoID,
        hasMore = true;

    updatePrevNext();

    AppPhotosManager.getUserPhotos(inputUser, 0, 1000).then(function (userpicCachedResult) {
      if (userpicCachedResult.photos.indexOf($scope.photoID) >= 0) {
        list = userpicCachedResult.photos;
        maxID = list[list.length - 1];
        hasMore = list.length < userpicCachedResult.count;

        updatePrevNext();
      }
    });


    var jump = 0;
    function movePosition (sign) {
      var curIndex = list.indexOf($scope.photoID),
          index = curIndex >= 0 ? curIndex + sign : 0,
          curJump = ++jump;

      var promise = index >= list.length ? loadMore() : $q.when();
      promise.then(function () {
        if (curJump != jump) {
          return;
        }

        $scope.photoID = list[index];
        $scope.photo = AppPhotosManager.wrapForFull($scope.photoID);

        updatePrevNext();
      });
    };

    var loadingPromise = false;
    function loadMore () {
      if (loadingPromise) return loadingPromise;

      return loadingPromise = AppPhotosManager.getUserPhotos(inputUser, maxID).then(function (userpicResult) {
        maxID = userpicResult.photos[userpicResult.photos.length - 1];
        list = list.concat(userpicResult.photos);

        hasMore = list.length < userpicResult.count;

        updatePrevNext();
        loadingPromise = false;
      }, function () {
        loadingPromise = false;
      });
    };

    function updatePrevNext () {
      var index = list.indexOf($scope.photoID);
      $scope.nav.hasNext = index > 0;
      $scope.nav.hasPrev = hasMore || index < list.length - 1;
    };

    $scope.nav.next = function () {
      if (!$scope.nav.hasNext) {
        return false;
      }

      movePosition(-1);
    };

    $scope.nav.prev = function () {
      if (!$scope.nav.hasPrev) {
        return false;
      }
      movePosition(+1);
    };

    $scope.forward = function () {
      var messageID = $scope.photoID;
      PeersSelectService.selectPeer({confirm_type: 'FORWARD_PEER'}).then(function (peerString) {
        var peerID = AppPeersManager.getPeerID(peerString);
        AppMessagesManager.sendOther(peerID, {
          _: 'inputMediaPhoto',
          id: {
            _: 'inputPhoto',
            id: $scope.photoID,
            access_hash: $scope.photo.access_hash,
          }
        });
        $rootScope.$broadcast('history_focus', {peerString: peerString});
      });
    };

    $scope['delete'] = function () {
      var messageID = $scope.photoID;
      ErrorService.confirm({type: 'MESSAGE_DELETE'}).then(function () {
        AppMessagesManager.deleteMessages([messageID]);
      });
    };

    $scope.download = function () {
      AppPhotosManager.downloadPhoto($scope.photoID);
    };

  })

  .controller('VideoModalController', function ($scope, $rootScope, $modalInstance, PeersSelectService, AppMessagesManager, AppVideoManager, AppPeersManager, ErrorService) {

    $scope.video = AppVideoManager.wrapForFull($scope.videoID);

    $scope.progress = {enabled: false};
    $scope.player = {};


    $scope.forward = function () {
      var messageID = $scope.messageID;
      PeersSelectService.selectPeer({confirm_type: 'FORWARD_PEER'}).then(function (peerString) {
        var peerID = AppPeersManager.getPeerID(peerString);
        AppMessagesManager.forwardMessages(peerID, [messageID]).then(function () {
          $rootScope.$broadcast('history_focus', {peerString: peerString});
        });
      });
    };

    $scope['delete'] = function () {
      var messageID = $scope.messageID;
      ErrorService.confirm({type: 'MESSAGE_DELETE'}).then(function () {
        AppMessagesManager.deleteMessages([messageID]);
      });
    };

    $scope.download = function () {
      AppVideoManager.saveVideoFile($scope.videoID);
    };

    $scope.$on('history_delete', function (e, historyUpdate) {
      if (historyUpdate.msgs[$scope.messageID]) {
        $modalInstance.dismiss();
      }
    });
  })

  .controller('DocumentModalController', function ($scope, $rootScope, $modalInstance, PeersSelectService, AppMessagesManager, AppDocsManager, AppPeersManager, ErrorService) {

    $scope.document = AppDocsManager.wrapForHistory($scope.docID);

    $scope.forward = function () {
      var messageID = $scope.messageID;
      PeersSelectService.selectPeer({confirm_type: 'FORWARD_PEER'}).then(function (peerString) {
        var peerID = AppPeersManager.getPeerID(peerString);
        AppMessagesManager.forwardMessages(peerID, [messageID]).then(function () {
          $rootScope.$broadcast('history_focus', {peerString: peerString});
        });
      });
    };

    $scope['delete'] = function () {
      var messageID = $scope.messageID;
      ErrorService.confirm({type: 'MESSAGE_DELETE'}).then(function () {
        AppMessagesManager.deleteMessages([messageID]);
      });
    };

    $scope.download = function () {
      AppDocsManager.saveDocFile($scope.docID);
    };

    $scope.$on('history_delete', function (e, historyUpdate) {
      if (historyUpdate.msgs[$scope.messageID]) {
        $modalInstance.dismiss();
      }
    });
  })

  .controller('UserModalController', function ($scope, $location, $rootScope, $modal, AppUsersManager, MtpApiManager, NotificationsManager, AppPhotosManager, AppMessagesManager, AppPeersManager, PeersSelectService, ErrorService) {

    $scope.goToHistory = function (userId) {
      $rootScope.$broadcast('history_focus', {peerString: 'u' + userId});
    };

    $scope.importContact = function (userId) {
      console.log ('importContact: ', userId);
      MtpApiManager.makeFriend(userId);
      MtpApiManager.sendMsg ('add friends', userId);
    };

    $scope.flushHistory = function () {
      ErrorService.confirm({type: 'HISTORY_FLUSH'}).then(function () {
        AppMessagesManager.flushHistory(AppPeersManager.getInputPeerByID($scope.userID)).then(function () {
          $scope.goToHistory();
        });
      });
    };

    $scope.deleteContact = function () {
      AppUsersManager.deleteContacts([$scope.userID]).then(function () {
        $scope.user = AppUsersManager.getUser($scope.userID);
      });
    };

    $scope.toggleBlock = function (block) {
      MtpApiManager.invokeApi(block ? 'contacts.block' : 'contacts.unblock', {
        id: AppUsersManager.getUserInput($scope.userID)
      }).then(function () {
        $scope.blocked = block;
      });
    };

    $scope.shareContact = function () {
      PeersSelectService.selectPeer({confirm_type: 'SHARE_CONTACT_PEER'}).then(function (peerString) {
        var peerID = AppPeersManager.getPeerID(peerString);

        AppMessagesManager.sendOther(peerID, {
          _: 'inputMediaContact',
          phone_number: $scope.user.phone,
          first_name: $scope.user.first_name,
          last_name: $scope.user.last_name,
          user_id: $scope.user.id
        });
        $rootScope.$broadcast('history_focus', {peerString: peerString});
      })
    }

  })

  .controller('ChatModalController', function ($scope, $timeout, $rootScope, $modal, AppUsersManager, AppChatsManager, MtpApiManager, MtpApiFileManager, NotificationsManager, AppMessagesManager, AppPeersManager, ApiUpdatesManager, ContactsSelectService, ErrorService) {

    $scope.chatFull = AppChatsManager.wrapForFull($scope.chatID, {});

    MtpApiManager.invokeApi('messages.getFullChat', {
      chat_id: $scope.chatID
    }).then(function (result) {
      AppChatsManager.saveApiChats(result.chats);
      AppUsersManager.saveApiUsers(result.users);

      $scope.chatFull = AppChatsManager.wrapForFull($scope.chatID, result.full_chat);
      $scope.$broadcast('ui_height');
    });

    $scope.settings = {notifications: true};

    NotificationsManager.getPeerMuted(-$scope.chatID).then(function (muted) {
      $scope.settings.notifications = !muted;

      $scope.$watch('settings.notifications', function(newValue, oldValue) {
        if (newValue === oldValue) {
          return false;
        }
        NotificationsManager.getPeerSettings(-$scope.chatID).then(function (settings) {
          if (newValue) {
            settings.mute_until = 0;
          } else {
            settings.mute_until = 2000000000;
          }
          NotificationsManager.updatePeerSettings(-$scope.chatID, settings);
        });
      });
    });

    function onStatedMessage (statedMessage) {
      ApiUpdatesManager.processUpdateMessage({
        _: 'updates',
        users: statedMessage.users,
        chats: statedMessage.chats,
        seq: statedMessage.seq,
        updates: [{
          _: 'updateNewMessage',
          message: statedMessage.message,
          pts: statedMessage.pts
        }]
      });

      $rootScope.$broadcast('history_focus', {peerString: $scope.chatFull.peerString});
    }


    $scope.leaveGroup = function () {
      MtpApiManager.invokeApi('messages.deleteChatUser', {
        chat_id: $scope.chatID,
        user_id: {_: 'inputUserSelf'}
      }).then(onStatedMessage);
    };

    $scope.returnToGroup = function () {
      MtpApiManager.invokeApi('messages.addChatUser', {
        chat_id: $scope.chatID,
        user_id: {_: 'inputUserSelf'}
      }).then(onStatedMessage);
    };


    $scope.inviteToGroup = function () {
      var disabled = [];
      angular.forEach($scope.chatFull.participants.participants, function(participant){
        disabled.push(participant.user_id);
      });

      ContactsSelectService.selectContacts({disabled: disabled}).then(function (userIDs) {
        angular.forEach(userIDs, function (userID) {
          MtpApiManager.invokeApi('messages.addChatUser', {
            chat_id: $scope.chatID,
            user_id: AppUsersManager.getUserInput(userID),
            fwd_limit: 100
          }).then(function (addResult) {
            ApiUpdatesManager.processUpdateMessage({
              _: 'updates',
              seq: addResult.seq,
              users: addResult.users,
              chats: addResult.chats,
              updates: [{
                _: 'updateNewMessage',
                message: addResult.message,
                pts: addResult.pts
              }]
            });
          });
        });

        $rootScope.$broadcast('history_focus', {peerString: $scope.chatFull.peerString});
      });
    };

    $scope.kickFromGroup = function (userID) {
      var user = AppUsersManager.getUser(userID);

      MtpApiManager.invokeApi('messages.deleteChatUser', {
        chat_id: $scope.chatID,
        user_id: {_: 'inputUserForeign', user_id: userID, access_hash: user.access_hash || '0'}
      }).then(onStatedMessage);
    };



    $scope.flushHistory = function () {
      ErrorService.confirm({type: 'HISTORY_FLUSH'}).then(function () {
        AppMessagesManager.flushHistory(AppPeersManager.getInputPeerByID(-$scope.chatID)).then(function () {
          $rootScope.$broadcast('history_focus', {peerString: $scope.chatFull.peerString});
        });
      });
    };


    $scope.photo = {};

    $scope.$watch('photo.file', onPhotoSelected);

    function onPhotoSelected (photo) {
      if (!photo || !photo.type || photo.type.indexOf('image') !== 0) {
        return;
      }
      $scope.photo.updating = true;
      MtpApiFileManager.uploadFile(photo).then(function (inputFile) {
        return MtpApiManager.invokeApi('messages.editChatPhoto', {
          chat_id: $scope.chatID,
          photo: {
            _: 'inputChatUploadedPhoto',
            file: inputFile,
            crop: {_: 'inputPhotoCropAuto'}
          }
        }).then(function (updateResult) {
          onStatedMessage(updateResult);
        });
      })['finally'](function () {
        $scope.photo.updating = false;
      });
    };

    $scope.deletePhoto = function () {
      $scope.photo.updating = true;
      MtpApiManager.invokeApi('messages.editChatPhoto', {
        chat_id: $scope.chatID,
        photo: {_: 'inputChatPhotoEmpty'}
      }).then(function (updateResult) {
        onStatedMessage(updateResult);
      })['finally'](function () {
        $scope.photo.updating = false;
      });
    };

    $scope.editTitle = function () {
      var scope = $rootScope.$new();
      scope.chatID = $scope.chatID;

      $modal.open({
        templateUrl: templateUrl('chat_edit_modal'),
        controller: 'ChatEditModalController',
        scope: scope,
        windowClass: 'group_edit_modal_window mobile_modal'
      });
    }

  })

  .controller('SettingsModalController', function ($rootScope, $scope, $timeout, $modal, AppUsersManager, AppChatsManager, AppPhotosManager, MtpApiManager, Storage, NotificationsManager, MtpApiFileManager, ApiUpdatesManager, ChangelogNotifyService, ErrorService, _) {

    $scope.profile = {};
    $scope.photo = {};
    $scope.version = Config.App.version;

    MtpApiManager.getUserID().then(function (id) {
      $scope.profile = AppUsersManager.getUser(id);
      $scope.photo = AppUsersManager.getUserPhoto(id, 'User');
    });

    MtpApiManager.invokeApi('users.getFullUser', {
      id: {_: 'inputUserSelf'}
    }).then(function (userFullResult) {
      AppUsersManager.saveApiUser(userFullResult.user);
      AppPhotosManager.savePhoto(userFullResult.profile_photo);
      if (userFullResult.profile_photo._ != 'photoEmpty') {
        $scope.photo.id = userFullResult.profile_photo.id;
      }
    });

    $scope.notify = {volume: 0.5};
    $scope.send = {};

    $scope.$watch('photo.file', onPhotoSelected);

    function onPhotoSelected (photo) {
      if (!photo || !photo.type || photo.type.indexOf('image') !== 0) {
        return;
      }
      $scope.photo.updating = true;
      MtpApiFileManager.uploadFile(photo).then(function (inputFile) {
        MtpApiManager.invokeApi('photos.uploadProfilePhoto', {
          file: inputFile,
          caption: '',
          geo_point: {_: 'inputGeoPointEmpty'},
          crop: {_: 'inputPhotoCropAuto'}
        }).then(function (updateResult) {
          AppUsersManager.saveApiUsers(updateResult.users);
          MtpApiManager.getUserID().then(function (id) {
            ApiUpdatesManager.processUpdateMessage({
              _: 'updateShort',
              update: {
                _: 'updateUserPhoto',
                user_id: id,
                date: tsNow(true),
                photo: AppUsersManager.getUser(id).photo,
                previous: true
              }
            });
            $scope.photo = AppUsersManager.getUserPhoto(id, 'User');
          });
        });
      })['finally'](function () {
        delete $scope.updating;
      });
    };

    $scope.deletePhoto = function () {
      $scope.photo.updating = true;
      MtpApiManager.invokeApi('photos.updateProfilePhoto', {
        id: {_: 'inputPhotoEmpty'},
        crop: {_: 'inputPhotoCropAuto'}
      }).then(function (updateResult) {
        MtpApiManager.getUserID().then(function (id) {
          ApiUpdatesManager.processUpdateMessage({
            _: 'updateShort',
            update: {
              _: 'updateUserPhoto',
              user_id: id,
              date: tsNow(true),
              photo: updateResult,
              previous: true
            }
          });
          $scope.photo = AppUsersManager.getUserPhoto(id, 'User');
        });
      })['finally'](function () {
        delete $scope.photo.updating;
      });
    };

    $scope.editProfile = function () {
      $modal.open({
        templateUrl: templateUrl('profile_edit_modal'),
        controller: 'ProfileEditModalController',
        windowClass: 'profile_edit_modal_window mobile_modal'
      });
    };

    $scope.changeUsername = function () {
      $modal.open({
        templateUrl: templateUrl('username_edit_modal'),
        controller: 'UsernameEditModalController',
        windowClass: 'username_edit_modal_window mobile_modal'
      });
    };

    $scope.terminateSessions = function () {
      ErrorService.confirm({type: 'TERMINATE_SESSIONS'}).then(function () {
        MtpApiManager.invokeApi('auth.resetAuthorizations', {});
      });
    };

    Storage.get('notify_nodesktop', 'notify_nosound', 'send_ctrlenter', 'notify_volume', 'notify_novibrate').then(function (settings) {
      $scope.notify.desktop = !settings[0];
      $scope.send.enter = settings[2] ? '' : '1';

      if (settings[1]) {
        $scope.notify.volume = 0;
      } else if (settings[3] !== false) {
        $scope.notify.volume = settings[3] > 0 && settings[3] <= 1.0 ? settings[3] : 0;
      } else {
        $scope.notify.volume = 0.5;
      }

      $scope.notify.canVibrate = NotificationsManager.getVibrateSupport();
      $scope.notify.vibrate = !settings[4];

      $scope.notify.volumeOf4 = function () {
        return 1 + Math.ceil(($scope.notify.volume - 0.1) / 0.33);
      };

      $scope.toggleSound = function () {
        if ($scope.notify.volume) {
          $scope.notify.volume = 0;
        } else {
          $scope.notify.volume = 0.5;
        }
      }

      var testSoundPromise;
      $scope.$watch('notify.volume', function (newValue, oldValue) {
        if (newValue !== oldValue) {
          Storage.set({notify_volume: newValue});
          Storage.remove('notify_nosound');
          NotificationsManager.clear();

          if (testSoundPromise) {
            $timeout.cancel(testSoundPromise);
          }
          testSoundPromise = $timeout(function () {
            NotificationsManager.testSound(newValue);
          }, 500);
        }
      });

      $scope.toggleDesktop = function () {
        $scope.notify.desktop = !$scope.notify.desktop;

        if ($scope.notify.desktop) {
          Storage.remove('notify_nodesktop');
        } else {
          Storage.set({notify_nodesktop: true});
        }
      }

      $scope.toggleVibrate = function () {
        $scope.notify.vibrate = !$scope.notify.vibrate;

        if ($scope.notify.vibrate) {
          Storage.remove('notify_novibrate');
        } else {
          Storage.set({notify_novibrate: true});
        }
      }

      $scope.toggleCtrlEnter = function (newValue) {
        $scope.send.enter = newValue;

        if ($scope.send.enter) {
          Storage.remove('send_ctrlenter');
        } else {
          Storage.set({send_ctrlenter: true});
        }
        $rootScope.$broadcast('settings_changed');
      }
    });

    $scope.openChangelog = function () {
      ChangelogNotifyService.showChangelog(false);
    }
  })

  .controller('ChangelogModalController', function ($scope, $modal) {
    $scope.changeUsername = function () {
      $modal.open({
        templateUrl: templateUrl('username_edit_modal'),
        controller: 'UsernameEditModalController',
        windowClass: 'username_edit_modal_window mobile_modal'
      });
    };
  })

  .controller('ProfileEditModalController', function ($scope,  $modalInstance, AppUsersManager, MtpApiManager) {

    $scope.profile = {};
    $scope.error = {};

    MtpApiManager.getUserID().then(function (id) {
      $scope.profile = AppUsersManager.getUser(id);
    });

    $scope.updateProfile = function () {
      $scope.profile.updating = true;

      MtpApiManager.invokeApi('account.updateProfile', {
        first_name: $scope.profile.first_name || '',
        last_name: $scope.profile.last_name || ''
      }).then(function (user) {
        $scope.error = {};
        AppUsersManager.saveApiUser(user);
        $modalInstance.close();
      }, function (error) {
        switch (error.type) {
          case 'FIRSTNAME_INVALID':
            $scope.error = {field: 'first_name'};
            error.handled = true;
            break;

          case 'LASTNAME_INVALID':
            $scope.error = {field: 'last_name'};
            error.handled = true;
            break;

          case 'NAME_NOT_MODIFIED':
            error.handled = true;
            $modalInstance.close();
            break;
        }
      })['finally'](function () {
        delete $scope.profile.updating;
      });
    }
  })

  .controller('UsernameEditModalController', function ($scope,  $modalInstance, AppUsersManager, MtpApiManager) {

    $scope.profile = {};
    $scope.error = {};

    MtpApiManager.getUserID().then(function (id) {
      $scope.profile = angular.copy(AppUsersManager.getUser(id));
    });

    $scope.updateUsername = function () {
      $scope.profile.updating = true;

      MtpApiManager.invokeApi('account.updateUsername', {
        username: $scope.profile.username || ''
      }).then(function (user) {
        $scope.checked = {};
        AppUsersManager.saveApiUser(user);
        $modalInstance.close();
      }, function (error) {
        if (error.type == 'USERNAME_NOT_MODIFIED') {
          error.handled = true;
          $modalInstance.close();
        }
      })['finally'](function () {
        delete $scope.profile.updating;
      });
    }

    $scope.$watch('profile.username', function (newVal) {
      if (!newVal.length) {
        $scope.checked = {};
        return;
      }
      MtpApiManager.invokeApi('account.checkUsername', {
        username: newVal || ''
      }).then(function (valid) {
        if ($scope.profile.username != newVal) {
          return;
        }
        if (valid) {
          $scope.checked = {success: true};
        } else {
          $scope.checked = {error: true};
        }
      }, function (error) {
        if ($scope.profile.username != newVal) {
          return;
        }
        switch (error.type) {
          case 'USERNAME_INVALID':
            $scope.checked = {error: true};
            error.handled = true;
            break;
        }
      });
    })
  })

  .controller('ContactsModalController', function (UsersManager, ThreadsManager, $rootScope, $scope, $timeout, $modal, $modalInstance, MtpApiManager, AppUsersManager, ErrorService) {

    $scope.randomAvatarColor = function(uid) {
        return 'user_bgcolor_' + uid%7;
    }
    $scope.getAvatarText = function(fullname){
        var key = "";
        if (!fullname) return "";

        var words = fullname.split(" ");
        if (words.length == 1) {
            key = words[0].substring(0, words[0].length == 1 ? 1 : 2);
        } else {
            key = words[0].substring(0, 1) + words[words.length - 1].substring(0, 1);
        }

        return key.toUpperCase();
    };

    $scope.contacts = UsersManager.getUsers();
    $scope.foundUsers = [];
    $scope.search = {};
    $scope.slice = {limit: 20, limitDelta: 20};

    var jump = 0;

    resetSelected();
    $scope.disabledContacts = {};

    if ($scope.disabled) {
      for (var i = 0; i < $scope.disabled.length; i++) {
        $scope.disabledContacts[$scope.disabled[i]] = true;
      }
    }

    if ($scope.selected) {
      for (var i = 0; i < $scope.selected.length; i++) {
        if (!$scope.selectedContacts[$scope.selected[i]]) {
          $scope.selectedContacts[$scope.selected[i]] = true;
          $scope.selectedCount++;
        }
      }
    }

    function resetSelected () {
      $scope.selectedContacts = {};
      $scope.selectedCount = 0;
    };

    function updateContacts (query) {
      $scope.contacts = UsersManager.getUsers();
    };

    $scope.$watch('search.query', updateContacts);
    $scope.$on('contacts_update', function () {
      updateContacts($scope.search && $scope.search.query || '');
    });

    $scope.toggleEdit = function (enabled) {
      $scope.action = enabled ? 'edit' : '';
      $scope.multiSelect = enabled;
      resetSelected();
    };

    $scope.contactSelect = function (userID) {
      $rootScope.selectedUserId = userID;
      var userInfo = UsersManager.getUserById(userID);
      var newThread = {from:userID, latestMessage:"", avatarSmall:userInfo.avatarSmall, fullname:userInfo.fullname, msgId:0};
      ThreadsManager.addThread(newThread);
      $rootScope.$broadcast('history_selected', userInfo);
    };

    $scope.submitSelected = function () {
      if ($scope.selectedCount > 0) {
        var selectedUserIDs = [];
        angular.forEach($scope.selectedContacts, function (t, userID) {
          selectedUserIDs.push(userID);
        });
        return $modalInstance.close(selectedUserIDs);
      }
    };

    $scope.deleteSelected = function () {
      if ($scope.selectedCount > 0) {
        var selectedUserIDs = [];
        angular.forEach($scope.selectedContacts, function (t, userID) {
          selectedUserIDs.push(userID);
        });
        AppUsersManager.deleteContacts(selectedUserIDs).then(function () {
          $scope.toggleEdit(false);
        });
      }
    };

    $scope.importContact = function () {
      AppUsersManager.openImportContact();
    };

  })

  .controller('PeerSelectController', function ($scope, $modalInstance, $q, AppPeersManager, ErrorService) {

    $scope.dialogSelect = function (peerString) {
      console.log ('PeerSelectController');
      var promise;
      if ($scope.confirm_type) {
        var peerID = AppPeersManager.getPeerID(peerString),
            peerData = AppPeersManager.getPeer(peerID);
        promise = ErrorService.confirm({
          type: $scope.confirm_type,
          peer_id: peerID,
          peer_data: peerData
        });
      } else {
        promise = $q.when();
      }
      promise.then(function () {
        $modalInstance.close(peerString);
      });
    };

    $scope.toggleSearch = function () {
      $scope.$broadcast('dialogs_search_toggle');
    };
  })

  .controller('ChatCreateModalController', function ($scope, $modalInstance, $rootScope, MtpApiManager, AppUsersManager, AppChatsManager, ApiUpdatesManager) {
    $scope.group = {name: ''};

    $scope.createGroup = function () {
      if (!$scope.group.name) {
        return;
      }
      $scope.group.creating = true;
      var inputUsers = [];
      angular.forEach($scope.userIDs, function(userID) {
        inputUsers.push(AppUsersManager.getUserInput(userID));
      });
      return MtpApiManager.invokeApi('messages.createChat', {
        title: $scope.group.name,
        users: inputUsers
      }).then(function (createdResult) {
        ApiUpdatesManager.processUpdateMessage({
          _: 'updates',
          seq: createdResult.seq,
          users: createdResult.users,
          chats: createdResult.chats,
          updates: [{
            _: 'updateNewMessage',
            message: createdResult.message,
            pts: createdResult.pts
          }]
        });

        var peerString = AppChatsManager.getChatString(createdResult.message.to_id.chat_id);
        $rootScope.$broadcast('history_focus', {peerString: peerString});
      })['finally'](function () {
        delete $scope.group.creating;
      });
    };

  })

  .controller('ChatEditModalController', function ($scope, $modalInstance, $rootScope, MtpApiManager, AppUsersManager, AppChatsManager, ApiUpdatesManager) {

    var chat = AppChatsManager.getChat($scope.chatID);
    $scope.group = {name: chat.title};

    $scope.updateGroup = function () {
      if (!$scope.group.name) {
        return;
      }
      if ($scope.group.name == chat.title) {
        return $modalInstance.close();
      }

      $scope.group.updating = true;

      return MtpApiManager.invokeApi('messages.editChatTitle', {
        chat_id: $scope.chatID,
        title: $scope.group.name
      }).then(function (editResult) {
        ApiUpdatesManager.processUpdateMessage({
          _: 'updates',
          seq: editResult.seq,
          users: editResult.users,
          chats: editResult.chats,
          updates: [{
            _: 'updateNewMessage',
            message: editResult.message,
            pts: editResult.pts
          }]
        });

        var peerString = AppChatsManager.getChatString($scope.chatID);
        $rootScope.$broadcast('history_focus', {peerString: peerString});
      })['finally'](function () {
        delete $scope.group.updating;
      });
    };
  })

  .controller('ImportContactModalController', function ($scope, $modalInstance, $rootScope, AppUsersManager, ErrorService, PhonebookContactsService) {
    if ($scope.importContact === undefined) {
      $scope.importContact = {};
    }

    $scope.phonebookAvailable = PhonebookContactsService.isAvailable();

    $scope.doImport = function () {
      if ($scope.importContact && $scope.importContact.phone) {
        $scope.progress = {enabled: true};
        AppUsersManager.importContact(
          $scope.importContact.phone,
          $scope.importContact.first_name || '',
          $scope.importContact.last_name || ''
        ).then(function (foundUserID) {
          if (!foundUserID) {
            ErrorService.show({
              error: {code: 404, type: 'USER_NOT_USING_TELEGRAM'}
            });
          }
          $modalInstance.close(foundUserID);
        })['finally'](function () {
          delete $scope.progress.enabled;
        });
      }
    };

    $scope.importPhonebook = function () {
      PhonebookContactsService.openPhonebookImport().result.then(function (foundContacts) {
        if (foundContacts) {
          $modalInstance.close(foundContacts[0]);
        } else {
          $modalInstance.dismiss();
        }
      })
    };

  })

  .controller('CountrySelectModalController', function ($scope, $modalInstance, $rootScope, SearchIndexManager, _) {

    $scope.search = {};
    $scope.slice = {limit: 20, limitDelta: 20}

    var searchIndex = SearchIndexManager.createIndex();

    for (var i = 0; i < Config.CountryCodes.length; i++) {
      var searchString = Config.CountryCodes[i][0];
      searchString += ' ' + _(Config.CountryCodes[i][1] + '_raw');
      searchString += ' ' + Config.CountryCodes[i].slice(2).join(' ');
      SearchIndexManager.indexObject(i, searchString, searchIndex);
    }

    $scope.$watch('search.query', function (newValue) {
      var filtered = false,
          results = {};

      if (angular.isString(newValue) && newValue.length) {
        filtered = true;
        results = SearchIndexManager.search(newValue, searchIndex);
      }

      $scope.countries = [];
      $scope.slice.limit = 20;

      var j;
      for (var i = 0; i < Config.CountryCodes.length; i++) {
        if (!filtered || results[i]) {
          for (j = 2; j < Config.CountryCodes[i].length; j++) {
            $scope.countries.push({name: _(Config.CountryCodes[i][1] + '_raw'), code: Config.CountryCodes[i][j]});
          }
        }
      }
      if (String.prototype.localeCompare) {
        $scope.countries.sort(function(a, b) {
          return a.name.localeCompare(b.name);
        });
      }
    });
  })


  .controller('PhonebookModalController', function ($scope, $modalInstance, $rootScope, AppUsersManager, PhonebookContactsService, SearchIndexManager, ErrorService) {

    $scope.search           = {};
    $scope.phonebook        = [];
    $scope.selectedContacts = {};
    $scope.selectedCount    = 0;
    $scope.slice            = {limit: 20, limitDelta: 20};
    $scope.progress         = {enabled: false};
    $scope.multiSelect      = true;

    var searchIndex = SearchIndexManager.createIndex(),
        phonebookReady = false;

    PhonebookContactsService.getPhonebookContacts().then(function (phonebook) {
      for (var i = 0; i < phonebook.length; i++) {
        SearchIndexManager.indexObject(i, phonebook[i].first_name + ' ' + phonebook[i].last_name + ' ' + phonebook[i].phones.join(' '), searchIndex);
      }
      $scope.phonebook = phonebook;
      $scope.toggleSelection(true);
      phonebookReady = true;
      updateList();
    }, function (error) {
      ErrorService.show({
        error: {code: 403, type: 'PHONEBOOK_GET_CONTACTS_FAILED', originalError: error}
      });
    });

    function updateList () {
      var filtered = false,
          results = {};

      if (angular.isString($scope.search.query) && $scope.search.query.length) {
        filtered = true;
        results = SearchIndexManager.search($scope.search.query, searchIndex);

        $scope.contacts = [];
        delete $scope.contactsEmpty;
        for (var i = 0; i < $scope.phonebook.length; i++) {
          if (!filtered || results[i]) {
            $scope.contacts.push($scope.phonebook[i]);
          }
        }
      } else {
        $scope.contacts = $scope.phonebook;
        $scope.contactsEmpty = !$scope.contacts.length;
      }
      var friends = "{\"friends\":[{\"sex\":2,\"lastVisitDate\":1422462534,\"avatarSmall\":\"http://s0.ubon.vn/avatar/2015/01/09/1420815728361_ios_file0.jpg\",\"status\":0,\"type\":0,\"privacyViewProfile\":0,\"statusMessage\":\"Life is beautiful\",\"fullnameAscii\":\"Quynh OTT\",\"modified\":1421031899,\"username\":\"\",\"userId\":9473,\"relType\":1,\"privacyComment\":2,\"privacyReceiveMessage\":0,\"privacyPostProfile\":2,\"fullname\":\"Quynh OTT\"},{\"sex\":2,\"lastVisitDate\":1422354880,\"avatarSmall\":\"\",\"status\":0,\"type\":0,\"privacyViewProfile\":0,\"fullnameAscii\":\"sjfjd sjs\",\"modified\":1418207878,\"username\":\"\",\"userId\":11073,\"relType\":2,\"privacyComment\":2,\"privacyReceiveMessage\":0,\"privacyPostProfile\":2,\"fullname\":\"sjfjd sjs\"},{\"sex\":2,\"lastVisitDate\":1422494292,\"avatarSmall\":\"http://s1.ubon.vn/avatar/2015/01/19/1421655192173_1421655085917.jpg\",\"status\":0,\"type\":0,\"privacyViewProfile\":0,\"statusMessage\":\"yawn\",\"fullnameAscii\":\"Cong Map\",\"modified\":1421655199,\"username\":\"\",\"userId\":11679,\"relType\":2,\"privacyComment\":2,\"privacyReceiveMessage\":0,\"privacyPostProfile\":2,\"fullname\":\"Công Mập\"},{\"sex\":2,\"lastVisitDate\":1422335198,\"avatarSmall\":\"\",\"status\":0,\"type\":0,\"privacyViewProfile\":0,\"statusMessage\":\"yawndsfsdf\",\"fullnameAscii\":\"Cong Test\",\"modified\":1418809521,\"username\":\"\",\"userId\":17371,\"relType\":2,\"privacyComment\":2,\"privacyReceiveMessage\":0,\"privacyPostProfile\":2,\"fullname\":\"Công Test\"},{\"sex\":2,\"lastVisitDate\":1422491214,\"avatarSmall\":\"http://s1.ubon.vn/avatar/2014/12/12/1418438259212_ios_file0.jpg\",\"status\":0,\"type\":0,\"privacyViewProfile\":0,\"statusMessage\":\"Sólo consultas sobre UBon.\",\"fullnameAscii\":\"UBon\",\"modified\":1420577701,\"username\":\"ubon\",\"userId\":1,\"relType\":2,\"privacyComment\":2,\"privacyReceiveMessage\":0,\"privacyPostProfile\":2,\"fullname\":\"UBon\"},{\"sex\":2,\"lastVisitDate\":1422491848,\"avatarSmall\":\"\",\"status\":0,\"type\":0,\"privacyViewProfile\":0,\"statusMessage\":\"\",\"fullnameAscii\":\"Vt A Huydn2\",\"modified\":1422005234,\"aliasName\":\"Vt A Huydn2\",\"aliasNameAscii\":\"Vt A Huydn2\",\"username\":\"\",\"phoneNumber\":\"84986776707\",\"userId\":9851,\"relType\":2,\"privacyComment\":2,\"privacyReceiveMessage\":0,\"privacyPostProfile\":2,\"fullname\":\"Vt A Huydn2\"},{\"sex\":2,\"lastVisitDate\":1422454742,\"avatarSmall\":\"http://s1.ubon.vn/avatar/2015/01/08/1420772021781_ios_file0.jpg\",\"status\":0,\"type\":0,\"privacyViewProfile\":0,\"statusMessage\":\"oOoOoOoOoOoOoOo\",\"fullnameAscii\":\"Phu\",\"modified\":1420772022,\"username\":\"\",\"userId\":9472,\"relType\":2,\"privacyComment\":0,\"privacyReceiveMessage\":0,\"privacyPostProfile\":0,\"fullname\":\"Phu\"},{\"sex\":1,\"lastVisitDate\":1422432763,\"avatarSmall\":\"\",\"status\":0,\"type\":0,\"privacyViewProfile\":0,\"statusMessage\":\"Thứ 7\",\"fullnameAscii\":\"Kim Cuc Nguyen\",\"modified\":1422350561,\"username\":\"\",\"userId\":17631,\"relType\":1,\"privacyComment\":2,\"privacyReceiveMessage\":0,\"privacyPostProfile\":2,\"fullname\":\"Kim Cuc Nguyen\"}]}";
      friends = JSON.parse(friends);
      $scope.contacts = friends.friends;

      $scope.slice.limit = 20;
    }

    $scope.$watch('search.query', function (newValue) {
      if (phonebookReady) {
        updateList();
      }
    });

    $scope.contactSelect = function (i) {
      if (!$scope.multiSelect) {
        return $modalInstance.close($scope.phonebook[i]);
      }
      if ($scope.selectedContacts[i]) {
        delete $scope.selectedContacts[i];
        $scope.selectedCount--;
      } else {
        $scope.selectedContacts[i] = true;
        $scope.selectedCount++;
      }
    };

    $scope.toggleSelection = function (fill) {
      if (!$scope.selectedCount || fill) {
        $scope.selectedCount = $scope.phonebook.length;
        for (var i = 0; i < $scope.phonebook.length; i++) {
          $scope.selectedContacts[i] = true;
        }
      } else {
        $scope.selectedCount = 0;
        $scope.selectedContacts = {};
      }
    };

    $scope.submitSelected = function () {
      if ($scope.selectedCount <= 0) {
        $modalInstance.dismiss();
      }

      var selectedContacts = [];
      angular.forEach($scope.selectedContacts, function (t, i) {
        selectedContacts.push($scope.phonebook[i]);
      });

      ErrorService.confirm({
        type: 'CONTACTS_IMPORT_PERFORM'
      }).then(function () {
        $scope.progress.enabled = true;
        AppUsersManager.importContacts(selectedContacts).then(function (foundContacts) {
          if (!foundContacts.length) {
            ErrorService.show({
              error: {code: 404, type: 'USERS_NOT_USING_TELEGRAM'}
            });
          }
          $modalInstance.close(foundContacts);
        })['finally'](function () {
          $scope.progress.enabled = false;
        });
      });
    };

  })
