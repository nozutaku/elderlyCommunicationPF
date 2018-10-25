/* LINE送受信 */

/* LINEのACCESS_TOKEN等 を heroku configへ各自セット必要
    heroku config:set LINE_CHANNEL_ACCESS_TOKEN=xxxx
    heroku config:set LINE_USERID=xxxx
*/

var DEBUG = 0;          //1=DEBUG 0=RELEASE   (特定時間以外broadcastしない機能もここ)
var LOCAL_DEBUG = 0;    //1=Local node.js利用   0=herokuサーバー利用(default)  
var DEBUG_ISTODAY_24H = 0;  //1=デバッグ用24時間データ全登録　0=リリース用

var request = require('request');

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
  info = new PushMessage();
  info.type = 'text';
  info.text = make_broadcast_message( input_date, input_time, input_pickup_people, input_destination );
  //info.text = "下記人からリクエスト有り。行ける人いますでしょうか？\n\n 日時：2018/10/28 15:00 \n 送迎対象者：野津さん \n 行先：いそかわ";
  
  pushmessage[0] = info;
  
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
  
/*  
  set_line_reply_message( line_reply_mode, input_line_message );
  init_pushmessage();
  info1 = new PushMessage();
  info1.type = 'text';
  //info1.text = reply_message;
  info1.text = "受け付けました！";
  pushmessage[0] = info1;
*/  
  
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
  
  if( mode == LINE_MODE_1 ){
    info1 = new PushMessage();
    info1.type = 'text';
    info1.text = "受け付けました！";
    pushmessage[0] = info1;        
  }
  else if ( mode == LINE_MODE_FOLLOW ){
    info1 = new PushMessage();
    info1.type = 'text';
    info1.text = "送迎者登録ありがとうございました。\n\n"
      + "送迎希望者からご連絡あり次第、本LINEにてご連絡致しますので送迎可能な場合は下記フォーマットにてLINEにて返答お願いします。\n\n"
      + "日時: 〇〇\n"
      + "送迎対象者: 〇〇\n"
      + "あなたの名前: 〇〇\n\n"
      + "本地区の予約状況は下記で参照可能です\n"
      + "https://v2urc.cybozu.com/k/22/";
    
    pushmessage[0] = info1;     
  }
  else if ( mode == LINE_MODE_UNFOLLOW ){
    info1 = new PushMessage();
    info1.type = 'text';
    info1.text = "今まで送迎対応ありがとうございました"
    pushmessage[0] = info1;
  }
  else{
    //don't care
    console.log("error");
  }

  
  return pushmessage;
}


function make_broadcast_message( date, time, pickup_people, destination ){
  var text;
  
  text = "下記人からリクエスト有り。\n行ける人いますでしょうか？\n\n"
          + "日時: " + date + " " + time + "\n"
          + "送迎対象者: " + pickup_people + "\n"
          + "行先: " + destination + "\n\n"
          + "よろしくお願いします";
  
  return text;
}








/*
app.get('/', function(req, res) {     // https://line-manabiya-ikoma.herokuapp.com/?mode=★    [local] http://localhost:3000/?mode=★ で検証！
*/ 
function app_get(req, res) {    //dummy
  
  /* =============== PUSH通知DEBUG用(ここから) ================ */
  console.log("start get");
  var url = require('url');
  var urlInfo = url.parse(req.url, true);
  var mode = urlInfo.query.mode;
  console.log ("mode="+mode);
  
  
  //なんでもTEST
  if (mode == 1) {
    
    
    //bot_words.get_bot_reply_words_number();
    
  info = new PushMessage();
  info.type = 'text';
  //info.text = "テスト１"+EMOJI_1+EMOJI_3;
  info.text = "おはよう" 
              + String.fromCodePoint(choose_emoji(TYPE_LINE_EMOJI_SMILE)) + "\n"
              + set_weather_sentence( "晴れ時々雪", "31", "100" );
//              + set_weather_sentence( "晴れ時々曇り", "14" );

  init_pushmessage();
  pushmessage[0] = info;
    
  info2 = new PushMessage();
  info2.type = 'text';
  info2.text = "おはよう" 
              + String.fromCodePoint(choose_emoji(TYPE_LINE_EMOJI_SMILE)) + "\n"
              + set_weather_sentence( "くもり", "16", "30" );
  pushmessage[1] = info2;   



  pushmessage[2] = choose_line_stamp( TYPE_LINE_STAMP_MOTIVATION ); 
    
  /* ------------- */
    
    //input_message = "はばたき";
    input_message = STRING_IKOMA_ALL_STUDYROOM;
    push_notification_mode = PUSH_BROADCAST_MODE; 
    
    var to_array = new Array();

    to_array[0] = process.env.USERID;
    //to_array[1] = 'xxx';
    
    
//    send_notification( to_array, pushmessage, TYPE_MULTICAST );
//    send_notification( to_array, pushmessage, TYPE_PUSH );  //送付先が一人の時はTYPE_PUSHでないとダメかも！？（途中で変わった？）
    
    
    
    //send_notification_to_all_group();
    
 
  }
  //自習室情報取得してお薦め。ノーマル文章
  else if (mode == 2){

    input_message = "返答数";

    
    //input_message = "はばたき";
    //input_message = STRING_IKOMA_ALL_STUDYROOM;

    push_notification_mode = PUSH_BROADCAST_MODE; 
    
    var to_array = new Array();

    to_array[0] = process.env.USERID;
    //to_array[1] = 'xxx';
      
    make_reply_message()
    .done(function(){
      console.log("reply_message1 = " + reply_message);
      
      info1 = new PushMessage();
      info1.type = 'text';
      if( reply_message == ""){
        info1.text = "テスト";
      }else{
        info1.text = reply_message;
        //pushmessage[0] = info1;
      }

      
  /* ------------ */
  get_weatherServerConnection.get_today_weather()
  .done(function(){

    
    var reply_message2 = set_weather_sentence( today_weather, today_temperature_high, today_rain_precipitation );
    
    console.log("reply_message = "+reply_message2);
    info2 = new PushMessage();
    info2.type = 'text';
    info2.text = reply_message2;
    
    init_pushmessage();
    pushmessage[0] = info2;
    pushmessage[1] = info1;
    
    send_notification( to_array, pushmessage, TYPE_MULTICAST );
//    send_notification( to_array, reply_message, TYPE_MULTICAST );    
  });      
  /* ------------ */

      //send_notification(to_array, "テストっす\n\n" + reply_message, TYPE_MULTICAST);
    });
  }
  
  //天気予報＋自習室情報
  else if (mode == 3){
    
    //fortunetelling_sign = TODAY_NO1_FOR_BROADCAST;
    fortunetelling_sign = "蟹座";
    fortunetelling_sentence = "";


    
    get_fortunetellingConnection.get_today_fortunetelling()
    .done(function(){
      console.log("fortunetelling done");
      console.log(fortunetelling_sentence);
    });

  }
  
  //受験本番まであと数日！
  else if (mode == 4){

  }
  else if( mode == 5 ){ //DB test
    

    var id = "1234567";
    
    //insert_id2db( id, TYPE_USER );
    insert_id2db( id, TYPE_GROUP );
    //delete_id2db( id );
    
    
  }
  else if( mode == 6 ){ //DB test
    

    var id = "1234567";
    
    delete_id2db( id );
    
    
  }
  else if( mode == 7 ){ //DB test & announce用
    

    var to_array = new Array();

    to_array[0] = process.env.USERID;
    
    info1 = new PushMessage();
    info1.type = 'text';
//    info1.text = "<バージョンアップのお知らせ>\n\n話しかけると約20種類返答できるようになったよ。何個みつけれるかな～？";
    info1.text = "昨日からトラブル発生中。PUSH通知失敗してます。ご迷惑をおかけします。";
    
    info2 = new PushMessage();
    info2.type = 'sticker';
    info2.packageId = "1";
    info2.stickerId = "10";  //ガッツポーズのスタンプ
    
    init_pushmessage();
    pushmessage[0] = info1;
    pushmessage[1] = info2;
    


    
    select_type = TYPE_USER;    //read_id_from_db()を呼ぶための設定
    //select_type = TYPE_GROUP;
    
    read_id_from_db( )
    .done(function(){
      if( select_type == TYPE_USER ){
        
  //      send_notification( to_array, pushmessage, TYPE_MULTICAST );   //上記で指定
  //      send_notification( id_list, pushmessage, TYPE_MULTICAST );    //DBから取得

      }
      else if( select_type == TYPE_GROUP ){

      }
      
      console.log("ID_LIST="+ id_list);
    });
  }
  
  else if ( mode == 9 ){
    //send_notification_hourly_internal();
      
  }
  else{
    
  }
  /* =============== PUSH通知DEBUG用(ここまで) ================ */
  
  console.log("send 200 OK");
  res.status(200).end();

  
//});
}



/*
app.post('/webhook', function(req, res, next){
*/
function app_post(){    //dummy
  
	console.log("start post method");
  reply_message = "";   //初期化

    res.status(200).end();

  
  // [参考] http://whippet-818.hatenablog.com/entry/2017/02/07/004558

    for (var event of req.body.events){
		//var event = req.body.events[0];
      
        if (event.type == 'message'){          
          console.log("====================\n");
          console.log("LINE message event come now.")
          //console.log(event);
          console.log("====================\n");
          
          if( event.source.type != "user" ){
            console.log("NOT from user. so no reply");
            return;
          }
          
          input_message = event.message.text;
          push_notification_mode = PUSH_REPLY_MODE;
  
          make_reply_message()
          .done(function(){
            console.log("reply_message = " + reply_message);
            
            info1 = new PushMessage();
            info1.type = 'text';
            info1.text = reply_message;
            init_pushmessage();
            pushmessage[0] = info1;
            
            
            var headers = {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + process.env.CHANNEL_ACCESS_TOKEN
            }
            var body = {
                replyToken: event.replyToken,
                messages: pushmessage
            }

            request({
                url: LINE_REPLY_URL,
                method: 'POST',
                headers: headers,
                body: body,
                json: true
            });
            
            if( event.source.type == "user" ){
              //record_log_data( event.message.text, event.source.userId );
              record_log_data( event.message.text, "000" );
            }
            
          });
          
          
          

        }

        // 以下がビーコンに関するコードです        
        // 参考文献：https://qiita.com/n0bisuke/items/60523ea48109320ad4a5
        else if (event.type == 'beacon'){
            console.log("====================\n");
            console.log("beacon event fire.")
            console.log(event);
            console.log("====================\n");
          
            var beacon_userid = event.source.userId;
            var beacon_usertype = event.source.type;
            var beacon_hwid = event.beacon.hwid;
            var beacon_inout = event.beacon.type;
            console.log("beacon userid="+beacon_userid);
            console.log("beacon usertype="+beacon_usertype);
            console.log("beacon hwid="+beacon_hwid);
            console.log("beacon in/out="+beacon_inout);
          
          
            if( beacon_inout == "leave")  return;
          
            //本来はbeacon_useridが含まれるgroup限定でpush通知すべきであるが、
            //認証アカウントしかgroup内userid listを取得できない制限有。
            //今回は暫定で全グループへ配信する（実際のユースケースでは当然ダメ）
            send_notification_to_all_group();
          
        }
      
      // アカウントが友だち追加またはブロック解除された
      else if(( event.type == 'follow' ) || ( event.type == 'unfollow' )){
        console.log("====================\n");
        console.log("follow/unfollow event.ともだち追加/削除してくれたよ")
        console.log(event);
        console.log("====================\n");
        
        if( event.source.type == "user" ){
          if (typeof event.source.userId === 'undefined') {
            console.log("follow event but not user???");
          }else{
            var new_follower_id = event.source.userId;
            console.log("new_member="+new_follower_id);
            
            
            //★DB追加・削除
            if( event.type == 'follow' ){
              insert_id2db( new_follower_id, TYPE_USER );
            }
            else if ( event.type == 'unfollow' ){
              delete_id2db( new_follower_id );
            }
            else{
              //don't care.
            }
            
            //welcome メッセージを送る
            if( event.type == 'follow' ){
              
              //greeting message
              info1 = new PushMessage();
              info1.type = 'text';
              info1.text = "いらっしゃいっ！"
                          +String.fromCodePoint( EMOJI_SMILE2 )
                          +"\n生駒市民のみなさん。\n\n"
                          +"毎日、生駒市図書館自習室情報を送るよ。一緒に学ぼう！\n"
                          +"例えばこんなのを送るよ";
              
              
              //bot返答数
              info3 = new PushMessage();
              info3.type = 'text';
              bot_reply_words_output = "";
              bot_words.get_bot_reply_words_number();
              if( bot_reply_words_output != ""){
                info3.text = "また、しゃべりかけてくれると約"+bot_reply_words_output+"個返答するよ。何個見つけれるかなぁ～？"
                            +String.fromCodePoint( EMOJI_NIYARI );
              }
              else{
                info3.text = "また、しゃべりかけてくれるといろいろお返事できるよ。話しかけてみてね";
              }
              
              
              //スタンプ
              info4 = new PushMessage();
              info4.type = 'sticker';
              info4.packageId = "1";
              info4.stickerId = "114";  //ガッツポーズのスタンプ
    
              
              //sample用自習室情報
              input_message = STRING_IKOMA_ALL_STUDYROOM;
              push_notification_mode = PUSH_REPLY_MODE;

              make_reply_message()
              .done(function(){
                console.log("reply_message = " + reply_message);

                info2 = new PushMessage();
                info2.type = 'text';
                info2.text = reply_message;
                
                
                init_pushmessage();
                pushmessage[0] = info1;
                pushmessage[1] = info2;
                pushmessage[2] = info3;
                pushmessage[3] = info4;


                var headers = {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + process.env.CHANNEL_ACCESS_TOKEN
                }
                var body = {
                    replyToken: event.replyToken,
                    messages: pushmessage
                }

                request({
                    url: LINE_REPLY_URL,
                    method: 'POST',
                    headers: headers,
                    body: body,
                    json: true
                });

              });
            }
            

            
          }
        }
        else{
          console.log("follow event but not user???");
        }
      }
      
      // グループまたはトークルームに参加
      else if(( event.type == 'join' ) || ( event.type == 'leave' )){
        console.log("====================\n");
        console.log("join/leave event.グループ追加/削除してくれたよ")
        console.log(event);
        console.log("====================\n");
        
        if( event.source.type == "group" ){
          if (typeof event.source.groupId === 'undefined') {
            console.log("join event but not group???");
          }else{
            var new_group_id = event.source.groupId;
            console.log("new_group="+new_group_id);
                    
            //★DB追加・削除
            if( event.type == 'join' ){
              insert_id2db( new_group_id, TYPE_GROUP );
              
              info1 = new PushMessage();
              info1.type = 'text';
              info1.text = "グループに追加ありがとう！お友達がLINE Beaconの範囲に入ったら教えるよ。\n(今は間引きせずBeacon反応したら必ず通知するので回数多いよ。また、今だけお友だちのいる同一グループでは無く全グループに配信するよ。)";
              init_pushmessage();
              pushmessage[0] = info1;
              
              send_notification( new_group_id, pushmessage, TYPE_PUSH );
              
            }
            else if ( event.type == 'leave' ){
              delete_id2db( new_group_id );
            }
            else{
              //don't care.
            }        
          }
        }
        else{
          console.log("follow event but not user???");
        }
      }
      //よくわからないメッセージ受信
      else{
        console.log("NOT text");    //★★LINEスタンプを返そう。「ごめんわからないよー」とかの意味の
      }

    }
//});
}

module.exports.send_notification_hourly = function(req, res){

  send_notification_hourly_internal();

};    //module.exports おわり


function send_notification_hourly_internal(){
  input_message = STRING_IKOMA_ALL_STUDYROOM;
  
  if(!DEBUG){
    if( check_available_time() == 0 ){
      process.exit(); // heroku schedulerから呼ばれた際、プロセスを終了させるため
      return;   //自習室時間外には通知しない
    }
  }
  
  select_type = TYPE_USER;  //read_id_from_db()への入力
  
  read_id_from_db( )
  .done(function(){
    console.log("ID_LIST="+ id_list);
    if( id_list.length == 0){
      return;
    }
    
      make_reply_message()
      .done(function(){
        
        if( reply_message != ""){
          console.log("reply_message1 = " + reply_message);
         
          info1 = new PushMessage();
          info1.type = 'text';
          info1.text = reply_message;

          if( check_early_morning() == 0 ){   //朝一では無いので自習室情報のみ配信
            init_pushmessage();
            pushmessage[0] = info1;
            
            send_notification( id_list, pushmessage, TYPE_MULTICAST );
            console.log("\n----- send_notification_hourly done! ------\n");
            
            if(!DEBUG){
              process_kill_delay(); // heroku schedulerから呼ばれた際、プロセスを終了させる
            }
            return;
          }
        }
        else{ //自習室情報無し
          if( check_early_morning() == 0 ){
            console.log("\n----- send_notification_hourly done! ------\n");
            if(!DEBUG){
              process_kill_delay(); // heroku schedulerから呼ばれた際、プロセスを終了させる
            }
            return;
          }
        }
          
        var reply_message2;
        
        /* コールバック地獄なのでダサいが、API呼んだ後にセットしないとダメなのでこのまま進行。誰かdefer/thenに変えてくれるだろう
        　　②天気→③占い→④受験残日→⑤スタンプ
        */
          
        ///////////////////////////////////////////////
        //天気は(朝一番のみ)
        ///////////////////////////////////////////////
        get_weatherServerConnection.get_today_weather()
        .done(function(){
          reply_message2 = "おはよう" 
            + String.fromCodePoint(choose_emoji(TYPE_LINE_EMOJI_SMILE)) + "\n"
            + set_weather_sentence( today_weather, today_temperature_high, today_rain_precipitation );
            
          console.log("reply_message2 = "+reply_message2);
            
          info2 = new PushMessage();
          info2.type = 'text';
          info2.text = reply_message2;
          
          /////////////////////////////////////////////
          // 占い(朝一番のみ)
          /////////////////////////////////////////////
          fortunetelling_sign = TODAY_NO1_FOR_BROADCAST;
          fortunetelling_sentence = "";
          
          get_fortunetellingConnection.get_today_fortunetelling()
          .done(function(){
            info3 = new PushMessage();
            if( fortunetelling_sentence != ""){
              info3.type = 'text';
              info3.text = fortunetelling_sentence;
            }
            else{
              //★★★ここに来たら不具合★★★
              info3.type = 'text';
              info3.text = "ファイト～いっぱ～つ！！";
              console.log("★★★バグバグバグバグバグ forturnetelling fail バグバグバグ★★★")
            }

            console.log("fortunetelling done");
            console.log(fortunetelling_sentence);
            
            ////////////////////////////////////////////
            //受験までの日がキリの良い日の場合はお知らせ
            ////////////////////////////////////////////
            var exam_info_string = judge_examination_remainday();
            if( exam_info_string != "" ){
              
              info4 = new PushMessage();
              info4.type = 'text';
              info4.text = exam_info_string;

            }
            else{
            }
              
            ////////////////////////////////////////////
            //LINEスタンプ
            ////////////////////////////////////////////
            info5 = choose_line_stamp( TYPE_LINE_STAMP_MOTIVATION );
              
              
              
            ////////////////////////////////////////////
            // LINEメッセージへセット
            ////////////////////////////////////////////
            init_pushmessage();
            if( typeof(info1) != "undefined"){
              pushmessage[0] = info2; //天気
              pushmessage[1] = info1; //自習室
              
              if( typeof(info3) != "undefined"){
                pushmessage[2] = info3; //占い
              }
              else{
                console.log("占いが無い場合は無いはず");
              }
              
              if( typeof(info4) != "undefined"){
                pushmessage[3] = info4; //受験残日
                pushmessage[4] = info5; //スタンプ
              }
              else{
                pushmessage[3] = info5; //スタンプ
              }  
            }
            else{ //朝一時点で自習室無い場合
              pushmessage[0] = info2; //天気
              
              if( typeof(info3) != "undefined"){
                pushmessage[1] = info3; //占い
              }
              else{
                console.log("占いが無い場合は無いはず");
              }
              
              if( typeof(info4) != "undefined"){
                pushmessage[2] = info4; //受験残日
                pushmessage[3] = info5; //スタンプ
              }
              else{
                pushmessage[2] = info5; //スタンプ
              } 
              
            }

            send_notification( id_list, pushmessage, TYPE_MULTICAST );
            console.log("\n----- send_notification_hourly done! ------\n");
            if(!DEBUG){
              process_kill_delay(); // heroku schedulerから呼ばれた際、プロセスを終了させる 
            }
            
            
            
          });
          

            
        });      

    });
  });
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


function send_notification_to_all_group(){
  
  select_type = TYPE_GROUP;
    
  read_id_from_db( )
  .done(function(){
    
      if( id_list.length == 0){
        return;
      }
      console.log("id_list.length="+id_list.length);
    
      info1 = new PushMessage();
      info1.type = 'text';
      info1.text = 'お友達が自習室にいるよ！誰かは行ってのお楽しみ'+String.fromCodePoint(choose_emoji(TYPE_LINE_EMOJI_SMILE));
/*    
      info2 = new PushMessage();
      info2.type = 'sticker';
      info2.packageId = '1';
      info2.stickerId = '106';
*/
      info2 = choose_line_stamp( TYPE_LINE_STAMP_FRIENDS );
    
      init_pushmessage();
      pushmessage[0] = info1;
      pushmessage[1] = info2;

    
    var destination = id_list;
    
    if( destination.length != 0 ){
      send_notification_delay( destination, pushmessage, TYPE_PUSH, 0 );
    }
   

    
  }); 
}

function send_notification_delay( destination, message, type, count ){
    console.log("destination["+count+"]="+destination[count]);
    setTimeout( function(){
      send_notification( destination[count], message, type );

      count++;
      if( count < destination.length ){
        send_notification_delay( destination, message, type, count );
      }
      else{
        console.log("send_notification_delay end.");
      }
    }, 2000 );    
}

function process_kill_delay(){
    console.log("process kill after 90s.");
    setTimeout( function(){
      process.exit(); // heroku schedulerから呼ばれた際、プロセスを終了させるため
    }, 90000 );    
}


/* ユーザー入力文字から返答文面を作成 */
function make_reply_message( ){
  var input = input_message;
  var output="";
  console.log("input="+input);
  
  var TIME_ONE_HOUR;
  if( DEBUG_ISTODAY_24H ){
    TIME_ONE_HOUR = 24* 60 * 60 * 1000;    //24H for DEBUG
  }
  else{
    TIME_ONE_HOUR = 60 * 60 * 1000;     //1H
    TIME_ONE_MINUTE = 60 * 1000;        //1minute
    
    var now_date_for_correction = new Date();
    var now_minute = now_date_for_correction.getUTCMinutes();
    if( now_minute < 60 )
      TIME_ONE_HOUR += now_minute * TIME_ONE_MINUTE;    //heroku schedulerのばらつきにより１時間規定を少しだけ補正する
      console.log("minute correction="+now_minute);
    
  }
  
  //図書館名が入ってたら本日の図書館状況を図書館ブログから返す
  //output = make_lib_studyplace_status_message( input );

  //////////////////////////
  
  var dfd = new $.Deferred;
  
  var lib_num = pickup_lib_name( input );
  
  if( lib_num >= 0 ){
    selectplace = lib_num;
    
    //図書館ブログ検索
    StydyPlaceServerConnection.get_studyroom_info()
      .done(function(){
      
      console.log("studyroominfomations.length = "+studyroominfomations.length);
      
      for(var i=0; i<studyroominfomations.length; i++ ){
          console.log("studyroominfos[i].title="+studyroominfomations[i].title);
        
        //同じデータを何回も配信しないように直近１時間のデータのみをbroadcastする
        if( push_notification_mode == PUSH_BROADCAST_MODE){
          
          var now_date = new Date();
  //        var now_date = new Date("Tue, 12 Dec 2017 09:02:00 +0900");
          

          console.log("publish_hour(UTC)="+studyroominfomations[i].date.getUTCHours());
          console.log("now_hour(UTC)= "+now_date.getUTCHours() );
           
          if( now_date.getTime() - studyroominfomations[i].date.getTime() > TIME_ONE_HOUR ){

            if(( i == studyroominfomations.length -1 ) && ( output == "" )){
              console.log("既に配信されているのでbroadcastしない");
              console.log("resolve");
              return dfd.resolve();
            }
            continue;   //TIME_ONE_HOUR以上ならばfor文を回す
            
          }
          else{
            console.log("1H以内。配信開始");
          }

        }
    
        if( output != "" )  output += "\n\n";  //２つ目の自習室は改行×２
        
        if( selectplace == PLACE_IKOMA_ALL )
          output += "【" + studyroominfomations[i].place + "】" + "\n";
        
        output += studyroominfomations[i].title + " " 
//          + display_date + " " 
          + studyroominfomations[i].content + " "
          + studyroominfomations[i].link;
        
      }

      
      if( output == ""){
        if( push_notification_mode != PUSH_BROADCAST_MODE){
          output = "今は自習室やってないかも～" + String.fromCodePoint(EMOJI_SORRY);
        }
        else{
          console.log("本日は自習室開館してないので敢えてbroadcast配信しない");
          console.log("resolve");
          return dfd.resolve();
        }
      }
      reply_message = output;
      console.log("reply_message = " + reply_message);
      console.log("resolve");
      return dfd.resolve();

    });
    console.log("promise");
    return dfd.promise();
  }
  else{ //図書館名無
    if( output == ""){
      
      //天気
      if( input.indexOf("天気") != -1 ) {
        console.log("天気check");
        get_weatherServerConnection.get_today_weather()
        .done(function(){
          reply_message += set_weather_sentence( today_weather, today_temperature_high, today_rain_precipitation );
          console.log("reply_message = "+reply_message);
          console.log("resolve");
          return dfd.resolve();
        });
      }
      
      //占い
      else if( is_fortunetelling(input) ){
        get_fortunetellingConnection.get_today_fortunetelling()
        .done(function(){
          if( fortunetelling_sentence != "" ){
            reply_message = fortunetelling_sentence;
            console.log("fortunetelling done");
            console.log(fortunetelling_sentence);
            return dfd.resolve();
          }
        });              
      }
      
      else if(( input.indexOf("bot数") != -1 ) || ( input.indexOf("返答数") != -1 )){
        //bot数
        bot_reply_words_output = "";
        bot_words.get_bot_reply_words_number();
        if( bot_reply_words_output != ""){
          reply_message = "現在の対応返答数は約"+bot_reply_words_output + "個だよ";
          console.log("reply_message = "+reply_message);
          console.log("resolve");
          return dfd.resolve();
        }        
        
      }
      /* ここに追加
      else if(aaa){
        
      }
      */
      
      else{
        //その他、多数の単純返答文章
        bot_reply_words_input = input;
        bot_words.get_bot_reply_words();
        if( bot_reply_words_output != ""){
          reply_message = bot_reply_words_output;
          console.log("reply_message = "+reply_message);
          console.log("resolve");
          return dfd.resolve();
        }
        
        //入試
        reply_message = judge_examination_words( input );
        if( reply_message != ""){
          console.log("reply_message = "+reply_message);
          console.log("resolve");
          return dfd.resolve();
        }
        
        //何も無し
        reply_message = "ごめんわからないよ～" 
        + String.fromCodePoint(EMOJI_SORRY)
        + "\n生駒の図書館名も入れてね\n 「図書会館」とか「はばたき」「せせらぎ」とかだよ"
        + String.fromCodePoint(choose_emoji(TYPE_LINE_EMOJI_SMILE));
      
        get_weatherServerConnection.get_today_weather()
        .done(function(){

          reply_message += "\n\nついでに\n" + set_weather_sentence( today_weather, today_temperature_high, today_rain_precipitation );


          console.log("reply_message = "+reply_message);
          console.log("resolve");
          return dfd.resolve();
        });
        
      }
      
      console.log("promise");
      return dfd.promise();
    }
    console.log("reply_message = " + reply_message);
    return dfd.resolve();
  }
  /////////////////////////
  
  

  
  return dfd.resolve();
  
}

/* 図書館名から返答文字列作成 */
function make_lib_studyplace_status_message( input ){
  var output = "";
  var lib_num = pickup_lib_name( input );
  
  if( lib_num > 0 ){
    selectplace = lib_num;
    
    //図書館ブログ検索
    StydyPlaceServerConnection.get_studyroom_info()
      .done(function(){
        for(var i=0; i<studyroominfomations.length; i++){
          console.log("---------------------------");
          console.log("studyroominfos["+i+"].title="+studyroominfomations[i].title);
          
          //var display_date = make_display_data_format(studyroominfomations[i].date);
          
          output += studyroominfomations[i].title + " " 
            //+ display_date + " " 
            //+ studyroominfomations[i].content + " "
            + studyroominfomations[i].link;
                    
        }
    });
    
  }
  else{ //図書館名無
    //don't care
  }
  
  return output;
}

function pickup_lib_name( str ){
  var output_lib_num = -1;
  
  //全て
  if ( str.indexOf(STRING_IKOMA_ALL_STUDYROOM) != -1) {
    output_lib_num = PLACE_IKOMA_ALL;
  }
  //本館 
  else if ( str.indexOf(STRING_IKOMA_TOSHOKAN1) != -1) {
    output_lib_num = PLACE_IKOMA_TOSHOKAN;
  }
  else if( str.indexOf(STRING_IKOMA_TOSHOKAN2) != -1 ){
    output_lib_num = PLACE_IKOMA_TOSHOKAN;
  }
  else if( str.indexOf(STRING_IKOMA_TOSHOKAN3) != -1 ){
    output_lib_num = PLACE_IKOMA_TOSHOKAN;
  }
  //北コミュニティセンター(はばたき)
  else if( str.indexOf(STRING_IKOMA_HABATAKI1) != -1 ){
    output_lib_num = PLACE_IKOMA_HABATAKI;
  }
  else if( str.indexOf(STRING_IKOMA_HABATAKI2) != -1 ){
    output_lib_num = PLACE_IKOMA_HABATAKI;
  }
  //南コミュニティセンター(せせらぎ)
  else if( str.indexOf(STRING_IKOMA_SESERAGI1) != -1 ){
    output_lib_num = PLACE_IKOMA_SESERAGI;
  }
  else if( str.indexOf(STRING_IKOMA_SESERAGI2) != -1 ){
    output_lib_num = PLACE_IKOMA_SESERAGI;
  }
  //鹿ノ台
  else if( str.indexOf(STRING_IKOMA_SHIKANODAI) != -1 ){
    output_lib_num = PLACE_IKOMA_SHIKANODAI;
  }
  //たけまる
  else if( str.indexOf(STRING_IKOMA_TAKEMARU) != -1 ){
    output_lib_num = PLACE_IKOMA_TAKEMARU;
  }
  //美楽来
  else if( str.indexOf(STRING_IKOMA_MIRAKU1) != -1 ){
    output_lib_num = PLACE_IKOMA_MIRAKU;
  }
  else if( str.indexOf(STRING_IKOMA_MIRAKU2) != -1 ){
    output_lib_num = PLACE_IKOMA_MIRAKU;
  }
  //駅前図書館
  else if( str.indexOf(STRING_IKOMA_EKIMAE) != -1 ){
    //駅前図書館には自習室は無い
  }
  else{
    //don't care
  }
  
  //console.log("[pickup_lib_name]output_lib_num="+output_lib_num);
      
  return output_lib_num;
}


function judge_examination_words( input ){
  var output ="";
  var i;
  
  bot_words.get_examination_day();
  
  if(( input == "入試" ) || ( input == "テスト" ) || ( input == "試験" ) || ( input == "受験" )){
    if( input == "テスト" ){
      output = "入試試験のことかな？";
    }
    output += "入試情報をお伝えするよ\n\n";
    
    for(i=0; i < examinfo.length ; i++){
      console.log("examinfo["+i+"]="+examinfo[i].exam_name+" "+examinfo[i].exam_remain_day);

      output += examinfo[i].exam_name + "入試まであと" + examinfo[i].exam_remain_day + "日！\n";
    }
    output += "\n頑張って行きましょう！";
  }
  else{
    for(i=0; i < examinfo.length ; i++){
      console.log("examinfo["+i+"]="+examinfo[i].exam_name+" "+examinfo[i].exam_remain_day);

      if( input.indexOf(examinfo[i].exam_name) != -1 ){
        output = examinfo[i].exam_name + "入試本番まであと" + examinfo[i].exam_remain_day + "日！";
        return(output);
      }
    }
  }
  return( output );  
}

function judge_examination_remainday(){
  
  var EXAMINFO_NOTIFY_INTERVAL = 10;    //残10日毎に通知
  var EXAMINFO_NOTIFY_INTERVAL_LONG = 50;    //残50日毎に通知
  var interval = EXAMINFO_NOTIFY_INTERVAL;
  
  var return_sentence="";
  var i;
  
  bot_words.get_examination_day();
  
  for(i=0; i< examinfo.length ; i++){
    
    if( examinfo[i].exam_remain_day > 100 ){    //試験まで100日以上ならEXAMINFO_NOTIFY_INTERVAL_LONG毎に通知
      interval = EXAMINFO_NOTIFY_INTERVAL_LONG;
    }
    else{
      interval = EXAMINFO_NOTIFY_INTERVAL;
    }
    
    if( (examinfo[i].exam_remain_day) % interval == 0 ){
      return_sentence += examinfo[i].exam_name + "入試本番まであと" +examinfo[i].exam_remain_day + "日！\n";
    }
  }
  
  if( return_sentence != ""){
    console.log("入試情報PUSH通知文言＝\n"+return_sentence);
  }
  
  return( return_sentence );
}

//使わない関数
function make_display_data_format( date ){
  var output;
  
  var dateString = new Date( date );
  var year = dateString.getFullYear();
  var month = dateString.getMonth() + 1;
  
  //var day = dateString.getDate() + 1;
  var day = dateString.getUTCDate();
  var hour = dateString.getUTCHours();
  if(( hour >= 15 ) && ( hour <= 23))  day++;   //★月始めや年始で一意にインクリメントするとバグ発生するよ！！！
  
  output = year+"/"+month+"/"+day;
  
  console.log("[make_display_data_format] date="+year+"/"+month+"/"+day);
  
  return output;                          
}

function handleEvent(event) {
	console.log("type=" + event.type);
	console.log("message.typ=" + event.message.type );
}

//////////////////////////////////////////////////////////////////////
// databaseへ格納する（DBへの格納は非同期なため）
// return: 無
//////////////////////////////////////////////////////////////////////
function insert_id2db( id, type ){
    var table_insert_command;
    var query;
    
//===================================

    try{
        console.log("START connect database");
        
        var config = {
                host: postgres_host,
                user: postgres_user,
                database: postgres_databases,
                password: postgres_password,
                port: 5432,
                max: 10, // max number of clients in the pool 
                idleTimeoutMillis: 5000, 
        }; 
        
        var pool = new pg.Pool(config);

        //pg.connect(connectionString, function(err,client){
        pool.connect(function(err, client){
            
            
            if(err){
                console.log("CANNOT open DB");
                return;
            }
            else{
              console.log("Success to open DB.");
            }
           

            var table_insert_command = TABLE_INSERT_COMMAND_1 + db_table + TABLE_INSERT_COMMAND_2;
            //var table_insert_command = "INSERT INTO userid_table(id, option1, option2) VALUES ('234', '', '');";

            client.query( table_insert_command, [ id, type ], function(err, result){
//            client.query( table_insert_command, function(err, result){
                if(err){
                    console.log("CANNOT insert table(ID重複も含まれる)");
                    return;
                }
                

                /////////////////////////////////////////////////////
                //   DBへデータ書き込み
                /////////////////////////////////////////////////////
                console.log("success to insert DB.");

                

            client.end(function (err){
                if(err){
                    console.log("error.");
                      return;
                  }
                    
                  console.log("db close");
                });
            });
 
        });
        
        pool.on('error', function (err, client) {
            console.error('idle client error', err.message, err.stack);
        })
        
    }catch(e){
        console.log("UNEXPECTED ERROR: ");
        
    };
//===================================
 
}

//////////////////////////////////////////////////////////////////////
// databaseから削除する（DBへの格納は非同期なため）
// return: 無
//////////////////////////////////////////////////////////////////////
function delete_id2db( id ){
    var table_insert_command;
    var query;
    
//===================================

    try{
        console.log("START connect database");
        
        var config = {
                host: postgres_host,
                user: postgres_user,
                database: postgres_databases,
                password: postgres_password,
                port: 5432,
                max: 10, // max number of clients in the pool 
                idleTimeoutMillis: 5000, 
        }; 
        
        var pool = new pg.Pool(config);

        //pg.connect(connectionString, function(err,client){
        pool.connect(function(err, client){
            
            
            if(err){
                console.log("CANNOT open DB");
                return;
            }
            else{
              console.log("Success to open DB.");
            }
           

            var  table_delete_command = "DELETE FROM "+ db_table + " WHERE id='"+id+"'";
          console.log("query="+table_delete_command);
          
            client.query( table_delete_command, function(err, result){

                if(err){
                    console.log("CANNOT delete table");
                    return;
                }
                
                console.log("success to delete DB.");


            client.end(function (err){
                if(err){
                    console.log("error.");
                      return;
                  }
                    
                  console.log("db close");
                });
            });
        });
        
        pool.on('error', function (err, client) {
            console.error('idle client error', err.message, err.stack);
        })
        
    }catch(e){
        console.log("UNEXPECTED ERROR: ");
        
    };
//===================================
 
}


//////////////////////////////////////////////////////////////////////
// databaseから読み出す
// return: 無
// [入力] sql_textに TYPE_USER or TYPE_GROUPを設定すること
// [出力] id_listバッファへ格納
//////////////////////////////////////////////////////////////////////
function read_id_from_db( ){
    var table_insert_command;
    var query;
  
    var dfd = new $.Deferred;

    init_id_list();　//初期化
    
//===================================

    try{
        console.log("START connect database");
        
        var config = {
                host: postgres_host,
                user: postgres_user,
                database: postgres_databases,
                password: postgres_password,
                port: 5432,
                max: 10, // max number of clients in the pool 
                idleTimeoutMillis: 5000, 
        }; 
        
        var pool = new pg.Pool(config);

        //pg.connect(connectionString, function(err,client){
        pool.connect(function(err, client){
            
            
            if(err){
                console.log("CANNOT open DB");
                console.log("resolve");
                return dfd.resolve();
            }
            else{
              console.log("Success to open DB.");
            }
           


      
            //client.query("SELECT * FROM booklist_table", function(err, result){
    /* 読み出しOK */
    
         
          //★★★★DB openを複数回行って良いのか？？pool使ってるからOK？（要検証）
          var sql_text;
          if( select_type == TYPE_USER ){
            var sql_text = "SELECT * FROM userid_table where type=1;";
          }
          else if( select_type == TYPE_GROUP ){
            var sql_text = "SELECT * FROM userid_table where type=2;";
          }
          else{
              console.log("invalid select_type="+select_type);
              console.log("resolve");
              return dfd.resolve();            
          }
          
            client.query( sql_text, function(err, result){
                if(err){

                    console.log("CANNOT read table");
                    console.log("resolve");
                    return dfd.resolve();
                }
                

                /////////////////////////////////////////////////////
                //   DBからデータ取得
                /////////////////////////////////////////////////////
                console.log("DB length= " + result.rows.length);
              
                var i;
                for(i=0; i<result.rows.length; i++ ){
                  id_list[i] = result.rows[i].id;
                  
                  console.log("id="+result.rows[i].id + " type="+result.rows[i].type);
                }

                

            client.end(function (err){
                if(err){
                    console.log("error.");
                    console.log("resolve");
                    return dfd.resolve();
                  }
                    
                  console.log("db close");
              
                  console.log("resolve");
                  return dfd.resolve();
                });
            });
       
        });
        
        pool.on('error', function (err, client) {
            console.error('idle client error', err.message, err.stack);
            console.log("resolve");
            return dfd.resolve();
        })
        
    }catch(e){
        console.log("UNEXPECTED ERROR: ");
        console.log("resolve");
        return dfd.resolve();
        
    };

  
  console.log("promise");
  return dfd.promise();
}


function init_id_list(){
  if( id_list.length != 0 ){
    while( id_list.length > 0 ){
      id_list.pop();
    }
  }
}


function set_weather_sentence( today_weather, today_temperature_high, today_rain_precipitation ){
  
  var reply_message2;
  
  //絵文字対応記述例
  //　String.fromCodePoint(EMOJI_SMILE2)
  
  //reply_message2 = "今日のいこまの天気" + EMOJI_peace + "\n";
  reply_message2 = "＜今日の生駒の天気＞\n";
  
  if( today_temperature_high == ""){
    console.log("NO temperature");
    reply_message2 += "天気は"+today_weather 
      + "。降水確率は" + today_rain_precipitation + "％"
      + String.fromCodePoint(get_weather_emoji(today_weather));
  }
  else if( Number(today_temperature_high) >= 30 ){
    reply_message2 += "今日は"+ today_weather + String.fromCodePoint(get_weather_emoji(today_weather)) 
      + " 降水確率は" + today_rain_precipitation + "％"
      + " 最高気温は" + today_temperature_high + "度予想。今日は暑いね。水分よくとってね"
      +String.fromCodePoint(choose_emoji(TYPE_LINE_EMOJI_SMILE));
    //reply_message2 += "今日は暑いね。水分よくとってね。最高気温が"+today_temperature_high+"度になるってよ～。("+today_weather+")";
  }
  else if( Number(today_temperature_high) < 15 ){
    reply_message2 += "今日は"+ today_weather + String.fromCodePoint(get_weather_emoji(today_weather)) 
      + " 降水確率は" + today_rain_precipitation + "％"
      + " 気温は" + today_temperature_high + "度までしかあがらないんだって。しっかり加湿して風邪ひかないでね"
      +String.fromCodePoint(choose_emoji(TYPE_LINE_EMOJI_SMILE));
    //reply_message2 += "今日は寒い１日になるってよ。気温が" +today_temperature_high + "度までしかあがらないんだって。しっかり加湿して風邪ひかないでね。今日の天気は"+today_weather+"。";
  }
  else{
    reply_message2 += "今日は"+today_weather+String.fromCodePoint(get_weather_emoji(today_weather))
      + " 降水確率は" + today_rain_precipitation + "％"
      +" 最高気温は"+today_temperature_high+"度だって。今日も頑張って行きましょう"
      +String.fromCodePoint(choose_emoji(TYPE_LINE_EMOJI_SMILE));
  }
  
  return reply_message2;
}



function check_available_time(){
  
//  var now_date = new Date("Tue, 12 Dec 2017 09:02:00 +0900");
  var now_date = new Date();
  var now_hour = now_date.getUTCHours();   //getHours()だとherokuはUTCだがwindowsPCではlocaltime(JST)なのでUTCで取得で統一
  
  if(( now_hour >= 0 ) && ( now_hour <= 8 )){   //JST 9時～17時
    console.log("now_hour(UTC) = "+ now_hour + " available_time");
    return 1;
  }
  else{
    console.log("now_hour(UTC) = "+ now_hour + " NOT available_time");
    return 0;
  }
}

function check_early_morning(){
  if(DEBUG){
    var now_date = new Date("Tue, 12 Dec 2017 09:02:00 +0900");   //朝イチのみのイベント発生させる
//    var now_date = new Date("Tue, 12 Dec 2017 10:02:00 +0900");
    
  }else{
    var now_date = new Date();
  }
  
  var now_hour = now_date.getUTCHours();   //getHours()だとherokuはUTCだがwindowsPCではlocaltime(JST)なのでUTCで取得で統一
  
  if(( now_hour >= 0) && ( now_hour < 1)){    //JST 9時～10時
    console.log("now_hour(UTC) = "+ now_hour + " early_morning");
    return 1;
  }
  else{
    console.log("now_hour(UTC) = "+ now_hour + " NOT early_morning");
    return 0;    
  }
}

//認証済アカウントしかダメなので本API使えない
function line_groupid2member( groupid ){
    
  var dfd = new $.Deferred;

  var headers = {
    'Authorization': 'Bearer ' + process.env.CHANNEL_ACCESS_TOKEN
  }

  request.get({
    url: "https://api.line.me/v2/bot/group/{groupid}/members/ids",
    headers: headers
  }, function( error, response, body){
    console.log(body);
  });

  //return dfd.promise();
  

//};
  
  
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

function get_weather_emoji( weather_string ){
  var emoji_code;
  
  var WEATHER_SUNNY = "晴れ";
  var WEATHER_CLOUDY = "くもり";
  var WEATHER_RAIN = "雨";
  var WEATHER_SNOW = "雪";
  
  
  if( weather_string.indexOf(WEATHER_SNOW) != -1) {
    emoji_code = EMOJI_SNOW;
  }
  else if( weather_string.indexOf(WEATHER_RAIN) != -1) {
    emoji_code = EMOJI_RAIN;
  }
  else if ( weather_string.indexOf(WEATHER_SUNNY) != -1) {
    emoji_code = EMOJI_SUNNY;
  }
  else if( weather_string === WEATHER_CLOUDY ){   //完全一致
    emoji_code = EMOJI_CLOUDY;
  }
  else{
    emoji_code = EMOJI_SMILE6;    //中途半端な天気なので顔文字でごまかす
  }
  
  //console.log("[get_weather_emoji]"+weather_string + "="+ emoji_code);

  return( emoji_code );
  
}

function is_fortunetelling( input ){
  var ret=0;
  
  if((input.indexOf("牡羊座") != -1) || (input.indexOf("おひつじ") != -1) || (input.indexOf("お羊") != -1) || (input.indexOf("お未") != -1)){
    fortunetelling_sign = "牡羊座";
    ret = 1;
  }
  else if((input.indexOf("牡牛座") != -1) || (input.indexOf("おうし") != -1) || (input.indexOf("お牛") != -1)){
    fortunetelling_sign = "牡牛座";
    ret = 1;
  }
  else if((input.indexOf("双子座") != -1) || (input.indexOf("ふたご") != -1)){
    fortunetelling_sign = "双子座";
    ret = 1;
  }
  else if((input.indexOf("蟹座") != -1) || (input.indexOf("かに座") != -1)){
    fortunetelling_sign = "蟹座";
    ret = 1;
  }
  else if((input.indexOf("獅子座") != -1) || (input.indexOf("しし座") != -1)){
    fortunetelling_sign = "獅子座";
    ret = 1;
  }
  else if((input.indexOf("乙女座") != -1) || (input.indexOf("おとめ座") != -1)){
    fortunetelling_sign = "乙女座";
    ret = 1;
  }
  else if((input.indexOf("天秤座") != -1) || (input.indexOf("てんびん座") != -1)){
    fortunetelling_sign = "天秤座";
    ret = 1;
  }
  else if((input.indexOf("蠍座") != -1) || (input.indexOf("さそり座") != -1)){
    fortunetelling_sign = "蠍座";
    ret = 1;
  }
  else if((input.indexOf("射手座") != -1) || (input.indexOf("いて座") != -1)){
    fortunetelling_sign = "射手座";
    ret = 1;
  }
  else if((input.indexOf("山羊座") != -1) || (input.indexOf("やぎ座") != -1)){
    fortunetelling_sign = "山羊座";
    ret = 1;
  }
  else if((input.indexOf("水瓶座") != -1) || (input.indexOf("みずがめ座") != -1) || (input.indexOf("水がめ座") != -1)){
    fortunetelling_sign = "水瓶座";
    ret = 1;
  }
  else if((input.indexOf("魚座") != -1) || (input.indexOf("うお座") != -1)){
    fortunetelling_sign = "魚座";
    ret = 1;
  }
  else if(input.indexOf("今日イチ") != -1){
    fortunetelling_sign = "今日イチ";
    ret = 1;    
  }
  
  return( ret );

}

/* ------------------------------------------------------------
   ユーザー入力ワードを記録。サービス向上のため(有用なワードは返答返すように仕様追加予定)
   本サービス開始時はコメントアウト想定.
   
   heroku configへ下記各自セット必要
    heroku config:set KINTONE_URL=xxxx
    heroku config:set CYBOZU_API_TOKEN=xxxx
  ------------------------------------------------------------- */
function record_log_data( input_string, userid ){
  
  var options = {
    uri: process.env.KINTONE_URL,
    headers: {
      "X-Cybozu-API-Token": process.env.CYBOZU_API_TOKEN,
      "Content-type": "application/json"
    },
  json: {
    "app": 20,
    "record": {
      "input_string": {
        "value": input_string
      },
		  "UserID": {
			  "value": userid
		  }
    }
  }
};

request.post(options, function(error, response, body){
  if (!error && response.statusCode == 200) {
    console.log("[send_log_data]success!");
  } else {
    console.log('[send_log_data]http error: '+ response.statusCode);
    console.log("input="+input_string+"userid="+userid);
  }
});
  
}
       