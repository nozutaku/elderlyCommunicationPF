/******************************************
 kintone DB
 
   heroku configへ下記各自セット必要
    heroku config:set KINTONE_URL=xxxx
    heroku config:set CYBOZU_API_TOKEN=xxxx
    heroku config:set CYBOZU_APP_ID=xxxx
******************************************/

var DEBUG = 1;          //1=DEBUG 0=RELEASE   (特定時間以外broadcastしない機能もここ)
var LOCAL_DEBUG = 0;    //1=Local node.js利用   0=herokuサーバー利用(default)  


var request = require('request');
var $ = require('jquery-deferred');

/*
var express = require('express');
var bodyParser = require('body-parser');
var app = express();

var pg = require('pg');
*/

var kintone_id;

/* ---------------------------------------------------------
   公開API
   ---------------------------------------------------------*/
module.exports.set_data2db = function(req, res){
  set_data( input_date, input_time, input_pickup_people, input_destination );
}

module.exports.update_data2db = function(req, res){
  
  var dfd_update_data2db = new $.Deferred;
  
  return update_data( dfd_update_data2db, input_date, input_time, input_pickup_people, input_destination, input_sender );
}

module.exports.update_id2db = function(req, res){
  
  var dfd_update_id2db = new $.Deferred;
  
  return update_id2sender( dfd_update_id2db, input_kintone_id, input_sender );
}



module.exports.set_account_data2db = function(req, res){
  set_account( new_follower_line_id );
}

module.exports.delete_account_data2db = function(req, res){
  delete_account( new_follower_line_id );
}

module.exports.get_account_all = function(req, res){
  var dfd_get_account_all = new $.Deferred;
  
  return get_account_data_all( dfd_get_account_all );
  
}
module.exports.get_vacant_day = function(req, res){
  var dfd_get_vacant_day = new $.Deferred;
  
  return get_vacant_days( dfd_get_vacant_day );
  
}

module.exports.check_still_vacant = function(req, res){
  var dfd_check_still_vacant = new $.Deferred;
  
  return is_sender( dfd_check_still_vacant );
  
}


/* ------------------------------------------------------------
   kintoneへデータをセットする
  ------------------------------------------------------------- */
function set_data( input_date, input_time, input_pickup_people, input_destination ){
  
  var options = {
    uri: process.env.KINTONE_URL,
    headers: {
      "X-Cybozu-API-Token": process.env.CYBOZU_API_TOKEN,
      "Content-type": "application/json"
    },
  json: {
    "app": process.env.CYBOZU_APP_ID,
    "record": {
      "date": {
        "value": input_date
      },
      "time": {
        "value": input_time
      },
      "pickup_people": {
        "value": input_pickup_people
      },
      "destination":{
        "value": input_destination
      }
    }
  }
};

request.post(options, function(error, response, body){
  if (!error && response.statusCode == 200) {
    console.log("[set_data]success!");
  } else {
    console.log('[set_data]http error: '+ response.statusCode);
  }
});
  
}

/* ------------------------------------------------------------
   kintoneへデータをセットする（アカウントDB）
  ------------------------------------------------------------- */
function set_account( id ){
  
  console.log("URL="+process.env.KINTONE_URL);
  console.log("API TOKEN="+process.env.CYBOZU_ACCOUNT_API_TOKEN);
  console.log("APP ID="+process.env.CYBOZU_ACCOUNT_APP_ID);
  console.log("id="+id);
  
  
  var options = {
    uri: process.env.KINTONE_URL,
    headers: {
      "X-Cybozu-API-Token": process.env.CYBOZU_ACCOUNT_API_TOKEN,
      "Content-type": "application/json"
    },
    json: {
      "app": process.env.CYBOZU_ACCOUNT_APP_ID,
      "record": {
        "line_id": {
          "value": id
        }
      }
    }
  };

  request.post(options, function(error, response, body){
    if (!error && response.statusCode == 200) {
      console.log("[set_data]success!");
    } else {
      console.log('[set_data]http error: '+ response.statusCode);
    }
  });

}

/* ------------------------------------------------------------
   kintoneへデータを削除する（アカウントDB）
  ------------------------------------------------------------- */
function delete_account( id ){    //new_follower_line_id
  select_account_id()
  .done(function(){
    delete_account_inner( kintone_id );
  });  
  
}

/* ------------------------------------------------------------
   input_kintone_idのデータレコードにsenderがセットされているかチェックする
  ------------------------------------------------------------- */
function is_sender( dfd ){
  
  var select_url = process.env.KINTONE_URL_MULTI;
  
  if( input_kintone_id <= 0 ){
    console.log("bad input_kintone_id. input_kintone_id="+input_kintone_id);
    return dfd.resolve();
  }
  
  
  var raw_query = "$id=\"" + input_kintone_id + "\"";      //$id="15"
  //var raw_query = "date!=\"\" and sender=\"\"";
  //var raw_query = "line_id=" + "\"" + new_follower_line_id + "\"" ;
  
  console.log("raw_query = " + raw_query );
  
  select_url = select_url + "?app=" + process.env.CYBOZU_APP_ID + "&query=" + encodeURIComponent( raw_query );

  
  console.log("select_url = " + select_url);
  
  var options = {
    uri: select_url,
    headers: {
      "X-Cybozu-API-Token": process.env.CYBOZU_API_TOKEN
    },
    json: true
  };

  request.get(options, function(error, response, body){
    if (!error && response.statusCode == 200) {
      console.log("[is_sender]success!");
      
      //console.log("body");
      //console.log(body);
      
      //ID抽出
      var num = Object.keys(body.records).length;
      console.log("num = " + num);
      
      if( num != 1 ){
        console.log("[is_sender] invalid! num="+num);
        input_kintone_id = -1;
        line_reply_mode = LINE_MODE_DENEY_REPLY_NO_DATA;
        return dfd.resolve();
      }
      
      
      console.log("body.records[0].sender.value = " + body.records[0].sender.value);
      
      if( body.records[0].sender.value != "" ){
        input_kintone_id = -1;
        line_reply_mode = LINE_MODE_DENEY_REPLY_ALREADY_EXIST;
      }
      else{
        input_date = body.records[0].date.value;
        input_time = body.records[0].time.value;
        input_pickup_people = body.records[0].pickup_people.value;   //送迎対象者(送迎される人)
        input_sender = body.records[0].sender.value;          //送迎する人""のはず
        input_destination = body.records[0].destination.value;
        
        console.log("NO sender. Good!");
      }
      
      return dfd.resolve();
    } else {
      input_kintone_id = -1;
      console.log('[get_vacant_days]http error: '+ response.statusCode);
      line_reply_mode = LINE_MODE_DENEY_REPLY_NO_DATA;
      return dfd.resolve();
    }
  });  
  
  return dfd.promise();  
  
  
}


/* ------------------------------------------------------------
   input_kintone_idのデータレコードにinput_senderを追加する
  ------------------------------------------------------------- */
function update_id2sender( dfd, kintone_id, sender ){
  
  return update_id( dfd, kintone_id, sender );
}


/* ------------------------------------------------------------
   date/time/pickup_peopleと同一のデータレコードにsenderを追加する
  ------------------------------------------------------------- */
function update_data( dfd, date, time, pickup_people, destination, sender ){
  //var id = select_id( date, time, pickup_people, destination );
  //  update_id( id, sender );
  
  select_id()    //引数付けるとdeffer使えないようだ
  .done(function(){
    return update_id( dfd, kintone_id, input_sender );
    //return dfd.resolve();
  });  
  
  return dfd.promise();
}


/* ------------------------------------------------------------
   kintoneの特定のIDのデータをupdateする
  ------------------------------------------------------------- */
//function select_id( date, time, pickup_people, destination ){
function select_id(){   //input_date, input_time, input_pickup_people, input_destination
  
  var dfd_select_id = new $.Deferred;
  
  var select_url = process.env.KINTONE_URL_MULTI;
  
  var raw_query = "date=" + "\"" + input_date + "\"" + " and time=" + "\"" + input_time + "\"" ;
  
  console.log("raw_query = " + raw_query );
  
  select_url = select_url + "?app=" + process.env.CYBOZU_APP_ID + "&query=" + encodeURIComponent( raw_query );

  
  console.log("select_url = " + select_url);
  
  var options = {
    uri: select_url,
    headers: {
      "X-Cybozu-API-Token": process.env.CYBOZU_API_TOKEN
    },
    json: true
  };

  request.get(options, function(error, response, body){
    if (!error && response.statusCode == 200) {
      console.log("[select_id]success!");
      
      //console.log("body");
      //console.log(body);
      
      //ID抽出
      var num = Object.keys(body.records).length;
      console.log("num = " + num);
      
      for (var i = 0; i < num; i++){
        //console.log("date="+body.records[i].date.value);
        //console.log("destination="+body.records[i].destination.value);
        //console.log("pickup_people="+body.records[i].pickup_people.value);
        //console.log("input_destination = "+ input_destination);
        //console.log("input_pickup_people = "+ input_pickup_people);
        
        /*
        if(( body.records[i].destination.value == input_destination ) 
           && ( body.records[i].pickup_people.value == input_pickup_people )){
        */
        if( body.records[i].pickup_people.value == input_pickup_people ){
          
          kintone_id = body.records[i].$id.value;
          console.log("kintone_id = " + kintone_id );
          
          if( body.records[i].sender.value == "" ){
            line_reply_mode = LINE_MODE_ACCEPT_REPLY;
            console.log("line_reply_mode="+line_reply_mode);
          }
          else{
            line_reply_mode = LINE_MODE_DENEY_REPLY_ALREADY_EXIST;
            console.log("line_reply_mode="+line_reply_mode);
            //return dfd_select_id.reject();
          }
          
          
          return dfd_select_id.resolve();
        }
        console.log("i="+i);
        
      }
      kintone_id = -1;    //error
    
      return dfd_select_id.resolve();
    } else {
      console.log('[select_id]http error: '+ response.statusCode);
      line_reply_mode = LINE_MODE_DENEY_REPLY_NO_DATA;
      return dfd_select_id.resolve();
    }
  });  
  
  return dfd_select_id.promise();
    
    
}

/* ------------------------------------------------------------
   kintoneの特定のIDのデータを抽出する
  ------------------------------------------------------------- */
function select_account_id(){   //
  
  var dfd_select_account_id = new $.Deferred;
  
  var select_url = process.env.KINTONE_URL_MULTI;
  
  var raw_query = "line_id=" + "\"" + new_follower_line_id + "\"" ;
  
  console.log("raw_query = " + raw_query );
  
  select_url = select_url + "?app=" + process.env.CYBOZU_ACCOUNT_APP_ID + "&query=" + encodeURIComponent( raw_query );

  
  console.log("select_url = " + select_url);
  
  var options = {
    uri: select_url,
    headers: {
      "X-Cybozu-API-Token": process.env.CYBOZU_ACCOUNT_API_TOKEN
    },
    json: true
  };

  request.get(options, function(error, response, body){
    if (!error && response.statusCode == 200) {
      console.log("[select_id]success!");
      
      //console.log("body");
      //console.log(body);
      
      //ID抽出
      var num = Object.keys(body.records).length;
      console.log("num = " + num);
      
      for (var i = 0; i < num; i++){
          
        kintone_id = body.records[i].$id.value;
        console.log("kintone_id = " + kintone_id );
          
        return dfd_select_account_id.resolve();
      }
        
      kintone_id = -1;    //error
    
      return dfd_select_account_id.resolve();
    } else {
      console.log('[select_id]http error: '+ response.statusCode);
      return dfd_select_account_id.resolve();
    }
  });  
  
  return dfd_select_account_id.promise();
    
    
}

/* ------------------------------------------------------------
   kintoneから送迎対象者未決定の日を抽出する
  ------------------------------------------------------------- */
function get_vacant_days( dfd ){
  
  var select_url = process.env.KINTONE_URL_MULTI;
  
  var raw_query = "date!=\"\" and sender=\"\"";
  //var raw_query = "line_id=" + "\"" + new_follower_line_id + "\"" ;
  
  console.log("raw_query = " + raw_query );
  
  select_url = select_url + "?app=" + process.env.CYBOZU_APP_ID + "&query=" + encodeURIComponent( raw_query );

  
  console.log("select_url = " + select_url);
  
  var options = {
    uri: select_url,
    headers: {
      "X-Cybozu-API-Token": process.env.CYBOZU_API_TOKEN
    },
    json: true
  };

  request.get(options, function(error, response, body){
    if (!error && response.statusCode == 200) {
      console.log("[get_vacant_days]success!");
      
      //console.log("body");
      //console.log(body);
      
      //ID抽出
      var num = Object.keys(body.records).length;
      console.log("num = " + num);
      
      init_no_candidate_day();
      
      if( num == 0 ){
        console.log("[get_vacant_days] NO vacant day! Thanks!!");
        return dfd.resolve();
      }
      
      for (var i = 0; i < num; i++){
        day = new NotDecidedDay();
        
        day.date = body.records[i].date.value;
        day.time = body.records[i].time.value;
        day.pickup_people = body.records[i].pickup_people.value;
        day.sender = body.records[i].sender.value;  //空のはず
        day.destination =  body.records[i].destination.value;
        day.kintone_id = body.records[i].$id.value;
        
        no_candidate_day[i] = day;
        
        //console.log("no_candidate_day["+i+"]");
        //console.log(no_candidate_day[i]);
      }
        
    
      return dfd.resolve();
    } else {
      console.log('[get_vacant_days]http error: '+ response.statusCode);
      return dfd.resolve();
    }
  });  
  
  return dfd.promise();  
}

function init_no_candidate_day(){
  if( no_candidate_day.length != 0 ){
    while( no_candidate_day.length > 0 ){
      no_candidate_day.pop();
    }
  }
}



/* ------------------------------------------------------------
   kintoneの特定のIDのデータをupdateする
  ------------------------------------------------------------- */
function update_id( dfd_updateid, kintone_id, sender ){
  
  console.log("id="+kintone_id+"  sender="+sender);
  
  //var dfd_updateid = new $.Deferred;
  
  if( kintone_id == -1 ){
    line_reply_mode = LINE_MODE_DENEY_REPLY_NO_DATA;
      return dfd_updateid.resolve();
  }
  
  var options = {
    uri: process.env.KINTONE_URL,
    headers: {
      "X-Cybozu-API-Token": process.env.CYBOZU_API_TOKEN,
      "Content-type": "application/json"
    },
    json: {
      "app": process.env.CYBOZU_APP_ID,
      "id": kintone_id,
      "record": {
        "sender": {
          "value": sender
        }
      }
    }
  };

  request.put(options, function(error, response, body){
    if (!error && response.statusCode == 200) {
      console.log("[update_data]success!");
      return dfd_updateid.resolve();
    } else {
      console.log('[update_data]http error: '+ response.statusCode);
      line_reply_mode = LINE_MODE_DENEY_REPLY_NO_DATA;
      return dfd_updateid.resolve();
    }
  });
  
  return dfd_updateid.promise();
  
}

/*
function delete_account_inner( kintone_id ){
  console.log("id="+kintone_id);
  
  var dfd_delete_id = new $.Deferred;
  
  var url = process.env.KINTONE_URL_MULTI;
  var body = {
    "app": process.env.CYBOZU_ACCOUNT_APP_ID,
    "ids": kintone_id,
    //"revisions": [1, 4],
    // CSRF TOKEN: kintone上からAPI(POST, PUT, DELETE)を実行する場合に設定する必要あり
    "__REQUEST_TOKEN__": process.env.CYBOZU_ACCOUNT_API_TOKEN
    //"X-Cybozu-API-Token": process.env.CYBOZU_ACCOUNT_API_TOKEN
  };


  var xhr = XMLHttpRequest();
  //var xhr = new XMLHttpRequest();
  xhr.open('DELETE', url);
  xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
  xhr.setRequestHeader('Content-Type', 'application/json');
  xhr.onload = function() {
      if (xhr.status === 200) {
        // success
        console.log(JSON.parse(xhr.responseText));
        return dfd_delete_id.resolve();
      } else {
        // error
        console.log(JSON.parse(xhr.responseText));
        return dfd_delete_id.resolve();
      }
  };
  xhr.send(JSON.stringify(body));

  return dfd_delete_id.promise();  
  
}
*/

/* request.delete が存在しない？？？ */

/* ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
  http deleteがうまくいかなーーーーーい！！
  ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★ */

function delete_account_inner( kintone_id ){
  console.log("id="+kintone_id);
  
  var dfd_delete_id = new $.Deferred;
  
  var options = {
    uri: process.env.KINTONE_URL_MULTI,
    method : 'DELETE',
    headers: {
      "method": 'DELETE',
      "X-Cybozu-API-Token": process.env.CYBOZU_ACCOUNT_API_TOKEN,
      "Content-type": "application/json"
    },
    json: {
      "app": process.env.CYBOZU_ACCOUNT_APP_ID,
      "ids": [1]
      //"ids": kintone_id
    }
  };

  request.put(options, function(error, response, body){
    if (!error && response.statusCode == 200) {
      console.log("[delete_data]success!");
      return dfd_delete_id.resolve();
    } else {
      console.log('[delete_data]http error: '+ response.statusCode);
      return dfd_delete_id.resolve();
    }
  });
  
  return dfd_delete_id.promise();  
  
}


/* https://teratail.com/questions/68972 
function delete_account_inner( kintone_id ){
  console.log("id="+kintone_id);
  
  const http = require('http');
  
  console.log("require");

  const body = 'hello server';
  let options = {
      host : process.env.KINTONE_URL_MULTI,
      //path : '/delete',
      method : 'DELETE',
      headers : {
        "Content-Type" : "application/json", 
        "Content-Length": body.length}
  };

  console.log("middle");
  
  const server = http.createServer((req, res) => {
    let chunk = '';
    req.on('data', (d) => chunk += d);
    req.on('end', () => {
      res.end('hello client ' + chunk);
    });
  });

  server.listen(0, () => {
    //const port = server.address().port;
    //options.port = port;
    const req = http.request(options, (res) => {
      // hello client hello server
      console.log("request ok");
      //res.pipe(process.stdout);
    });

    req.write(body)
    req.end();
  })
}
*/


function get_account_data_all( dfd ){
  
  var select_url = process.env.KINTONE_URL_MULTI;
  
  //var raw_query = "line_id=" + "\"" + new_follower_line_id + "\"" ;
  //console.log("raw_query = " + raw_query );
  
  select_url = select_url + "?app=" + process.env.CYBOZU_ACCOUNT_APP_ID;
  //select_url = select_url + "?app=" + process.env.CYBOZU_ACCOUNT_APP_ID + "&query=" + encodeURIComponent( raw_query );

  
  console.log("select_url = " + select_url);
  
  var options = {
    uri: select_url,
    headers: {
      "X-Cybozu-API-Token": process.env.CYBOZU_ACCOUNT_API_TOKEN
    },
    json: true
  };

  request.get(options, function(error, response, body){
    if (!error && response.statusCode == 200) {
      console.log("[select_id]success!");
      
      //console.log("body");
      //console.log(body);
      
      //ID抽出
      var num = Object.keys(body.records).length;
      console.log("num = " + num);
      
      var line_one_id;
      line_broadcast_account = "";
      
      for (var i = 0; i < num; i++){
          
        line_one_id = body.records[i].line_id.value;
        console.log("line_one_id = " + line_one_id );
        
        if( line_broadcast_account != "" ){
          line_broadcast_account += "," + line_one_id;
        }
        else{
          line_broadcast_account = line_one_id;
        }
          
      }
      
      console.log("line_broadcast_account="+line_broadcast_account);

    
      return dfd.resolve();
    } else {
      console.log('[select_id]http error: '+ response.statusCode);
      return dfd.resolve();
    }
  });  
  
  return dfd.promise();  
}
       