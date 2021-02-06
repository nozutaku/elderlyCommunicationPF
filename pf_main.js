//===== サーバープログラム ===================================

//===== 設定(ここから) =======================================
var IS_HEROKU = 1;		//デバッグオプション
var DEBUG = 0;
var DEBUG_PICKUP_PEOPLE = "開発テスト１";
var DEBUG_PEOPLE_NUM = 9999;
global.LOG_RECORD = 1;    //1=ログをサーバーに保存する


global.SEARCH_TEL_NUMBER_PREFERED  = 0;    //1=送迎依頼者の電話番号優先(セキュリティ重視)　0=送迎依頼者の入力番号のみを利用

//===== 設定(ここまで) =======================================


var http = require('http');
var request = require('request');
var bodyParser = require('body-parser');
var fs = require('fs');
var express = require('express');
var ejs = require('ejs');
var pg = require('pg');
var querystring = require('querystring');

//var server = http.createServer();
//server.on('request', doRequest);
//server.listen(process.env.PORT, process.env.IP);

var line_command = require('./line.js');
var kintone_command = require('./kintone.js');
var twilio_command = require('./twilio.js');
var sendgrid_command = require('./sendgrid.js');



// グローバル変数。追加時はinit_input_data()に追加すること
global.input_date;
global.input_time;
global.input_pickup_people;   //送迎対象者(送迎される人)
global.input_pickup_people_num;   //送迎対象者(送迎される人)の番号
global.input_pickup_people_callid;  //送迎対象者の電話番号
global.input_pickup_people_auto_call_flg;   //送迎対象者への自動電話連絡有無
global.input_sender;          //送迎する人
global.input_sender_line_id;  //送迎する人のLINEID
global.input_destination;
global.input_destination_num; //場所の番号
global.input_kintone_id;


global.callback_kintone_ids = new Array();    //callback対象kintone_IDテーブル


global.line_reply_mode;
global.input_line_message;
global.line_reply_token;

global.WORD_SENDER_NOT_DECIDED = "送迎者未決定";
global.WORD_DESTINATION_NOT_DECIDED = "場所未";

//line_reply_modeへ格納する値
global.LINE_MODE_1 = 1;

global.LINE_MODE_ACCEPT_REPLY = 2;
global.LINE_MODE_DENEY_REPLY_NO_DATA = 3;
global.LINE_MODE_DENEY_REPLY_ALREADY_EXIST = 4;
global.LINE_MODE_DENEY_REPLY_CANCEL = 5;
global.LINE_MODE_DENEY_REPLY_SHOW_CALENDER = 6;



global.LINE_MODE_NOTIFY_CORRECT_FORMAT = 7;   //フォーマット問い合わせ
global.LINE_MODE_FOLLOW = 8;
global.LINE_MODE_UNFOLLOW = 9;

global.new_follower_line_id;

global.line_broadcast_account;
global.email_broadcast_account;

global.URL_CALENDER = process.env.KINTONE_DOMAIN_URL + "/k/" + process.env.CYBOZU_APP_ID;


global.NotDecidedDay = function( ){
  this.date="";
  this.time = "";
  this.pickup_people="";
  this.sender="";
  this.destination="";
  this.kintone_id = -1;
}
global.no_candidate_day = new Array();


//check_postback_type()の戻り値
var POSTBACK_TYPE_NEED_CONFIRM = 1;
var POSTBACK_TYPE_REGISTER = 2;
var POSTBACK_TYPE_CANCEL = 3;
var POSTBACK_TYPE_MANY_VACANT = 4;

global.CONFIRM_WORD = "CHOOSE_";
global.MANY_VACANT_WORD = "MANYVACANT";
global.CANCEL_WORD = "CANCEL_";

global.phonecall_comment = "";   //電話で伝える文言

global.flg_need_to_search_pickup_people_name;  //送迎対象者番号からの検索必要有無フラグ(pickup_people_name検索時に利用)

//ログ記録用　LOG_RECORD=1の時のみ利用
global.input_log;       //ログ記録用バッファ
global.input_log_type;  //ログ記録用種別
//ログ記録用種別内容
global.LOG_TYPE_REQUEST_PICKUP = "送迎依頼入電";
global.LOG_TYPE_CALLBACK = "コールバック";
global.LOG_TYPE_CALLBACK_REMINDER = "コールバック(自動)";
global.LOG_TYPE_NOT_CALLBACK = "NOT_CALLBACK";    //文字列登録用では無く、情報受け渡し用（例外的な使い方）
global.LOG_TYPE_REGISTER_LINE_BOT = "送迎登録(LINE返信)";
global.LOG_TYPE_BROADCAST_LINE_REPLY = "送迎登録(LINE直接送信)";
global.LOG_TYPE_REGISTER_CALENDER = "送迎登録(カレンダー編集)";
global.LOG_TYPE_LINE_REGISTER = "LINE登録";
global.LOG_TYPE_LINE_UNREGISTER = "LINE登録解除";


function init_input_data(){
  input_date = "";
  input_time = "";
  input_pickup_people = "";   //送迎対象者(送迎される人)
  input_pickup_people_num = 0;   //送迎対象者(送迎される人)の番号
  input_pickup_people_callid = "";  //送迎対象者の電話番号
  input_pickup_people_auto_call_flg = 0;   //送迎対象者への自動電話連絡有無
  input_sender = "";          //送迎する人
  input_sender_line_id = "";  //送迎する人のLINEID
  input_destination = "";
  input_destination_num = 0; //場所の番号
  input_kintone_id = 0;
}

function debug(){
  var ret = 0;
  if(( DEBUG == 1) || (input_pickup_people == DEBUG_PICKUP_PEOPLE ) || (input_pickup_people_num == DEBUG_PEOPLE_NUM))
    ret = 1;

  return ret;
}




var app = express();

app.set('port', (process.env.PORT || 5000));
app.use(express.static(__dirname + '/public'));

app.listen(app.get('port'), function() {
  console.log("Node app is running at localhost:" + app.get('port'))
});

app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json());


/*
var mode_openstatus = MODE_JUDGE_SENSOR;
var likecounter = 0;
*/

/*
if( IS_HEROKU ){   //heroku
    pg.defaults.ssl = true; 
    var connectionString = process.env.DATABASE_URL;
    var postgres_host = process.env.HOST_NAME;
    var postgres_databases = process.env.DATABASE_NAME;
    var postgres_user = process.env.USER_NAME;
    var postgres_password = process.env.PASSWORD;
}
else{               //local node.js
    var connectionString = "tcp://postgres:postgres@localhost:5432/naraba_db";
    var postgres_host = "localhost";
    var postgres_databases = "naraba_db";
    var postgres_user = "postgres";
    var postgres_password = "postgres";
}
*/



var last_update;

//コンテンツ表示メイン処理
app.get('/', function(req, res) {
  console.log("START app.get");
  
  var data = fs.readFileSync('./views/index.ejs', 'UTF8');
  
  console.log("file read done");

  /*
  var data2 = ejs.render( data, {
            content1: open_status_string,
            content2: open_status_image,
            content3: open_status_bgcolor,
            content4: open_status_callbackstring,
            content5: likecounter
          });
   
  res.writeHead(200, {'Content-Type': 'text/html'});
  res.write(data2);
  */
  res.write(data);
  res.end();
  


});





app.post("/api/command/:command", function(req, res, next){

  console.log("req.params.command="+req.params.command);
  console.log("originalUrl="+req.originalUrl);
  console.log("req.query.daytime="+req.query.daytime);
  console.log("req.query.pickup_people="+ req.query.pickup_people);
  console.log("req.query.pickup_place="+ req.query.pickup_place);
  console.log("req.query.caller_no=" + req.query.caller_no + "+部分要注意"); //"+81"のプラスがurlencodeされずに受信して強制的にurlencodeされて変になってる.
  //req.originalUrlから独自に取り出そう
  //originalUrl=/api/command/register?daytime=201905010800&pickup_people=100&caller_no=+819080683055&pickup_place=41
  
  
  res.status(200).end();
  
  //  baseURL/register?daytime=xxx&pickup_people=zzz
  
  //twillioから送迎要求
  if( req.params.command == "register"){
    
    console.log("start register");
    
    var daytime_str = req.query.daytime;
    console.log("year="+daytime_str.substr(0,4) );
    console.log("month="+daytime_str.substr(4,2));
    console.log("day="+daytime_str.substr(6,2));
    console.log("hour="+daytime_str.substr(8,2));
    console.log("month="+daytime_str.substr(10,2));
    
    input_date = daytime_str.substr(0,4) + "-" + daytime_str.substr(4,2) + "-" + daytime_str.substr(6,2);
    input_time = daytime_str.substr(8,2) + ":" + daytime_str.substr(10,2);
    
    
    input_pickup_people_num = req.query.pickup_people;
    //input_caller_no = req.query.caller_no;    //送迎依頼者の電話番号
    input_caller_no = get_caller_no_from_url( req.originalUrl );
    input_destination_num = req.query.pickup_place;

    
    console.log("------");
    console.log("input_date="+input_date);
    console.log("input_time="+input_time);
    console.log("input_pickup_people_num="+input_pickup_people_num);
    console.log("input_caller_no="+input_caller_no);
    console.log("input_destination_num="+input_destination_num);
    console.log("------");
    
    
    //カレンダーDB登録→LINE配信
    kintone_command.get_placename()
    .then(kintone_command.get_pickup_people_name_from_caller_no)
    .then(kintone_command.get_pickup_people_name_from_pickup_people_num)
    .then(kintone_command.set_data2db)
    .then(kintone_command.get_account_all)
    .then(line_command.send_line_broadcast)
    .then(sendgrid_command.send_email_broadcast_notify_register_schedule)
    .done(function(){
      input_sender = "";
      input_log = req.originalUrl;
      input_log_type = LOG_TYPE_REQUEST_PICKUP;
      
      kintone_command.set_log_db();
      
      console.log("end");
    });
    
    //カレンダー(DB)へ登録
    //kintone_command.get_placename()
    //.done(function(){
    //  kintone_command.set_data2db();
    //});
    
    
    //送迎者募集
    //kintone_command.get_account_all()
    //.done(function(){
    //  line_command.send_line_broadcast();
    //});
    
    
  }
  //カレンダーが編集された。送迎対象者に電話連絡
  else if( req.params.command == "kintone2heroku"){
    console.log("start kintone2heroku command");
    
    init_input_data();
    input_kintone_id = req.query.kintone_id;
    console.log("input_kintone_id = " + input_kintone_id);

    //call_to_pickup_people にて電話発信しなかった場合の登録内容
    input_log_type = LOG_TYPE_REGISTER_CALENDER;
    input_log = "カレンダー編集."
    input_pickup_people_num = input_destination_num = ""; //pickup_people_numだけ取得していないので初期化しておく

    call_to_pickup_people( input_kintone_id );  //送迎対象者に送迎予定を電話で伝える


  }
  
  
  /* ===============以下、テスト1 (postmanから送信) ============== */
  else if( req.params.command == "1"){
    
    input_pickup_people_callid = "09012345678";
    input_pickup_people = "野津";
    input_pickup_people_num = 9999;
    input_caller_no = "09012345678";
    input_date = "2021-01-30";
    input_time = "09:00";
    input_destination_num = "41";
    input_destination = "いきいきホール";
    input_sender = "田口";
    //make_phonecall_comment();
    
    //twilio_command.auto_call_to_pickup_people();
    //console.log("-- 1 end --\n");
    

    /****** TEST1 START *******/
    console.log("------");
    console.log("input_date="+input_date);
    console.log("input_time="+input_time);
    console.log("input_pickup_people_num="+input_pickup_people_num);
    console.log("input_caller_no="+input_caller_no);
    console.log("input_destination_num="+input_destination_num);
    console.log("------");
    
    
    //カレンダーDB登録→LINE配信
    kintone_command.get_placename()
    .then(kintone_command.get_pickup_people_name_from_caller_no)
    .then(kintone_command.get_pickup_people_name_from_pickup_people_num)
    .then(kintone_command.set_data2db)
    .then(kintone_command.get_account_all)
    .then(line_command.send_line_broadcast)
    .then(sendgrid_command.send_email_broadcast_notify_register_schedule)
    .done(function(){
      input_sender = "";
      input_log = req.originalUrl;
      input_log_type = LOG_TYPE_REQUEST_PICKUP;
      
    //  kintone_command.set_log_db();   //ToDo: 登録テストはこのコメントアウトを外すこと
      
      console.log("end");
    });


    /****** TEST1 END *******/

  /*  
  function make_phonecall_comment(){
  
  phonecall_comment
  = input_pickup_people + "さんのお宅でしょうか。"
  + "鹿ノ台自治連合会　送迎予約システムからのお知らせです。"
  + input_date + input_time + input_destination + "への送迎は"
  + input_sender + "さんがお迎えにあがる予定です"
  + "予定が変更になれば速やかにご連絡お願いします"
  + "では、失礼します";
  
  }
  */
    
    
    
    /*
    console.log("line_command START");
    line_command.send_line_broadcast();
    console.log("line_command END");
    
    console.log("kintone_command START");
    input_date = "2018-10-04";
    input_time = "10:00";
    input_pickup_people = "野津さん";
    input_destination = "いそかわ";
    
    kintone_command.set_data2db();
    console.log("kintone_command END");
    */
    
  }
  /* ===============以下、テスト2 (postmanから送信)  ============== */
  else if( req.params.command == "2" ){
    
    console.log("kintone_command START");
    
    input_date = "2018-10-20";
    input_time = "17:00";
    input_pickup_people = "あー";    
    input_sender = "テスト";
    input_destination = "病院";
    //input_kintone_id = 14;
    
    kintone_command.update_data2db();
    

    
    console.log("kintone_command END");
  }
  /* ===============以下、テスト3 (postmanから送信)  ============== */
  else if( req.params.command == "3" ){
    
    input_date = "2018-10-04";
    input_time = "10:00";
    input_pickup_people = "野津さん";
    input_destination = "いそかわ";
    
    line_command.send_line_broadcast();
  
    console.log("line_broadcast_all END");
  }
  /* ===============以下、テスト4 (postmanから送信)  ============== */
  else if( req.params.command == "4" ){
    
    input_date = "2018-10-04";
    input_time = "10:00";
    input_pickup_people = "野津さん";
    input_destination = "いそかわ";
    
    //送迎者募集
    kintone_command.get_account_all()
    .done(function(){
      line_command.send_line_broadcast();
      console.log("line_broadcast_all END");
    });
  
    
  }
  else if( req.params.command == "5" ){
    sendgrid_command.send_email_broadcast_notify_register_schedule();
  }
  else if( req.params.command == "6" ){
    //batch proc test
    var dummy_req = {
      _parsedUrl: {
        query: param1="1"
      }
    };
    //前日自動コールバックテスト
    //callback_for_reminder();    //テスト時はcallback_for_reminder のmodule.exports.xx -> function 変更要
    console.log("★★★start★★★")

  }
  else if( req.params.command == "9" ){
    console.log("test=9");
  }
  
  
  /* ===============以上、テスト ======================== */
  
  //update_database( req.params.command );
  
  //res.send("your command receive");

});

app.post('/webhook', function(req, res, next){
	console.log("come to webhook.");
  res.status(200).end();
  //res.send("your command receive");
  
  for (var event of req.body.events){
    if (event.type == 'message'){
      
      line_reply_mode = LINE_MODE_1;
      line_message(event);
    }
    else if (event.type == 'beacon'){
      
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
          new_follower_line_id = event.source.userId;
          console.log("new_member="+new_follower_line_id);
            
            
          //LINE IDをDBに追加・削除
          if( event.type == 'follow' ){
            
            kintone_command.set_account_data2db();
            //insert_line_id2db( new_follower_id, TYPE_USER );
          }
          else if ( event.type == 'unfollow' ){
            kintone_command.delete_account_data2db();   //★★うまく動かない！！！！！！誰かヘルプ！！！→kintoneのpermissionで削除を有効にすれば削除されるだろう
            
          }
          else{
            //don't care.
          }
            
          //welcome メッセージを送る
          if( event.type == 'follow' ){
            
            line_reply_mode = LINE_MODE_FOLLOW;
            input_log_type = LOG_TYPE_LINE_REGISTER;
            //line_message(event);
          }
          else{
            line_reply_mode = LINE_MODE_UNFOLLOW;
            input_log_type = LOG_TYPE_LINE_UNREGISTER;
            //line_message(event);
            
          }
          input_line_message = "";
          line_reply_token = event.replyToken;
          line_command.send_line_reply();
          
          //log record
          input_date = input_time = input_pickup_people = input_pickup_people_num = input_destination = input_sender = "";
          input_log = "line_id=" + new_follower_line_id;
          //input_log_type = LOG_TYPE_LINE_REGISTER; 上で設定
          kintone_command.set_log_db();
          
        }
      }
    }
    // グループまたはトークルームに参加
    else if(( event.type == 'join' ) || ( event.type == 'leave' )){
    }
    //button選択した場合
    else if( event.type == 'postback' ){
      console.log("event.source.userId="+event.source.userId);
      console.log("event.postback.data="+event.postback.data);
      
      line_reply_token = event.replyToken;

      
      var postback_type = check_postback_type( event.postback.data );
      
      if( postback_type == POSTBACK_TYPE_NEED_CONFIRM ){
        
        kintone_command.check_still_vacant()
        .done(function(){
          if( input_kintone_id > 0 ){
            //input_kintone_idは既に入力済
            line_command.send_line_confirm();
          }
          else{
            line_reply_mode = LINE_MODE_DENEY_REPLY_ALREADY_EXIST;
            input_line_message = "";
            line_command.send_line_reply();
            console.log("sender is already decided.");
          }
        });
        
      }else if( postback_type == POSTBACK_TYPE_REGISTER ){
        input_kintone_id = event.postback.data;
        
        
        kintone_command.check_still_vacant()
        .done(function(){
          if( input_kintone_id > 0 ){
            
            input_sender_line_id = event.source.userId;
            
            kintone_command.get_input_sender_name()
            .then(kintone_command.update_id2db)
            .done(function(){
              input_line_message = "";
              line_reply_mode = LINE_MODE_ACCEPT_REPLY;
              line_command.send_line_reply();
              console.log("kintone_command send");
              
              if(( line_reply_mode == LINE_MODE_ACCEPT_REPLY ) && ( input_kintone_id > 0 )){
                
                //call_to_pickup_people にて電話発信しなかった場合の登録内容
                input_log_type = LOG_TYPE_REGISTER_LINE_BOT;
                input_log = "LINE返答登録"; //call_to_pickup_peopleの中でもLog登録行っているためコメント追加

                call_to_pickup_people( input_kintone_id );  //送迎対象者に送迎予定を電話で伝える　＆ Log record
              }
              else{
                //log record
                input_pickup_people_num = ""; //pickup_people_numだけ取得していないので初期化しておく
                // input_date、input_time、input_sender、 input_pickup_people、input_destinationそのまま残す(エラーになってる場合もあると思うけどログ記録なので良いでしょう)
                input_log = "kintone_id=" + input_kintone_id + "  sender_line_id="+input_sender_line_id;
                input_log_type = LOG_TYPE_REGISTER_LINE_BOT;
                kintone_command.set_log_db();
                // input_xxの初期化が行われないので次機会に正常動作するか心配
              }

            });


          }
          else{ //既に送迎者が決まっていた場合kintone_command.check_still_vacant()の中でinput_kintone_id = -1が設定される

              line_reply_mode = LINE_MODE_DENEY_REPLY_ALREADY_EXIST;
              input_line_message = "";
              line_command.send_line_reply();
              console.log("sender is already decided.");

          }

          });
        
      }
      else if( postback_type == POSTBACK_TYPE_CANCEL ){
        input_kintone_id = -1;
        line_reply_mode = LINE_MODE_DENEY_REPLY_CANCEL;
        input_line_message = "";
        line_command.send_line_reply();
        console.log("cancel");
        
      }
      else if( postback_type == POSTBACK_TYPE_MANY_VACANT ){
        input_kintone_id = -1;
        line_reply_mode = LINE_MODE_DENEY_REPLY_SHOW_CALENDER;
        input_line_message = "";
        line_command.send_line_reply();
        console.log("many vacant");
      }
              
      else{
        //無いはず
        console.log("error postback type");
      }

    }
    //よくわからないメッセージ受信
    else{
      console.log("unknown webhook");    //★★LINEスタンプを返そう。「ごめんわからないよー」とかの意味の
      console.log(event);
    
    }
  }
  
});
  

/* ------------------------------------------------
  入力strが CHOOSE_100のように「CHOOSE」がついていればPOSTBACK_TYPE_NEED_CONFIRM
  CANCEL_100 も同様
*/
function check_postback_type( str ){
  
  var ret;
  
  
  if( str.indexOf( CONFIRM_WORD ) != -1 ){
    input_kintone_id = str.substr( CONFIRM_WORD.length, str.length-CONFIRM_WORD.length );
    ret = POSTBACK_TYPE_NEED_CONFIRM;
  }
  else if( str.indexOf( MANY_VACANT_WORD ) != -1 ){
    input_kintone_id = str.substr( MANY_VACANT_WORD.length, str.length-MANY_VACANT_WORD.length );
    ret = POSTBACK_TYPE_MANY_VACANT;
  }
  else if( str.indexOf( CANCEL_WORD ) != -1 ){
    input_kintone_id = str.substr( CANCEL_WORD.length, str.length-CANCEL_WORD.length );
    ret = POSTBACK_TYPE_CANCEL;
  }
  else{
    input_kintone_id = str;
    ret = POSTBACK_TYPE_REGISTER;
  }
  
  console.log("input_kintone_id="+input_kintone_id);
  
return ret;
}



app.post('/', function (req, res) {
  console.log("etc");
  res.send('POST request work well');
});



/* ------------------------------------------------------- 
  翌日送迎予定の人に電話連絡
   ------------------------------------------------------- */
  module.exports.callback_for_reminder = function(req, res){
    //function callback_for_reminder(){


      var CALL_DURATION = 2 * 60;   //２分

      init_input_data();

    console.log(" --------------------------------- ");
    console.log("callback_for_reminder START");
    console.log(" --------------------------------- ");
  
    //var params = querystring.parse(req._parsedUrl.query);
    //console.log( "param = " + params['param1'] );
  
  
    //kintoneDBから翌日送迎予定 & 自動連絡フラグ有りデータ取得
    //is_previous_callback

    kintone_command.check_reminder()
    .done(function(){

      console.log("callback_kintone_ids.length = " + callback_kintone_ids.length );
      for (var i = 0; i < callback_kintone_ids.length; i++){
        console.log("callback_kintone_ids["+i+"]=" + callback_kintone_ids[i]);

/*      //下記内容は  wait_and_call()の中へ移動
        input_kintone_id = callback_kintone_ids[i];
        console.log("input_kintone_id = " + input_kintone_id);
    
        //call_to_pickup_people にて電話発信しなかった場合の登録内容
        input_log_type = LOG_TYPE_NOT_CALLBACK;         //該当の人がコールバックOFF設定の場合に利用
        input_log = "前日自動電話連絡。"
        input_pickup_people_num = input_destination_num = ""; //pickup_people_numだけ取得していないので初期化しておく
    
        call_to_pickup_people( input_kintone_id );  //送迎対象者に送迎予定を電話で伝える
  
        console.log(" --------------------------------- ");
        console.log("callback_for_reminder " + i + "件目reserve END");
        console.log(" --------------------------------- ");
*/

        wait_and_call( i * CALL_DURATION, callback_kintone_ids[i] );



      }
      



    });
  
  
    return;
  //}
  };


  


function line_message( event ){
  
  line_reply_token = event.replyToken;
  
  console.log("====================\n");
  console.log("LINE message event come now.")
  //console.log(event);
  console.log("====================\n");
          
  if( event.source.type != "user" ){
    console.log("NOT from user. so no reply");
    return;
  }
  
  
  if( event.type == 'message' ){
    input_line_message = event.message.text;
    input_sender_line_id = event.source.userId;
    console.log("input_message = "+ input_line_message);
    //input_destination = " ";
    
    if( is_valid_register_input( input_line_message )){
      console.log("input_date="+input_date);
      console.log("input_time="+input_time);
      console.log("input_pickup_people="+input_pickup_people);
      console.log("input_desitination="+input_destination);
      //console.log("input_sender="+input_sender);
      
      
      kintone_command.get_input_sender_name()
      .then(kintone_command.update_data2db)
      .done(function(){
        //line_reply_mode = LINE_MODE_ACCEPT_REPLY;
        line_command.send_line_reply();
        console.log("kintone_command send");
        
        if(( line_reply_mode == LINE_MODE_ACCEPT_REPLY ) && ( input_kintone_id > 0 )){
          
          //call_to_pickup_people にて電話発信しなかった場合の登録内容
          input_log_type = LOG_TYPE_BROADCAST_LINE_REPLY;
          input_log = "LINE直接返答。";

          call_to_pickup_people( input_kintone_id );  //送迎対象者に送迎予定を電話で伝える

        }
        else{
          //log record
          input_log = "sender_line_id="+input_sender_line_id;
          input_pickup_people_num = "";
          input_log_type = LOG_TYPE_BROADCAST_LINE_REPLY;
          kintone_command.set_log_db();
        }
        
      });
      
      
      
    }
    else{
      //担当者未決定の日を取得し、リスト表示してbotで提示
      kintone_command.get_vacant_day()
      .done(function(){
        
        if( no_candidate_day.length > 0 ){
          //vacant_day
          line_command.send_line_choice();
        }
        else{
          console.log("NO vacant day!");
          
          line_reply_mode = LINE_MODE_DENEY_REPLY_ALREADY_EXIST;
          input_line_message = "";
          line_command.send_line_reply();
        }
      
        console.log("send_line_choice");
      });
      
      
      //show_line_choice( event );
      
      //line_reply_mode = LINE_MODE_NOTIFY_CORRECT_FORMAT;
      //line_command.send_line_reply();
    }

  }
  else{
    input_line_message = "";
    line_reply_mode = LINE_MODE_NOTIFY_CORRECT_FORMAT;
    
    line_command.send_line_reply();
  }
  
  
}






function is_valid_register_input( input_text ){

  var KEYWORD_DATE = "日";
  var KEYWORD_TIME = "時間"
  var KEYWORD_PLACE = "場所";
  var KEYWORD_PLACE2 = "行先";
  var KEYWORD_PICKUPPEOPLE = "送迎対象者";
  //var KEYWORD_SENDER = "あなたの名前";


  
  //init
  input_date = "";
  input_time = "";
  input_pickup_people = "";
  input_destination = "";
  //input_sender = "";
  

  var arry = input_text.split("\n");

  console.log("array.length = "+ arry.length);
  console.log("arry");
  console.log(arry);

  for(var i=0; i<arry.length; i++ ){
    console.log("arry["+i+"]"+arry[i]);

    var tmp = arry[i].split( /:|：|" "|"　"/ );
    

      
    if(tmp[0]==KEYWORD_DATE) {
      input_date = tmp[1].trim();
      console.log("input_date=" + tmp[1]);
    }    
    else if(tmp[0]==KEYWORD_TIME) {
      input_time = (tmp[1]+":"+tmp[2]).trim();
      console.log("input_time=" + input_time);
    }    
    else if(tmp[0]==KEYWORD_PICKUPPEOPLE) {
      input_pickup_people = tmp[1].trim();
      console.log("pickuppeople=" + tmp[1]);
    }
//    else if(tmp[0]==KEYWORD_SENDER){
//      input_sender = tmp[1].trim();
//      console.log("hito="+tmp[1]);
//    }
    else if(( tmp[0] == KEYWORD_PLACE) || ( tmp[0] == KEYWORD_PLACE2 )){
      input_destination = tmp[1].trim();
      console.log("destination=" + tmp[1]);
    }
  }
  
  
  if(( input_date != "" ) && ( input_time != "" ) && ( input_pickup_people != "" ) && ( input_destination != "" )){
    return(1);
  }
  else{
    return(0);  //登録材料は揃っていない
  }
  
  
}


/* -----------------------------------------------------
  送迎対象者に送迎予定の連絡を電話で伝える
  Logも記録する（電話発信しない場合は呼び元で指定したLOG_TYPEを記録する。予備元で
                input_log_type と input_log を設定しておくこと)
  ----------------------------------------------------- */
function call_to_pickup_people( input_kintone_id ){
  
  kintone_command.get_schedule_data_from_1_ID()     //input_kintone_id から１件スケジュール全取得
  .then(kintone_command.get_pickup_people_callid)   //input_pickup_people からpickup_peopleの電話番号を取得
  .done(function(){
    if( input_sender == WORD_SENDER_NOT_DECIDED ){  //送迎予定者がまだ決まっていない場合、管理者へ電話連絡

      if( debug() ){
        console.log("debugのため管理者へ緊急電話しない");
        return;
      }

      input_pickup_people_callid = process.env.TWILIO_MANAGER_PHONE_NUMBER;
      input_pickup_people_auto_call_flg = 1;

      make_phonecall_not_decided_sender_comment_to_manager();       //電話で伝える文言作成
      twilio_command.auto_call_to_pickup_people();    //電話発信
      console.log("Reserve to call. 管理者へ緊急電話。送迎予定が決まってない。");

      //後のlog recordのためのlog_type設定
      input_log = "管理者へ緊急電話。送迎予定が決まってない。";
      input_log_type = LOG_TYPE_CALLBACK;

    }

    else if(( input_pickup_people_callid.length > 0 ) && ( input_pickup_people_auto_call_flg > 0 )){
      make_phonecall_comment();                       //電話で伝える文言作成
      twilio_command.auto_call_to_pickup_people();    //電話発信
      console.log("Reserve to call");

      //後のlog recordのためのlog_type設定
      input_log_type = LOG_TYPE_CALLBACK;

    }
    else{
      console.log("NO need to call");

      //呼び元のinput_log_typeをそのまま利用する
    }

    // log record
    if( input_sender_line_id != ""){
      input_log += " kintone_id=" + input_kintone_id + " input_sender_line_id=" + input_sender_line_id;
    }
    else{
      input_log += " kintone_id=" + input_kintone_id;
    }
    input_pickup_people_num = input_destination_num = "";
    kintone_command.set_log_db();

    console.log("[call_to_pickup_people] END\n");
  });
    
}

/* -----------------------------------------------------
  送迎対象者に自動電話連絡する文言生成
  input_xxを用いて、phonecall_commentに格納する
  ----------------------------------------------------- */
function make_phonecall_comment(){
  
  phonecall_comment
  = input_pickup_people + "さんのお宅でしょうか。\n"
  + "鹿ノ台自治連合会　送迎予約システムからのお知らせです。\n"
  + input_date + input_time + input_destination + "への送迎は"
  + input_sender + "さんがお迎えにあがる予定です。\n"
  + "予定が変更になれば速やかにご連絡お願いします。\n"
  + "では、失礼します";
  
}

/* -----------------------------------------------------
  管理者に自動電話連絡する文言生成
  phonecall_commentに格納する
  ----------------------------------------------------- */
function make_phonecall_not_decided_sender_comment_to_manager(){

  phonecall_comment
  = "いきいきの輪管理者さんのお宅でしょうか。\n"
  + "鹿ノ台自治連合会　送迎予約システムからのお知らせです。\n"
  + "明日の送迎予定者が決まっていないデータがあります。\n"
  + "至急確認をお願いします。"
  + "では、失礼します";

}

/* -----------------------------------------------------
  [UTILITY]
  URL内のパラメータからcaller_noを取り出す。（"caller_no="から"&pickup_place"の間に格納されている番号）
  originalUrl=/api/command/register?daytime=xxx&pickup_people=yyy&caller_no=+81zzzzzzzzzz&pickup_place=41
  ----------------------------------------------------- */
function get_caller_no_from_url( url ){
  var STRING_CALLERNO = "caller_no=";
  var STRING_PICKUP_PLACE = "&pickup_place";
  
  var start = url.indexOf( STRING_CALLERNO );
  var end = url.indexOf( STRING_PICKUP_PLACE );
  
  if( start < 0 ) return "";
  if( end < 0 ) return "";
  
  //console.log("start= "+start);
  //console.log("end = " + end);
  
  var len = (end+1)-(start+1+STRING_CALLERNO.length);
  
  //console.log("len="+ len);
  return change_nationalnumber_to_jpphonenumber( url.substr(start+STRING_CALLERNO.length, len));
  
}

/* -----------------------------------------------------
  [UTILITY]
  日本の電話番号から国際電話番号に変換。先頭の0を除いて+81をつける
  ----------------------------------------------------- */
// 参考→→→twilio.jsにchange_jpphonenumber_to_nationalnumber( jp_phone_number )有り。


/* -----------------------------------------------------
  [UTILITY]
  国際番号(+81付)から日本の電話番号に変換。先頭の+81を除いて0をつける
  ----------------------------------------------------- */
function change_nationalnumber_to_jpphonenumber( national_number ){
  var jp_phone_number;
  var PHONE_COUNTRY_CODE_JP = "+81";

  
  if( national_number.indexOf(PHONE_COUNTRY_CODE_JP) != -1 ){
    jp_phone_number = national_number.replace( PHONE_COUNTRY_CODE_JP, '0');
  }
  else{
    console.log("[change_nationalnumber_to_jpphonenumber]ERROR!!!!!!!!!!!!!!!!!!!!!!!!");
    jp_phone_number = national_number;
  }
  
  console.log("jp_phone_number="+jp_phone_number);
  return jp_phone_number;

}


/* --------------------------------------------
  sleep関数を実装
  https://www.sejuku.net/blog/24629
  --------------------------------------------- */
  /*
function sleep(msec) {
  return new Promise(function(resolve) {

     setTimeout(function() {resolve()}, msec);

  })
}
*/

function sleepByPromise(sec) {
 
  return new Promise(resolve => setTimeout(resolve, sec*1000));

}

/* --------------------------------------------
  sleep関数を実装
  https://www.sejuku.net/blog/24629
  --------------------------------------------- */
async function wait(sec) {
 
  console.log('wait ' + sec.toString() + ' sec right now!');

  // await句を使って、Promiseの非同期処理が完了するまで待機します。
  await sleepByPromise(sec);

  console.log('wait ' + sec.toString() + ' sec done!');

}

async function wait_and_call( sec, kintone_id ){

  console.log("wait " + sec.toString() + " sec" + "kintoneid= " + kintone_id );

  await sleepByPromise(sec);

  console.log("wait " + sec.toString() + " sec done! prepare CALL" + "kintoneid= " + kintone_id );
  
  input_kintone_id = kintone_id;
  
  //call_to_pickup_people にて電話発信しなかった場合の登録内容
  input_log_type = LOG_TYPE_NOT_CALLBACK;         //該当の人がコールバックOFF設定の場合に利用
  input_log = "前日自動電話連絡。"
  input_pickup_people_num = input_destination_num = ""; //pickup_people_numだけ取得していないので初期化しておく
    
  call_to_pickup_people( input_kintone_id );  //送迎対象者に送迎予定を電話で伝える
  
  console.log(" --------------------------------- ");
  console.log("callback_for_reminder. kintone_id=" + kintone_id + ". call start");
  console.log(" --------------------------------- ");  


}
