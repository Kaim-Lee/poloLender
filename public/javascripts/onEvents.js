
const setupOnEvents = function setupOnEvents() {
  let poloLenderAppConnection;

  socket.on('connect', function () {
    //poloLenderAppConnection = '연결됨';
    poloLenderAppConnection = 'connected';
    if (storage.browserAuth && storage.browserAuth.token) {
      socket.emit('authorization', storage.browserAuth.token, 'onConnect');
    }
    hideConnectionErrorMessage();
    updatePoloLenderAppStatus();
  });
  socket.on('reconnect', function () {
    //poloLenderAppConnection = 'connected';
    poloLenderAppConnection = '연결됨';
    hideConnectionErrorMessage();
    updatePoloLenderAppStatus();
  });
  socket.on("connect_error", function (err) {
    poloLenderAppConnection = `connect error, ${err.type}: ${err.message}`;
    showConnectionErrorMessage();
    updatePoloLenderAppStatus();
  });
  socket.on("reconnect_error", function (err) {
    poloLenderAppConnection = `reconnect error, ${err.type}: ${err.message}`;
    showConnectionErrorMessage();
    updatePoloLenderAppStatus();
  });
  socket.on('disconnect', function () {
    //poloLenderAppConnection = 'disconnected';
    poloLenderAppConnection = '연결 끊김';
    showConnectionErrorMessage();
    updatePoloLenderAppStatus();
  });
  socket.on("reconnecting", function (attemptNumber) {
    poloLenderAppConnection = `reconnecting (${attemptNumber})`;
    showConnectionErrorMessage();
    updatePoloLenderAppStatus();
  });

  /*
  let onevent = socket.onevent;
  socket.onevent = function (packet) {
    let args = packet.data || [];
    onevent.call(this, packet);    // original call
    packet.data = ['*'].concat(args);
    onevent.call(this, packet);      // additional call to catch-all
  };
  socket.on('*', function (event, data) {
  });
  */


  socket.on('authorized', function(data) {
    let authClient = data;
    hideProcessingDataMessage();
    if (!authClient.isReadAllowed) {
      //webix.message({ type:'error', text: 'Invalid token' });
      webix.message({ type:'error', text: '잘못된 토큰입니다.' });
      delete storage.browserAuth.token;
      delete storage.browserAuth.isReadWriteAllowed;
      delete storage.browserAuth.rememberUntil;
      store.set('poloLender',  { browserAuth: storage.browserAuth });
      return;
    }

    authUi.destructor();
    mainUi.show();

    storage.browserAuth.isReadWriteAllowed = authClient.isReadWriteAllowed;
    store.set('poloLender',  { browserAuth: storage.browserAuth });

    if (authClient.isReadWriteAllowed){
      webix.message({text: '읽기/쓰기 권한입니다.' });
    } else {
      webix.message({text: '읽기전용 권한입니다.' });
    }

    updatedConfigHandlers.browserAuthSettings();
  });

  socket.on('tokenValidated', onTokenValidated);
  socket.on('newTokenGenerated', onNewTokenGenerated);
  socket.on('configUpdate', onConfigUpdate);
  socket.on('clientMessageUpdate', function(data) {
    clientMessage = data;
    updatePoloLenderAppStatus();
    updateLendingEngineStatus();
  });
  socket.on('statusUpdate', function (data) {
    status = data;
    updatePoloLenderAppStatus();
    updateAdvisorEngineStatus();
  });
  socket.on('advisorInfo', function (data) {
    updateAdvisorInfo(data);
  });
  socket.on('apiCallInfo', function (data) {
    updateApiCallInfo(data);
  });
  socket.on('performanceReport', updatePerformanceReport);
  socket.on('liveUpdates', updateLive);
  socket.on('lendingHistory', updateLendingHistory);
  socket.on('updatedConfig', function updatedConfig(errMessage, newConfig, source) {
    if (_.isFunction(updatedConfigHandlers[source])) {
      updatedConfigHandlers[source].call();
    }

    hideProcessingDataMessage();
    if (errMessage) {
      webix.message({
        type: "error",
        text: `Error: ${errMessage}`,
      });
    } else {
      onConfigUpdate(newConfig);
      webix.message({
        //text: `Config updated`,
        text: `설정이 업데이트 되었습니다.`,
      });
    }
  });
};
