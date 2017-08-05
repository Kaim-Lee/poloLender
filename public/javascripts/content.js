let connectionMessage = null;
let startedAt = Date.now();

let showConnectionErrorMessage = function showConnectionErrorMessage(){
  if ((!connectionMessage  || !webix.message.pull.connectionError) && Date.now() - startedAt > 3000) {
    connectionMessage = webix.message({
      id: 'connectionError',
      type: "error",
      //text: '<span><i class="fa fa-refresh fa-spin fa-fw"></i></span> Trying to connect to poloLender app... <br> There seems to be a connection issue',
      text: '<span><i class="fa fa-refresh fa-spin fa-fw"></i></span> 서버와의 연결이 끊겼습니다.<br> 서버에 재 연결 중입니다.',
      expire: -1,
    });
  }
};

let hideConnectionErrorMessage = function hideConnectionErrorMessage() {
  if (connectionMessage) {
    webix.message.hide(connectionMessage);
    connectionMessage = null;
  }
};

let header = {
  id: 'header',
  view: 'template',
  type: 'header',
  autoheight:true,
  css: 'header',
  borderless: true,
  template: function(obj) { return obj.value; },
  //data: { value: 'poloLender Pro' },
  data: { value: '폴로랜더 프로 - 한글버전' },  
};

let tabview = {
  view: 'tabview',
  multiview: { keepViews: true },
  sizeToContent: true,
  id: 'contentTabview',
  animate: { type: "flip", subtype: "vertical" },
  cells:[
    //{ header: "Status", body:{ view:"scrollview", scroll: "xy", body: statusView } },
    //{ header: "Performance", body:{ view:"scrollview", scroll: "xy", body: performanceReportView } },
    //{ header: "Live", body:{ view:"scrollview", scroll: "xy", body: liveView } },
    //{ header: "History", body:{ view:"scrollview", scroll: "xy", body: historyView } },
    //{ header: "Settings", body:{ view:"scrollview", scroll: "xy", body: settingsView } },
    //{ header: "About", body:{ view:"scrollview", scroll: "xy", body: aboutView } },

    { header: "상태", body:{ id: 'statusView', view:"scrollview", scroll: "xy", body: statusView  } },
    { header: "성과", body:{ id: 'performanceView', view:"scrollview", scroll: "xy", body: performanceReportView } },
    { header: "실시간", body:{ id: 'liveView', view:"scrollview", scroll: "xy", body: liveView } },
    //{ header: "Logtrail", body: logtrailView },
    { header: "내역", body:{ id: 'historyView', view:"scrollview", scroll: "xy", body: historyView } },
    { header: "설정", body:{ id: 'settingsView', view:"scrollview", scroll: "xy", body: settingsView } },
    { header: "정보", body:{ id: 'abountView', view:"scrollview", scroll: "xy", body: aboutView } },   
  ],
};

webix.ready(function () {
  authUi = webix.ui({
    view: 'window',
    //head: 'poloLender Pro Authorization',
    head: '폴로랜더 프로 인증',
    modal: true,
    position: 'center',
    width: 380,
    body: {
      view: 'form',
      complexData: true,
      elements: [
        //{ view: 'text', id: 'token', name: 'token', label: 'Authorization token:', labelWidth: 130, tooltip: "Check your console log and\nenter your read/only or read/write authorization token" },
        //{ view: 'select', id: 'rememberForDays', name: 'rememberForDays', label: 'Remember token for:', labelWidth: 130, options: [{ id: 0, value: 'this session' }, { id: 1, value: '1 day' }, { id: 7, value: '7 days' }, { id: 30, value: '30 days' }], value: 30, tooltip: "Remember the token and don't ask for it for a number of days" },
        //{ view: 'button', value: 'Submit',
        { view: 'text', id: 'token', name: 'token', label: '인증 토큰:', labelWidth: 80, tooltip: "구동시 메시지를 확인하여 읽기전용 또는 읽기/쓰기 인증 토큰을 입력하세요." },
        { view: 'select', id: 'rememberForDays', name: 'rememberForDays', label: '토큰 저장:', labelWidth: 80, options: [{ id: 0, value: '이 세션만' }, { id: 1, value: '하루' }, { id: 7, value: '일주일' }, { id: 30, value: '30일' }], value: 30, tooltip: "토큰일 기억하고 너무 장시간 사용하지 마십시오." },
        { view: 'button', value: '로그인',
          click: function (elementId, event) {
            showProcessingDataMessage();
            let auth = this.getFormView().getValues();
            storage.browserAuth = {
              token: auth.token,
              isReadWriteAllowed: false,              
              isChangeEnabled: storage.browserAuth && storage.browserAuth.hasOwnProperty('isChangeEnabled') ? storage.browserAuth.isChangeEnabled : true,
              rememberForDays: auth.rememberForDays,
              rememberUntil: auth.rememberForDays === '0' ? -1 : new Date(Date.now() + parseFloat(auth.rememberForDays) * 24 * 60 * 60 * 1000),
            };
            store.set('poloLender',  { browserAuth: storage.browserAuth });
            socket.emit('authorization', storage.browserAuth.token);
          }
        }
      ]
    },
    move: true
  });
  authUi.show();

  mainUi = webix.ui({
    rows: [
      header,
      tabview,
    ]
  });
  mainUi.hide();

  let s = store.get('poloLender');
  let isChangeEnabled = s && s.browserAuth && s.browserAuth.hasOwnProperty('isChangeEnabled') ? s.browserAuth.isChangeEnabled : 1;
  setEnableConfigChanges(isChangeEnabled);
  $$("lendingHistoryInputForm").elements["period"].attachEvent("onChange", onPeriodChange);
  webix.extend($$('lendingHistoryTable'), webix.ProgressBar);

  advisorInfoTableUi = $$('advisorInfoTable');
  liveStatusUi = $$('liveStatus');
  setupOnEvents();
  startRefreshingStatus();
  startRefreshingLiveUpdateStatus();

 
 
  $$('contentTabview').getMultiview().attachEvent("onViewChange", function(prevID, nextID){
    refreshLiveStatus();
    refreshPerformanceView();
    refreshStatusView();
  });


  storage = store.get('poloLender') || {};

  if (!storage || !storage.browserAuth || !storage.browserAuth.token || !storage.browserAuth.expiresOn) {
    storage.browserAuth = {};
    store.set('poloLender',  { browserAuth: {} });
  } else {
    if (storage.browserAuth.expiresOn === 'never' || Date.now() < new Date(storage.browserAuth.expiresOn).getTime()) {
      socket.emit('authorization', storage.browserAuth.token, ``);
    } else {
      //webix.message({ type:'error', text: 'Authorization token expired' });
      webix.message({ type:'error', text: '인증 토큰이 만료 되었습니다.' });
      storage.browserAuth = {};
      store.set('poloLender',  { browserAuth: storage.browserAuth });
    }
  }
});
