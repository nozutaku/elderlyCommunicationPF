(function() {
  "use strict";
  //alert("hello");
  
  //const URL = "https://elderly-communication-pf.herokuapp.com/api/command/9";
  const URL = "https://elderly-communication-pf.herokuapp.com/api/command/kintone2heroku?kintone_id=";
  const method = 'POST';
  const headers = {'Content-Type' : 'application/json'};
  var data = "";


  kintone.events.on('app.record.edit.change.sender', function(event) {

    //alert("recordId=" + event.recordId);
    
    // http post
    //https://developer.cybozu.io/hc/ja/articles/202166320-%E5%A4%96%E9%83%A8API%E3%81%AE%E5%AE%9F%E8%A1%8C
    // https://qiita.com/sy250f/items/62706bc1fa47b8d08a53
    
    kintone.proxy( URL+event.recordId, method, headers, data, function(body, status, headers) {
      console.log(status, body);            
      if(status >= 200 && status < 300) {
        console.log("Success");
      }else{
        console.log("Error");
      }
      /*
        //success
        console.log(status, JSON.parse(body), headers);
    }, function(error) {
        //error
        console.log(error);  //proxy APIのレスポンスボディ(文字列)を表示
      */
    });
    
    
    
    //alert("hello+", event.recordId);
    //https://developer.cybozu.io/hc/ja/articles/200730174-JavaScript%E3%82%92%E4%BD%BF%E7%94%A8%E3%81%97%E3%81%9Fkintone%E3%81%AE%E3%82%AB%E3%82%B9%E3%82%BF%E3%83%9E%E3%82%A4%E3%82%BA
    

      return event;
  });

})();
