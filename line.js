/* LINE送受信 */

/* LINEのACCESS_TOKEN等 を heroku configへ各自セット必要
    heroku config:set LINE_CHANNEL_ACCESS_TOKEN=xxxx
    heroku config:set LINE_USERID=xxxx
*/

var DEBUG = 0;          //1=DEBUG 0=RELEASE   (特定時間以外broadcastしない機能もここ)
var LOCAL_DEBUG = 0;    //1=Local node.js利用   0=herokuサーバー利用(default)  
var DEBUG_ISTODAY_24H = 0;  //1=デバッグ用24時間データ全登録　0=リリース用

var request = require('request');
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
    info1.text = "既に送迎対応者が決まってるようです。次回よろしくお願いします。"
                  + String.fromCodePoint(choose_emoji(TYPE_LINE_EMOJI_SMILE));
    pushmessage[0] = info1;
    
    info2 = new PushMessage();
    info2.type = 'sticker';
    info2.packageId = '2';
    info2.stickerId = '38';
    pushmessage[1] = info2;  
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
      + "送迎対象者: 〇〇\n"
      + "あなたの名前: 〇〇";
    pushmessage[1] = info2;    
    
    info3 = new PushMessage();
    info3.type = 'text';
    info3.text = 
      "本地区の予約状況は下記で参照可能です\n"
      + "https://v2urc.cybozu.com/k/22/";
    pushmessage[2] = info3;
    
  }
  else if ( mode == LINE_MODE_FOLLOW ){
    info1 = new PushMessage();
    info1.type = 'text';
    info1.text = "送迎者登録ありがとうございました。\n\n"
      + "送迎希望者からご連絡あり次第、本LINEにてご連絡致しますので送迎可能な場合は下記フォーマットにてLINEにて返答お願いします"
      + String.fromCodePoint(choose_emoji(TYPE_LINE_EMOJI_SMILE));
    
    pushmessage[0] = info1;
    
    info2 = new PushMessage();
    info2.type = 'text';
    info2.text = 
      "日: 2018-〇-〇\n"
      + "時間: 〇:〇\n"
      + "送迎対象者: 〇〇\n"
      + "あなたの名前: 〇〇";
    pushmessage[1] = info2;    
    
    info3 = new PushMessage();
    info3.type = 'text';
    info3.text = 
      "本地区の予約状況は下記で参照可能です\n"
      + "https://v2urc.cybozu.com/k/22/\n"
      + "(PCで見る方が望ましい)\n"
      + "account: cfi-guest\n"
      + "pass: codeforikoma2018";
    pushmessage[2] = info3; 
    
    info4 = new PushMessage();
    info4.type = 'text';
    info4.text = 
      "Special Thanks "
      + String.fromCodePoint(choose_emoji(TYPE_LINE_EMOJI_SMILE))
      + "\n"
      + " - LINE\n"
      + " - twilio\n"
      + " - kintone\n"
      + " - heroku\n\n"
      + "produced by CODE for IKOMA";
    pushmessage[3] = info4; 
    
    
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
    text = "下記人からリクエスト有り。\n行ける人いますでしょうか？\n"
            + "下記をコピペしてLINEで返答すると簡単です";
  }
  else if( num == 2 ){
    text = "日: " + date + " " + "\n"
            + "時間: " + time + " " + "\n"
            + "送迎対象者: " + pickup_people + "\n"
            + "行先: " + destination + "\n"
            + "あなたの名前: 〇〇";
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
