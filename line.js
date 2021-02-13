/* LINE送受信 */

/* LINEのACCESS_TOKEN等 を heroku configへ各自セット必要
    heroku config:set LINE_CHANNEL_ACCESS_TOKEN=xxxx
    heroku config:set LINE_USERID=xxxx
*/

var DEBUG = 0;          //1=DEBUG 0=RELEASE   (オーナーにのみ配信する機能もこれ！★)
var LOCAL_DEBUG = 0;    //1=Local node.js利用   0=herokuサーバー利用(default)  
var DEBUG_ISTODAY_24H = 0;  //1=デバッグ用24時間データ全登録　0=リリース用

var request = require('request');
var $ = require('jquery-deferred');
var static_data = require('./line_static_data.js');

/*
var express = require('express');
var bodyParser = require('body-parser');
var request = require('request');
var app = express();
var $ = require('jquery-deferred');
var pg = require('pg');
*/



global.PushMessage = function( ){
  this.type;
  this.text = "";
  this.packageId;
  this.stickerId;
}
global.pushmessage = new Array();



var input_message="";
var reply_message="";




var LINE_REPLY_URL = "https://api.line.me/v2/bot/message/reply";
var LINE_PUSH_URL = "https://api.line.me/v2/bot/message/push";
var LINE_PUSH_URL_MULTICAST = "https://api.line.me/v2/bot/message/multicast";

var TYPE_PUSH = 1;
var TYPE_MULTICAST= 2;



var FLAG_INSERT = 1;
var FLAG_DELETE = 0;


var TYPE_USER = 1;
var TYPE_GROUP = 2;
var select_type = 0;  //初期値


var id_list = new Array();


var PUSH_BROADCAST_MODE = 1;    //push_notification_modeに設定する値
var PUSH_REPLY_MODE = 2;        //push_notification_modeに設定する値
global.push_notification_mode = PUSH_REPLY_MODE;


var TYPE_LINE_STAMP_MOTIVATION = 1;
var TYPE_LINE_STAMP_FRIENDS = 2;

var TYPE_LINE_EMOJI_SMILE = 1;


var TYPE_LINE_STAMP_MOTIVATION = 1;
var TYPE_LINE_STAMP_FRIENDS = 2;

var TYPE_LINE_EMOJI_SMILE = 1;

//bot_words.get_bot_reply_words受け渡し用
global.bot_reply_words_input;     //bot_words.get_bot_reply_words()との受け渡し用(input)
global.bot_reply_words_output;    //bot_words.get_bot_reply_words()との受け渡し用(output)




/* ========================================================================= */


function init_pushmessage(){
  if( pushmessage.length != 0 ){
    while( pushmessage.length > 0 ){
      pushmessage.pop();
    }
  }
}


/* LINEにて送迎者を募集 LINE broadcast
  input_date, input_time, input_pickup_people, input_destination
*/
module.exports.send_line_broadcast = function(req, res){
  
  var dfd_send_line_broadcast = new $.Deferred;
  
//function send_line_broadcast(){
  
  console.log("start send_line_broadcast");
  console.log("line_broadcast_account = " + line_broadcast_account);
  
  init_pushmessage();
  info1 = new PushMessage();
  info1.type = 'text';
  info1.text = make_broadcast_message( 1, input_date, input_time, input_pickup_people, input_destination );
  pushmessage[0] = info1;
  
  info2 = new PushMessage();
  info2.type = 'text';
  info2.text = make_broadcast_message( 2, input_date, input_time, input_pickup_people, input_destination );
  pushmessage[1] = info2;
  
  info3 = new PushMessage();
  info3.type = 'text';
  info3.text = make_broadcast_message( 3, input_date, input_time, input_pickup_people, input_destination );
  pushmessage[2] = info3;
  
  
  var to_array = line_broadcast_account.split(",");
  //var to_array = new Array();
  //to_array[0] = process.env.LINE_USERID;
  //to_array[1] = 'xxx';
  
  console.log("line before send");
    
    
    send_notification( to_array, pushmessage, TYPE_MULTICAST );
//    send_notification( to_array, pushmessage, TYPE_PUSH );  //送付先が一人の時はTYPE_PUSHでないとダメかも！？（途中で変わった？）
  
  return dfd_send_line_broadcast.resolve();

  
}


module.exports.send_line_reply = function(req, res){
  
  console.log("START send_line_reply");
  console.log("input_message = "+ input_line_message);
  console.log("line_reply_mode = "+ line_reply_mode);
  
  /* DEBUG */
  //line_reply_mode = LINE_MODE_FOLLOW;
  /* DEBUG */
  
  
  var reply_message = set_line_reply_message( line_reply_mode, input_line_message );
  
  var headers = {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + process.env.LINE_CHANNEL_ACCESS_TOKEN
  }
  var body = {
    replyToken: line_reply_token,
//    messages: pushmessage
    messages: reply_message
  }

  request({
    url: LINE_REPLY_URL,
    method: 'POST',
    headers: headers,
    body: body,
    json: true
  });
}


module.exports.send_line_choice = function(req, res){
  show_line_button_template();
}

module.exports.send_line_confirm = function(req, res){
  show_line_confirm_template();
}

function set_line_reply_message( mode, input_message ){
  
  init_pushmessage();
  
  if(( mode == LINE_MODE_1 ) || ( mode== LINE_MODE_ACCEPT_REPLY )){
    info1 = new PushMessage();
    info1.type = 'text';
    info1.text = "受け付けました！\nありがとうございました"
                  + String.fromCodePoint(EMOJI_peace);
    pushmessage[0] = info1;     
    
    /*
    info2 = new PushMessage();
    info2.type = 'sticker';
    info2.packageId = '1';
    info2.stickerId = '114';
    pushmessage[1] = info2;  
    */
    pushmessage[1] = choose_line_stamp( TYPE_LINE_STAMP_MOTIVATION );
     
  }
  else if( mode == LINE_MODE_DENEY_REPLY_NO_DATA ){
    info1 = new PushMessage();
    info1.type = 'text';
    info1.text = "その日時に送迎予定の人はいないようです。再確認お願いします"
                  + String.fromCodePoint(choose_emoji(TYPE_LINE_EMOJI_SMILE));
    pushmessage[0] = info1;
    
    info2 = new PushMessage();
    info2.type = 'sticker';
    info2.packageId = '2';
    info2.stickerId = '38';
    pushmessage[1] = info2;  
  }
  else if( mode == LINE_MODE_DENEY_REPLY_ALREADY_EXIST ){
    info1 = new PushMessage();
    info1.type = 'text';
    info1.text = "既に送迎対応者が決まってるようです。次回よろしくお願いします"
                  + String.fromCodePoint(choose_emoji(TYPE_LINE_EMOJI_SMILE));
    pushmessage[0] = info1;
    
    info2 = new PushMessage();
    info2.type = 'sticker';
    info2.packageId = '2';
    info2.stickerId = '38';
    pushmessage[1] = info2;  
  }
  else if( mode == LINE_MODE_DENEY_REPLY_CANCEL ){
    info1 = new PushMessage();
    info1.type = 'text';
    info1.text = "キャンセル了解しました。\n次回よろしくお願いします"
                  + String.fromCodePoint(choose_emoji(TYPE_LINE_EMOJI_SMILE));
    pushmessage[0] = info1;
    
    info2 = new PushMessage();
    info2.type = 'sticker';
    info2.packageId = '1';
    info2.stickerId = '13';
    pushmessage[1] = info2;  
  } 
  else if( mode == LINE_MODE_SHOW_CALENDER ){
    info1 = new PushMessage();
    info1.type = 'text';
    info1.text = URL_CALENDER;
    pushmessage[0] = info1;
  }
  else if( mode == LINE_MODE_DENEY_REPLY_SHOW_CALENDER ){
    info1 = new PushMessage();
    info1.type = 'text';
    info1.text = "その他はカレンダーから登録してください\n"
                  +URL_CALENDER;
    pushmessage[0] = info1;
  }
  else if( mode == LINE_MODE_NOTIFY_CORRECT_FORMAT ){
    info1 = new PushMessage();
    info1.type = 'text';
    info1.text = "間違ってますよ"
      + String.fromCodePoint(choose_emoji(TYPE_LINE_EMOJI_SMILE))
      + "\n下記フォーマットでお願いします。";
    pushmessage[0] = info1;
    
    info2 = new PushMessage();
    info2.type = 'text';
    info2.text = 
      "日: 2018-〇-〇\n"
      + "時間: 〇:〇\n"
      + "利用者: 〇〇\n"
      + "あなたの名前: 〇〇";
    pushmessage[1] = info2;    
    
    info3 = new PushMessage();
    info3.type = 'text';
    info3.text = 
      "本地区の予約状況は下記で参照可能です\n"
      + URL_CALENDER;
    pushmessage[2] = info3;
    
  }
  else if ( mode == LINE_MODE_FOLLOW ){
    info1 = new PushMessage();
    info1.type = 'text';
    info1.text = "送迎者登録ありがとうございました。\n\n"
      + "利用者からご連絡あり次第、本LINEにてご連絡致します"
      + "(" + new_follower_line_id.substr( -4 ) +")"
      + String.fromCodePoint(choose_emoji(TYPE_LINE_EMOJI_SMILE));
    
    pushmessage[0] = info1;
    
    /*
    info2 = new PushMessage();
    info2.type = 'text';
    info2.text = 
      "日: 2018-〇-〇\n"
      + "時間: 〇:〇\n"
      + "送迎対象者: 〇〇\n"
      + "あなたの名前: 〇〇";
    pushmessage[1] = info2;    */
    
    info3 = new PushMessage();
    info3.type = 'text';
    info3.text = 
      "本地区の予約状況は下記で参照可能です\n"
      + URL_CALENDER + "/\n"
      + "(PCで見る方が望ましい)\n"
      + "account: shika\n"
      + "pass: volunteer2019";
    pushmessage[1] = info3; 
    
    info4 = new PushMessage();
    info4.type = 'text';
    info4.text = 
      "Special Thanks "
      + String.fromCodePoint(choose_emoji(TYPE_LINE_EMOJI_SMILE))
      + "\n"
      + " - LINE\n"
      + " - twilio\n"
      + " - kintone\n"
      + " - Sendgrid\n"
      + " - heroku\n\n"
      + "produced by CODE for IKOMA";
    pushmessage[2] = info4; 
    
    
  }
  else if ( mode == LINE_MODE_UNFOLLOW ){
    info1 = new PushMessage();
    info1.type = 'text';
    info1.text = "今まで送迎対応ありがとうございました" + String.fromCodePoint(choose_emoji(TYPE_LINE_EMOJI_SMILE));
    pushmessage[0] = info1;
  }
  else{
    //don't care
    console.log("error");
  }

  
  return pushmessage;
}


function make_broadcast_message( num, date, time, pickup_people, destination ){
  var text;
  
  if( num == 1 ){
    text = "下記人からリクエスト有り。\n行ける人いますでしょうか？\n\n"
            + "「リスト」と入力すると送迎未決定リストから選択することが可能です。\nもしくは、下記をコピペしてLINEで返答することもできます。";
  }
  else if( num == 2 ){
    text = "日: " + date + " " + "\n"
            + "時間: " + time + " " + "\n"
            + "利用者: " + pickup_people + "\n"
            + "行先: " + destination;
  }
  else if( num == 3 ){
    text = "よろしくお願いします"
            + String.fromCodePoint(choose_emoji(TYPE_LINE_EMOJI_SMILE));      
  }
  
  return text;
}


function send_notification( destination, push_message, push_or_multicast ){
  
  if(DEBUG){  //DEBUG時はオーナーにしか投げない
    dest = new Array();
    dest[0] = process.env.LINE_USERID;
    destination = dest;
  }
      
  console.log("send_notification destination="+destination);
  
  var send_url;
  if( push_or_multicast == TYPE_PUSH ){
    send_url = LINE_PUSH_URL;
  }
  else if( push_or_multicast == TYPE_MULTICAST ){
    send_url = LINE_PUSH_URL_MULTICAST;
  }
  else{
    console.log("error");
    return;
  }

  
    var headers = {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + process.env.LINE_CHANNEL_ACCESS_TOKEN
    }
    var body = {
        to: destination,
//        to: process.env.LINE_USERID,   //★★★★[DEBUG]全員にbroadcastせずに自分だけにbroadcastすること
        messages: push_message      
    }

      request({
   //     url: LINE_PUSH_URL,
        url: send_url,
        method: 'POST',
        headers: headers,
        body: body,
        json: true
      });
}


function show_line_choice( event ){
  //reply_message(event);
  show_line_button_template();
  
}

function show_line_button_template(){
//function reply_message(e) {
  //var input_text = e.message.text;
  
  console.log("START show_line_button_template");
  console.log("input_line_message="+input_line_message);
  


    /* ----------- [参考]LINE postback/message/url/datetimepicker --------------- 
    var postData = {
      "replyToken": line_reply_token,
      "messages": [{
        "type": "template",
        "altText": "select",
        "template": {
          "type": "buttons",
//          "thumbnailImageUrl": "https://~.png",
          "title": "送迎支援システム",
          "text": "送迎可能日を選択お願いします",
          "actions": [
            {
              "type": "postback",
              "label": "postback",
              "data": "postback selected"
            },
            {
              "type": "message",
              "label": "message",
              "text": "text:message"
            },
            {
              "type": "uri",
              "label": "uri",
              "uri": "https://linecorp.com"
            },
            {
              "type": "datetimepicker",
              "label": "datetimepicker",
              "data": "datetimepicker selected",
              "mode": "datetime",
              "initial": "2017-10-25T00:00",
              "max": 　 "2017-12-31T23:59",
              "min": "2017-01-01T00:00"
            }
          ]
        }
      }]
    };
    ----------- [参考]LINE postback/message/url/datetimepicker --------------- */
  
  
  var line_action_json_format = {     //https://developers.line.me/ja/reference/messaging-api/#postback-action
    "type": "postback",
    "label": "",
    "data": ""
  };
  line_actions = new Array();
    
  var MAX_LINE_LABEL_LENGTH = 20; //MAX20文字（全角でも半角でも２０文字）それ以上の場合は選択肢表示されない。
  var MAX_LINE_CHOICE_LENGTH = 4; //MAX4件までしかリスト表示されないようだ
  var date_devide;
  var show_line_choice;           //LINE選択肢表示件数
  
  if( no_candidate_day.length >= MAX_LINE_CHOICE_LENGTH ){
    show_line_choice = MAX_LINE_CHOICE_LENGTH;
  }
  else{
    show_line_choice = no_candidate_day.length;
  }
  
  for(var i=0; i< show_line_choice; i++){
//  for(var i=0; i< no_candidate_day.length; i++){

    line_actions[i] = JSON.parse( JSON.stringify(line_action_json_format));
    
    date_devide = no_candidate_day[i].date.split('-');
    
    line_actions[i].label = ( date_devide[1] + "/" + date_devide[2] + " "  
                             + no_candidate_day[i].time + " " 
                             + no_candidate_day[i].pickup_people + "さん" )
                            .substr(0, MAX_LINE_LABEL_LENGTH);

    line_actions[i].data = CONFIRM_WORD + no_candidate_day[i].kintone_id;
    //line_actions[i].data = no_candidate_day[i].kintone_id;
  }

  if( no_candidate_day.length >= MAX_LINE_CHOICE_LENGTH ){
    line_actions[MAX_LINE_CHOICE_LENGTH-1].label = "他" + (no_candidate_day.length-MAX_LINE_CHOICE_LENGTH+1) + "件あり";
    line_actions[MAX_LINE_CHOICE_LENGTH-1].data = MANY_VACANT_WORD;  //★★★ここ対処必要
  }



  var postData = {
      "replyToken": line_reply_token,
      "messages": [{
        "type": "template",
        "altText": "送迎可能日を選択",
        "template": {
          "type": "buttons",
//          "thumbnailImageUrl": "https://~.png",
//          "title": "送迎支援システム",
          "text": "送迎可能日を選択お願いします",
//          "actions": JSON.stringify( line_actions )
          "actions": line_actions
        }
      }]
  };
              
  fetch_data(postData);
}


function show_line_confirm_template(){
  
  console.log("START show_line_confirm_template");
  //console.log("input_line_message="+input_line_message);
  console.log("input_kintone_id="+input_kintone_id);
  
  var show_text = "この日時で正しいですか？\n\n"
                  + "　日時: " + input_date + " " + input_time + "\n"
                  + "　利用者: " + input_pickup_people + "さん\n"
                  + "　場所: " + input_destination;
  

  var postData = {
      "replyToken": line_reply_token,
      "messages": [{
        "type": "template",
        "altText": "選択日確認",
        "template": {
          "type": "confirm",
//          "text": "この日で正しいですか？",
          "text": show_text,
          "actions": [
            {
              "type": "postback",
              "label": "YES",
              "data": input_kintone_id
            },
            {
              "type": "postback",
              "label": "NO",
              "data": CANCEL_WORD+input_kintone_id
            }
          ]
        }
      }]
  };
              
  fetch_data(postData);
}



function post_back(e) {
  console.log("post_back");
  
  var data = e.postback.data;
  var replay_text = "";
  if (data == "postback selected") {
    replay_text = data;
  } else if (data == "datetimepicker selected") {
    replay_text = data + "\n" + e.postback.params['datetime'];
  }

  var postData = {
    "replyToken": e.replyToken,
    "messages": [{
      "type": "text",
      "text": replay_text + "\n" + JSON.stringify(e.postback)
    }]
  };
  fetch_data(postData);
}

function fetch_data(postData) {
  console.log("fetch_data");
  
      var headers = {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + process.env.LINE_CHANNEL_ACCESS_TOKEN
    }

  request({
    url: LINE_REPLY_URL,
//    url: "https://api.line.me/v2/bot/message/reply",
    method: 'POST',
    headers: headers,
    body: JSON.stringify(postData),
//    json: true
  });
  
  line_reply_mode = -1;
  console.log("fetch_data finish");
  
}
/* -------------- */



function choose_line_stamp( type ){
  var random_num;
  info = new PushMessage();
  info.type = 'sticker';
  
  if( type == TYPE_LINE_STAMP_MOTIVATION ){
    random_num = ( Math.floor( Math.random() * 100 )) % motivation_stamp.length;
    info.packageId = motivation_stamp[random_num][0];
    info.stickerId = motivation_stamp[random_num][1];
  }
  else if( type == TYPE_LINE_STAMP_FRIENDS ){
    random_num = ( Math.floor( Math.random() * 100 )) % friends_stamp.length;
    info.packageId = friends_stamp[random_num][0];
    info.stickerId = friends_stamp[random_num][1];
  }
  else{
    console.log("ERROR: choose_line_stamp");
    info.packageId = '1';
    info.stickerId = '114';
  }
  
  
  console.log("[choose_line_stamp] type="+type + " random_num="+random_num);  
  console.log("[choose_line_stamp] packageId="+info.packageId + " stickerId="+info.stickerId);
  
  return info;
}

function choose_emoji( type ){
  var emoji_code;
  var random_num;
  
  if( type == TYPE_LINE_EMOJI_SMILE ){
    random_num = ( Math.floor( Math.random() * 100 )) % smile_emoji.length;
    emoji_code = smile_emoji[random_num];
  }
  else{
    console.log("ERROR: choose_emoji");
    emoji_code = EMOJI_SMILE1;
  }
  
  //console.log("emoji_code="+emoji_code);
  return( emoji_code );
  
}
