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
   
   ４つのDB操作がある
   　・スケジュールDB
     ・送迎対象者DB
     ・送迎者DB
     ・送迎先（場所）DB
   ---------------------------------------------------------*/

/* ====== スケジュールDB操作 ======= */
module.exports.set_data2db = function(req, res){
  var dfd_set_data2db = new $.Deferred;
  
  return set_data( dfd_set_data2db, input_date, input_time, input_pickup_people, input_pickup_people_num, input_destination, input_destination_num );
}

module.exports.get_schedule_data_from_1_ID = function(req, res){   //1件分のスケジュールデータ読み出し
  var dfd_get_schedule_data_from_1_ID = new $.Deferred;
  return get_schedule_data_from_1_ID_inner( dfd_get_schedule_data_from_1_ID );
}

module.exports.update_data2db = function(req, res){
  
  var dfd_update_data2db = new $.Deferred;
  
  return update_data( dfd_update_data2db, input_date, input_time, input_pickup_people, input_destination, input_sender );
}

module.exports.update_id2db = function(req, res){
  
  var dfd_update_id2db = new $.Deferred;
  
  return update_id2sender( dfd_update_id2db, input_kintone_id, input_sender );
}


module.exports.get_vacant_day = function(req, res){
  var dfd_get_vacant_day = new $.Deferred;
  
  return get_vacant_days( dfd_get_vacant_day );
  
}

module.exports.check_still_vacant = function(req, res){
  var dfd_check_still_vacant = new $.Deferred;
  
  return is_sender( dfd_check_still_vacant );
  
}



/* ====== 送迎対象者DB操作 ======= */
module.exports.get_pickup_people_name_from_pickup_people_num = function(req, res){
  var dfd_get_pickup_people_name_from_pickup_people_num = new $.Deferred;
  
  return get_pickup_people_name_from_pickup_people_num_inner( dfd_get_pickup_people_name_from_pickup_people_num );
}

module.exports.get_pickup_people_name_from_caller_no = function(req, res){
  var dfd_get_pickup_people_name_from_caller_no = new $.Deferred;

  return get_pickup_people_name_from_caller_no_inner( dfd_get_pickup_people_name_from_caller_no );
}

module.exports.get_pickup_people_callid = function(req, res){
  var dfd_get_pickup_people_callid = new $.Deferred;
  return get_pickup_people_callid_inner( dfd_get_pickup_people_callid );
}

/* ====== 送迎者DB操作 ======= */

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

module.exports.get_input_sender_name = function(req, res){
  var dfd_get_input_sender_name = new $.Deferred;
  return get_input_sender_name_inner( dfd_get_input_sender_name );
}


/* ====== 送迎先（場所）DB操作 ======= */
module.exports.get_placename = function(req, res){
  var dfd_get_placename = new $.Deferred;
  return get_placename_inner( dfd_get_placename );
}





/* ------------------------------------------------------------
   kintoneへデータをセットする
  ------------------------------------------------------------- */
function set_data( dfd, input_date, input_time, input_pickup_people, input_pickup_people_num, input_destination, input_destination_num ){
  
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
      "pickup_people_num": {
        "value": input_pickup_people_num
      },
      "sender": {
        "value": WORD_SENDER_NOT_DECIDED
      },
      "destination":{
        "value": input_destination
      },
      "destination_num":{
        "value": input_destination_num
      }
    }
  }
};

request.post(options, function(error, response, body){
  if (!error && response.statusCode == 200) {
    console.log("[set_data]success!");
    return dfd.resolve();
  } else {
    console.log('[set_data]http error: '+ response.statusCode);
    return dfd.resolve();
  }
});
  
return dfd.promise();
  
  
}

/* ------------------------------------------------------------
   input_kintone_idのデータレコードから
   全データを読みだして input_xxにセット
  ------------------------------------------------------------- */
function get_schedule_data_from_1_ID_inner( dfd ){
  
  var select_url = process.env.KINTONE_URL_MULTI;
  
  if( input_kintone_id <= 0 ){
    console.log("bad input_kintone_id. input_kintone_id="+input_kintone_id);
    return dfd.resolve();
  }
  
  
  var raw_query = "$id=\"" + input_kintone_id + "\"";
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
      console.log("[get_schedule_data_from_1_ID_inner]success!");
      
      //console.log("body");
      //console.log(body);
      
      //ID抽出
      var num = Object.keys(body.records).length;
      console.log("num = " + num);
      
      if( num != 1 ){
        console.log("[get_schedule_data_from_1_ID_inner] invalid! num="+num);
        return dfd.resolve();
      }
      
      input_date = body.records[0].date.value;
      input_time = body.records[0].time.value;
      input_pickup_people = body.records[0].pickup_people.value;   //送迎対象者(送迎される人)
      input_pickup_people_num = body.records[0].pickup_people_num;  //値が格納されていない場合もあり
      input_sender = body.records[0].sender.value;          //送迎する人""のはず
      input_destination = body.records[0].destination.value;
      input_destination_num = body.records[0].destination_num;    //値が格納されていない場合もあり
      
      console.log( "input_date = " + input_date );
      console.log( "input_time = " + input_time );
      console.log( "input_pickup_people = " + input_pickup_people );
      console.log( "input_pickup_people_num = " + input_pickup_people_num );
      console.log( "input_sender = " + input_sender );
      console.log( "input_destination = " + input_destination );
      console.log( "input_destination_num = " + input_destination_num );
      
      
      return dfd.resolve();
      
    } else {
      console.log('[get_schedule_data_from_1_ID_inner]http error: '+ response.statusCode);
      return dfd.resolve();
    }
  });  
  
  return dfd.promise();  
  
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
      
//      if( body.records[0].sender.value != "" ){
      if( body.records[0].sender.value != WORD_SENDER_NOT_DECIDED ){
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
          
          if(( body.records[i].sender.value == "" )||(body.records[i].sender.value == WORD_SENDER_NOT_DECIDED)){
            line_reply_mode = LINE_MODE_ACCEPT_REPLY;
            input_kintone_id = kintone_id;
            console.log("line_reply_mode="+line_reply_mode);
          }
          else{
            kintone_id = -1;    //error
            input_kintone_id = kintone_id;
            line_reply_mode = LINE_MODE_DENEY_REPLY_ALREADY_EXIST;
            console.log("line_reply_mode="+line_reply_mode);
            //return dfd_select_id.reject();
          }
          
          
          return dfd_select_id.resolve();
        }
        console.log("i="+i);
        
      }
      kintone_id = -1;    //error
      input_kintone_id = kintone_id;
    
      return dfd_select_id.resolve();
    } else {
      console.log('[select_id]http error: '+ response.statusCode);
      line_reply_mode = LINE_MODE_DENEY_REPLY_NO_DATA;
      input_kintone_id = -1;
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
  
  //var raw_query = "date!=\"\" and sender=\"\"";
  var raw_query = "date!=\"\" and sender=\"送迎者未決定\"";    //WORD_SENDER_NOT_DECIDED
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
        day.sender = body.records[i].sender.value;  //WORD_SENDER_NOT_DECIDEDのはず
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


/* ------------------------------------------------------------
   place番号からplace_nameを取得する
  ------------------------------------------------------------- */
function get_placename_inner( dfd ){
  
  var select_url = process.env.KINTONE_URL_MULTI;
  
  var raw_query = "place_num=" + "\"" + input_destination_num + "\"";
  console.log("raw_query = " + raw_query );
  
  select_url = select_url + "?app=" + process.env.CYBOZU_APP_ID_PLACE_DB + "&query=" + encodeURIComponent( raw_query );
  console.log("select_url = " + select_url);
  
  var options = {
    uri: select_url,
    headers: {
      "X-Cybozu-API-Token": process.env.CYBOZU_API_TOKEN_PLACE_DB
    },
    json: true
  };

  request.get(options, function(error, response, body){
    if (!error && response.statusCode == 200) {
      console.log("[get_placename_inner]success!");
      
      //console.log("body");
      //console.log(body);
      
      //ID抽出
      var num = Object.keys(body.records).length;
      console.log("num = " + num);
      
      if( num == 1 ){
        input_destination = body.records[0].place.value;
        console.log("[get_placename_inner] input_destination = "+input_destination + "input_destination_num="+input_destination_num);
      }
      else{
        input_destination = input_destination_num;    //エラーは番号を入れる仕様
        console.log("[get_placename_inner] ERROR!!!! num="+num);
      }
      
      return dfd.resolve();
      
    } else {
      input_destination = input_destination_num;    //エラーは番号を入れる仕様
      console.log('[get_placename_inner]http error: '+ response.statusCode);
      return dfd.resolve();
    }
  });  
  
  return dfd.promise();  
  
}


/* ------------------------------------------------------------
   送迎対象者(pickup_people)番号から送迎対象者名(pickup_people_name)を取得する
  ------------------------------------------------------------- */
function get_pickup_people_name_from_pickup_people_num_inner( dfd ){
//function get_pickup_people_name_inner( dfd ){
  
  var select_url = process.env.KINTONE_URL_MULTI;
  
  if( flg_need_to_search_pickup_people_name == 0 ){
    //nothings to do.
    console.log("[get_pickup_people_name_from_pickup_people_num_inner] nothings to do");
    return dfd.resolve();
  }
  
  var raw_query = "pickup_people_num=" + "\"" + input_pickup_people_num + "\"";
  console.log("raw_query = " + raw_query );
  
  select_url = select_url + "?app=" + process.env.CYBOZU_APP_ID_PICKUP_PEOPLE_DB + "&query=" + encodeURIComponent( raw_query );
  console.log("select_url = " + select_url);
  
  var options = {
    uri: select_url,
    headers: {
      "X-Cybozu-API-Token": process.env.CYBOZU_API_TOKEN_PICKUP_PEOPLE_DB
    },
    json: true
  };

  request.get(options, function(error, response, body){
    if (!error && response.statusCode == 200) {
      console.log("[get_pickup_people_name_from_pickup_people_num]success!");
      
      //console.log("body");
      //console.log(body);
      
      //ID抽出
      var num = Object.keys(body.records).length;
      console.log("num = " + num);
      
      if( num == 1 ){
        input_pickup_people = body.records[0].pickup_people.value;
        console.log("[get_pickup_people_name_from_pickup_people_num] input_pickup_people = "+input_pickup_people);
      }
      else{
        input_pickup_people = input_pickup_people_num;    //エラーは番号を入れる仕様
        console.log("[get_pickup_people_name_from_pickup_people_num] ERROR!!!! num="+num);
      }
      
      return dfd.resolve();
      
    } else {
      input_pickup_people = input_pickup_people_num;    //エラーは番号を入れる仕様
      console.log('[get_pickup_people_name_from_pickup_people_num]http error: '+ response.statusCode);
      return dfd.resolve();
    }
  });  
  
  return dfd.promise();  
  
}

/* ------------------------------------------------------------
   送迎対象者の電話発信者番号(caller_no)から送迎対象者名(pickup_people_name)を取得する。
   
   ただし、SEARCH_TEL_NUMBER_PREFEREDが立っていなければ本関数では検索しない。
  ------------------------------------------------------------- */
function get_pickup_people_name_from_caller_no_inner( dfd ){
  var select_url = process.env.KINTONE_URL_MULTI;
  
  flg_need_to_search_pickup_people_name = 1;  //初期化。送迎対象者番号からの検索は必要
  
  if(! SEARCH_TEL_NUMBER_PREFERED ){
    return dfd.resolve();
  }
  

  
  var raw_query = "pickup_people_phoneid=" + "\"" + input_caller_no + "\"";
  console.log("raw_query = " + raw_query );
  
  select_url = select_url + "?app=" + process.env.CYBOZU_APP_ID_PICKUP_PEOPLE_DB + "&query=" + encodeURIComponent( raw_query );
  console.log("select_url = " + select_url);
  
  var options = {
    uri: select_url,
    headers: {
      "X-Cybozu-API-Token": process.env.CYBOZU_API_TOKEN_PICKUP_PEOPLE_DB
    },
    json: true
  };

  request.get(options, function(error, response, body){
    if (!error && response.statusCode == 200) {
      console.log("[get_pickup_people_name_from_caller_no]success!");
      
      //console.log("body");
      //console.log(body);
      
      //ID抽出
      var num = Object.keys(body.records).length;
      console.log("num = " + num);
      
      if( num == 1 ){
        input_pickup_people = body.records[0].pickup_people.value;
        flg_need_to_search_pickup_people_name = 0;  //送迎対象者番号からの検索は不要
        console.log("[get_pickup_people_name_from_caller_no] input_pickup_people = "+input_pickup_people);
      }
      else{
        console.log("[get_pickup_people_name_from_caller_no] ERROR!!!! num="+num);
      }
      
      return dfd.resolve();
      
    } else {
      input_pickup_people = input_pickup_people_num;    //エラーは番号を入れる仕様
      console.log('[get_pickup_people_name_from_caller_no]http error: '+ response.statusCode);
      return dfd.resolve();
    }
  });  
  
  return dfd.promise();  
  
}

/* ------------------------------------------------------------
   送迎対象者名(pickup_people_name)から電話番号(input_pickup_people_callid)を取得する
  ------------------------------------------------------------- */
function get_pickup_people_callid_inner( dfd ){
  
  var select_url = process.env.KINTONE_URL_MULTI;
  
  var raw_query = "pickup_people=" + "\"" + input_pickup_people + "\"";
  console.log("raw_query = " + raw_query );
  
  select_url = select_url + "?app=" + process.env.CYBOZU_APP_ID_PICKUP_PEOPLE_DB + "&query=" + encodeURIComponent( raw_query );
  console.log("select_url = " + select_url);
  
  var options = {
    uri: select_url,
    headers: {
      "X-Cybozu-API-Token": process.env.CYBOZU_API_TOKEN_PICKUP_PEOPLE_DB
    },
    json: true
  };

  request.get(options, function(error, response, body){
    if (!error && response.statusCode == 200) {
      console.log("[get_pickup_people_callid_inner]success!");
      
      //console.log("body");
      //console.log(body);
      
      //ID抽出
      var num = Object.keys(body.records).length;
      console.log("num = " + num);
      
      if( num == 1 ){
        input_pickup_people_callid = body.records[0].pickup_people_phoneid.value;
        if( body.records[0].auto_call.value.length > 0 ){
          input_pickup_people_auto_call_flg = 1;
        }
        else{
          input_pickup_people_auto_call_flg = 0;
        }
        //input_pickup_people_auto_call_flg = body.records[0].auto_call.value;
        console.log("[get_pickup_people_callid_inner] "+input_pickup_people + " TEL number="+input_pickup_people_callid);
        console.log("[get_pickup_people_callid_inner] "+input_pickup_people_auto_call_flg);
      }
      else{
        input_pickup_people_callid = "";
        input_pickup_people_auto_call_flg = 0;
        console.log("[get_pickup_people_callid_inner] ERROR!!!! num="+num);
      }
      
      return dfd.resolve();
      
    } else {
      input_pickup_people_callid = "";
      input_pickup_people_auto_call_flg = 0;
      console.log('[get_pickup_people_callid_inner]http error: '+ response.statusCode);
      return dfd.resolve();
    }
  });  
  
  return dfd.promise();  
  
}






/* ------------------------------------------------------------
   送迎者LINE番号(input_sender_line_id)から送迎者名(input_sender)を取得する
  ------------------------------------------------------------- */
function get_input_sender_name_inner( dfd ){
  
  var select_url = process.env.KINTONE_URL_MULTI;
  
  var raw_query = "line_id=" + "\"" + input_sender_line_id + "\"";
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
      console.log("[get_input_sender_name_inner]success!");
      
      //console.log("body");
      //console.log(body);
      
      //ID抽出
      var num = Object.keys(body.records).length;
      console.log("num = " + num);
      
      if( num == 1 ){
        input_sender = body.records[0].name.value;
        console.log("[get_input_sender_name_inner] input_sender = "+input_sender + "input_sender_line_id="+input_sender_line_id);
      }
      else{
        input_sender = input_sender_line_id;    //エラーは番号を入れる仕様
        console.log("[get_input_sender_name_inner] ERROR!!!! num="+num);
      }
      
      return dfd.resolve();
      
    } else {
      input_sender = input_sender_line_id;    //エラーは番号を入れる仕様
      console.log('[get_input_sender_name_inner]http error: '+ response.statusCode);
      return dfd.resolve();
    }
  });  
  
  return dfd.promise();  
  
}







       