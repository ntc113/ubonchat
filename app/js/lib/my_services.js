'use strict';

/* Services */

angular.module('myservices', [])
// 1
.service ('PingService', function (MtpApiManager) {
  function process () {
    console.log ('----------- Ping service ----------', Math.round(+new Date()/1000));
    MtpApiManager.pingToServer();
  }

  return {process:process}
})
// 2
.service ('LoginService', function () {
  function process (packetBody) {
    console.log ('----------- LoginService service ----------');
    console.log (packetBody);
  }

  return {process:process}
})
// 4
.service ('MessageService', function () {
  function process (packetBody) {
    console.log ('----------- MessageService ----------');
    console.log (packetBody);
  }

  return {process:process}
})
// 5
.service ('HaveMessageService', function () {
  function process (packetBody) {
    console.log ('----------- HaveMessageService ----------');
    console.log (packetBody);
  }

  return {process:process}
})
// 12
.service ('PresenceNotifyService', function () {
  function process (packetBody) {
    console.log ('----------- PresenceNotifyService ----------');
    console.log (packetBody);
  }

  return {process:process}
})
// 13
.service ('FriendListService', function (Storage) {
  function process (packetBody) {
    console.log ('----------- FriendListService ----------');
    Storage.set({
      friendlist: packetBody
    });
  }

  return {process:process}
})
// 24
.service ('UserInfoService', function ($rootScope, $modal, $modalStack, Storage, ErrorService) {
  function process (packetBody) {
    console.log ('----------- UserInfoService ----------');
    var userInfo = {};
    var scope = $rootScope.$new();
    try {
      userInfo = JSON.parse (packetBody);
      console.log ('userInfo: ', userInfo);
      if (userInfo.error != 1) {
        scope.userInfo = userInfo;

        $modalStack.dismissAll();
        var modalInstance = $modal.open({
          templateUrl: templateUrl('user_modal'),
          controller: 'UserModalController',
          scope: scope,
          windowClass: 'user_modal_window mobile_modal'
        });
      } else {
        scope.error_no_phone = true;
        // ErrorService.alert('Số điện thoại bạn tìm chưa sử dụng UBon.');
      }
    } catch (e) {
      console.log ('Error: ', e);
    }
  }

  return {process:process}
})

// 37
.service ('FriendListDoneService', function ($location) {
  function process (packetBody) {
    console.log ('----------- FriendListDoneService ----------');
    console.log (packetBody);
    $location.url ('/im');
  }

  return {process:process}
})
// 61
.service ('MakeFriendService', function () {
  function process (packetBody) {
    console.log ('----------- MakeFriendService ----------');
    console.log (packetBody);
  }

  return {process:process}
})
// 62
.service ('MakeFriendResponseService', function () {
  function process (packetBody) {
    console.log ('----------- MakeFriendResponseService ----------');
    console.log (packetBody);
  }

  return {process:process}
})
// 63
.service ('MakeFriendRequestService', function () {
  function process (packetBody) {
    console.log ('----------- MakeFriendRequestService ----------');
    console.log (packetBody);
  }

  return {process:process}
})
// 64
.service ('MakeFriendResponseServerService', function () {
  function process (packetBody) {
    console.log ('----------- MakeFriendResponseServerService ----------');
    console.log (packetBody);
  }

  return {process:process}
})
// 72
.service ('Message2Service', function () {
  function process (packetBody) {
    console.log ('----------- Message2Service ----------');
    console.log (packetBody);
  }

  return {process:process}
})
// 73
.service ('HaveMessage2Service', function () {
  function process (packetBody) {
    console.log ('----------- HaveMessage2Service ----------');
    console.log (packetBody);
  }

  return {process:process}
})
// 99
.service ('NumberNotificationService', function ( MtpApiManager) {
  function process (packetBody) {
    console.log ('----------- NumberNotificationService ----------');
    var pk = {};
    try {
      pk = JSON.parse (packetBody);

      if (pk.newRequestMakeFriend >= 1) {
        MtpApiManager.sendMsg("add friend", pk.requestFriendFromUserId);
      };

    } catch (e) {
      console.log ('Error: ', e);
    }
    console.log (packetBody);
    
  }

  return {process:process}
})
// 108
.service ('FriendViaWifiJoinService', function () {
  function process (packetBody) {
    console.log ('----------- FriendViaWifiJoinService ----------');
    console.log (packetBody);
  }

  return {process:process}
})
// 109
.service ('FriendViaWifiLeaveService', function () {
  function process (packetBody) {
    console.log ('----------- FriendViaWifiLeaveService ----------');
    console.log (packetBody);
  }

  return {process:process}
})
// 121
.service ('MessageFileUrlService', function () {
  function process (packetBody) {
    console.log ('----------- MessageFileUrlService ----------');
    console.log (packetBody);
  }

  return {process:process}
})
// 128
.service ('NotificationService', function () {
  function process (packetBody) {
    console.log ('----------- NotificationService ----------');
    console.log (packetBody);
  }

  return {process:process}
})
// 142
.service ('TypingService', function () {
  function process (packetBody) {
    console.log ('----------- Typing service ----------');
    console.log (packetBody);
    console.log (packetBody.length);
  }

  return {process:process}
})

// baseService
.service ('BaseService', function (
  PingService, LoginService, MessageService, HaveMessageService, PresenceNotifyService, FriendListService, UserInfoService, FriendListDoneService,
  MakeFriendService, MakeFriendResponseService, MakeFriendRequestService, MakeFriendResponseServerService,
  Message2Service, HaveMessage2Service, NumberNotificationService, FriendViaWifiJoinService, FriendViaWifiLeaveService, 
  MessageFileUrlService, NotificationService, TypingService) {
  

    var serviceType = {
      // 0: DefaultService,
      1: PingService,
      2: LoginService,
      // 3: LogoutService,
      4: MessageService,
      5: HaveMessageService,
      // 6: MakeConferenceService,
      // 7: MessageConferenceService,
      // 8: HaveMessageConferenceService,
      // 9: InviteConferenceService,
      // 10: InviteConferenceResponseService,
      // 11: JoinConferenceService,
      12: PresenceNotifyService,
      13: FriendListService,
      // 14: BROADCASTService,
      // 15: LeaveConferenceService,
      // 16: JoinRoomService,
      // 17: LeaveRoomService,
      // 18: ListAreaService,
      // 19: ListRoomService,
      // 20: MessageRoomService,
      // 21: HaveMessageRoomService,
      // 22: JoinRoomResponseService,
      // 23: ConferenceInfoService,
      24: UserInfoService,
      // 25: SendFileInfoService,
      // 26: SendFileInfoResponseService,
      // 27: SendFileDataService,
      // 28: RoomFriendsService,
      // 29: GetServerAddrService,
      // 30: MessageReportService,
      // 31: CallInviteService,
      // 32: CallInviteResponseService,
      // 33: GameDataService,
      // 34: GameInviteService,
      // 35: GameInviteResponseService,
      // 36: SendFileDataDoneService,
      37: FriendListDoneService,
      // 38: RegisterPushNotificationService,
      // 39: RegisterPushNotificationResponseService,
      // 40: UnregisterPushNotificationService,
      // 41: UnregisterPushNotificationResponseService,
      // 42: MakeChatGroupService,
      // 43: LeaveChatGroupService,
      // 44: JoinChatGroupService,
      // 45: MessageChatGroupService,
      // 46: SearchUserService,
      // 47: UserAddBookService,
      // 48: UserAddBookDoneService,
      // 49: ErrorLoggedOtherChannelService,//da dang nhap tren phien khac
      // 50: SuggestFriendService,
      // 51: OlaRobotService,/////////////////////////////OLA room robot
      // 52: OlaRegisterService,
      // 53: LeaveRoomResponseService,
      // 54: ViewHomePageService,
      // 55: ViewHomePagePostService,
      // 56: ViewPostLikeService,
      // 57: ViewPostCommentService,
      // 58: LikePostService,
      // 59: CommentPostService,
      // 60: CreatePostService,
      61: MakeFriendService,//gui yeu cau ket ban | server phan hoi ket qua gui yeu cau thanh cong hay khong
      62: MakeFriendResponseService,//tra loi` yeu cau ket ban tu nguoi dc yeu cau
      63: MakeFriendRequestService,//Yeu cau ket ban tu nguoi khac
      64: MakeFriendResponseServerService,//Server tra ket qua chap nhan, hay tu choi lam ban
      // 65: DeleteRelationshipService,
      // 66: UserNotificationService,
      // 67: ViewPenddingFriendService,
      // 68: SearchUserByLocationService,
      // 69: DeleteLocationService,
      // 70: OlaEncryptPasswordService,
      // 71: NewsFeedService,
      72: Message2Service,//tin nhan dung json Servicewebsocket)
      73: HaveMessage2Service,//tin nhan dung json Servicewebsocket)
      // 74: MessageChatGroupReportService,
      // 75: SendFileOkService,
      // 76: SendFileCancelService,
      // 77: OfflineRoomJoinService,
      // 78: OfflineRoomLeaveService,
      // 79: OfflineRoomListFriendService,
      // 80: OfflineRoomListRoomCategoryService,
      // 81: OfflineRoomListRoomService,
      // 82: RegisterAccountService,
      // 83: UNFRIENDService,
      // 84: DeletePostService,
      // 85: DeleteCommentService,
      // 86: ReportService,
      // 87: BlockUserService,
      // 88: UnblockUserService,
      // 89: ListLockedUserService,
      // 90: ChangePrivacyService,
      // 91: UpdateUserInfoService,
      // 92: CaptchaForRegisterAccountService,
      // 93: ViewUserVisitMyHomepageService,
      // 94: ScheduleMessageAddService,
      // 95: ScheduleMessageDeleteService,
      // 96: ScheduleMessageViewListService,
      // 97: GetRelationshipWithUserService,
      // 98: ChangePasswordService,
      99: NumberNotificationService,
      // 100: ChangeServerToService,//{"port":,"ip":"127.0.0.1","now":1} ::> client phai thay doi dia chi slave server sang ip:port moi' dc chi ra, now:1: ngat ket noi server cu~, ket noi server moi ngay lap tuc, now:0: chi thay doi dia chi slave server thoi, luc nao bi disconnect moi ket noi lai slave moi
      // 101: SystemMaintenanceService,//{"time":,"reason":"bao tri"}    ::> server se ngung hoat dong trong time giay; sau time giay thi` client tu dong ket noi lai Servicebat thong bao cho nguoi dung biet)
      // 102: AdminService,
      // 103: HaveOfflineMessageService,
      // 104: MessageStickerService,
      // 105: ApplicationChangeStateService,//ung dung tren mobile chuyen sang trang thai moi

      // 107: FriendViaWifiService,
      108: FriendViaWifiJoinService,
      109: FriendViaWifiLeaveService,

      // 110: CallStatusChangeService,
      // 111: CallUpdateService,
      // 112: ListStickerPacketService,//danh sach cac goi sticker
      // 113: SendLocationService,
      // 114: CallRingbackToneService,
      // 115: GetCurrentCallSignService,

      // 116: GetListMusicService,
      // 117: MyRingbackToneListService,
      // 118: MyRingbackToneAddService,
      // 119: MyRingbackToneDeleteService,

      // 120: PushNotificationSettingService,
      121: MessageFileUrlService,
      // 122: PushNotificationCurrentSettingService,
      // 123: ForgotPasswordService,
      // 124: FacebookContactService,
      // 125: FacebookContactDoneService,
      // 126: UpdateMyFacebookInfoService,
      // 127: DeleteMessageService,
      128: NotificationService,
      // 129: CurrentCallSignWithFriendService,
      // 130: SetCallSignWithFriendService,
      // 133: UpdateViewNotificationService,
      // 134: ViewFriendSuggestionService,
      // 135: DeleteFriendSuggestionService,
      // 136: UserChangeInfoNotifyService,
      // 137: UpdatePhoneNumberService,
      // 138: CheckCanCreatePasswordService,
      // 139: CreatePasswordService,
      // 140: NewFriendService,
      // 141: ListFriendSameWifiService,

      142: TypingService,
      // 143:
      // 144: 
      // 145:
      // 148:
      // 152:
    };

  function process (packet) {
    if (typeof serviceType[packet.service] !== 'undefined') {
      var sv = serviceType[packet.service];
      sv.process(packet.body);
    } else {
      console.log('service not found: ', packet.service);
    }
  }

  return {
    process:process
  }
})
