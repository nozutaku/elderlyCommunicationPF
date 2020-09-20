(function() {
  "use strict";
  //alert("hello");
  

  const URL = "NEED to SET";

  const method = 'POST';
  const headers = {'Content-Type' : 'application/json'};
  var data = "";

  var changed_sender_recordId = 0;    //init


  kintone.events.on('app.record.edit.change.sender', function(event) {

    //alert("recordId=" + event.recordId);
    
    // http post
    //https://developer.cybozu.io/hc/ja/articles/202166320-%E5%A4%96%E9%83%A8API%E3%81%AE%E5%AE%9F%E8%A1%8C
    // https://qiita.com/sy250f/items/62706bc1fa47b8d08a53
    
    changed_sender_recordId = event.recordId;
    console.log("[change.sender]Id=" + changed_sender_recordId);

    /* 
    kintone.proxy( URL+event.recordId, method, headers, data, function(body, status, headers) {
      console.log(status, body);            
      if(status >= 200 && status < 300) {
        console.log("Success");
      }else{
        console.log("Error");
      }

    });
    */
    
    //alert("hello+", event.recordId);
    //https://developer.cybozu.io/hc/ja/articles/200730174-JavaScript%E3%82%92%E4%BD%BF%E7%94%A8%E3%81%97%E3%81%9Fkintone%E3%81%AE%E3%82%AB%E3%82%B9%E3%82%BF%E3%83%9E%E3%82%A4%E3%82%BA
    

      return event;
  });


  //ref: https://developer.cybozu.io/hc/ja/articles/202166270-%E3%83%AC%E3%82%B3%E3%83%BC%E3%83%89%E7%B7%A8%E9%9B%86%E3%82%A4%E3%83%99%E3%83%B3%E3%83%88
  kintone.events.on('app.record.edit.submit.success', function(event) {

    console.log("[submit.success]Id="+ event.recordId + " changed_sender_recordId=" + changed_sender_recordId);

    if( changed_sender_recordId  == event.recordId ){     //詳細画面を抜けたらchanged_sender_recordIdは初期化されている模様だが一応同一チェック
      kintone.proxy( URL+event.recordId, method, headers, data, function(body, status, headers) {
        console.log(status, body);            
        if(status >= 200 && status < 300) {
          console.log("Success");
        }else{
          console.log("Error");
        }

      });
    }

    changed_sender_recordId = 0;    //init

    return event;

  });





})();
