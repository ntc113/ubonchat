/*!
 * Webogram v0.3.6 - messaging web application for MTProto
 * #
 * Copyright (C) 2014 Igor Zhukov <igor.beatle@gmail.com>
 * #/blob/master/LICENSE
 */

chrome.app.runtime.onLaunched.addListener(function(launchData) {
  chrome.app.window.create('../index.html', {
  	id: 'webogram-chat',
    innerBounds: {
      width: 1000,
      height: 700
    },
    minWidth: 320,
    minHeight: 400,
    frame: 'chrome'
  });
});