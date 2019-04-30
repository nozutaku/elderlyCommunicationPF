//===== サーバープログラム ===================================

//===== 設定(ここから) =======================================
var IS_HEROKU = 1;		//デバッグオプション
var DEBUG = 1;
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

global.URL_CALENDER = "https://v2urc.cybozu.com/k/22/";


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
    input_destination_num = req.query.pickup_place;

    
    console.log("------");
    console.log("input_date="+input_date);
    console.log("input_time="+input_time);
    console.log("input_pickup_people_num="+input_pickup_people_num);
    console.log("input_destination_num="+input_destination_num);
    console.log("------");
    
    
    //カレンダーDB登録→LINE配信
    kintone_command.get_placename()
    .then(kintone_command.get_pickup_people_name)
    .then(kintone_command.set_data2db)
    .then(kintone_command.get_account_all)
    .then(line_command.send_line_broadcast)
    .done(function(){
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
  
  /* ===============以下、テスト1 (postmanから送信) ============== */
  else if( req.params.command == "1"){
    
    input_pickup_people_callid = "0743787077";
    input_pickup_people = "野津";
    input_date = "2019-04-21";
    input_time = "0900";
    input_destination = "いきいきホール";
    input_sender = "田口";
    make_phonecall_comment();
    
    twilio_command.auto_call_to_pickup_people();
    console.log("-- 1 end --\n");
    
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
            kintone_command.delete_account_data2db();   //★★うまく動かない！！！！！！誰かヘルプ！！！
            
          }
          else{
            //don't care.
          }
            
          //welcome メッセージを送る
          if( event.type == 'follow' ){
            
            line_reply_mode = LINE_MODE_FOLLOW;
            //line_message(event);
          }
          else{
            line_reply_mode = LINE_MODE_UNFOLLOW;
            //line_message(event);
            
          }
          input_line_message = "";
          line_reply_token = event.replyToken;
          line_command.send_line_reply();
          
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
                call_to_pickup_people( input_kintone_id );  //送迎対象者に送迎予定を電話で伝える
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
    input_destination = " ";
    
    if( is_valid_register_input( input_line_message )){
      console.log("input_date="+input_date);
      console.log("input_time="+input_time);
      console.log("input_pickup_people="+input_pickup_people);
      //console.log("input_sender="+input_sender);
      
      
      kintone_command.get_input_sender_name()
      .then(kintone_command.update_data2db)
      .done(function(){
        //line_reply_mode = LINE_MODE_ACCEPT_REPLY;
        line_command.send_line_reply();
        console.log("kintone_command send");
        
        if(( line_reply_mode == LINE_MODE_ACCEPT_REPLY ) && ( input_kintone_id > 0 )){
          call_to_pickup_people( input_kintone_id );  //送迎対象者に送迎予定を電話で伝える
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
  /*
  + "日時: 〇〇\n"
      + "送迎対象者: 〇〇"
      */
  var KEYWORD_DATE = "日";
  var KEYWORD_TIME = "時間"
  var KEYWORD_PLACE = "場所";
  var KEYWORD_PICKUPPEOPLE = "送迎対象者";
  //var KEYWORD_SENDER = "あなたの名前";


  
  //init
  input_date = "";
  input_time = "";
  input_pickup_people = "";
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
  }
  
  
  if(( input_date != "" ) && ( input_time != "" ) && ( input_pickup_people != "" )){
//  if(( input_date != "" ) && ( input_time != "" ) && ( input_pickup_people != "" ) && ( input_sender != "" )){
    return(1);
  }
  else{
    return(0);  //登録材料は揃っていない
  }
  
  
}


/* -----------------------------------------------------
  送迎対象者に送迎予定の連絡を電話で伝える
  ----------------------------------------------------- */
function call_to_pickup_people( input_kintone_id ){
  
  kintone_command.get_schedule_data_from_1_ID()     //input_kintone_id から１件スケジュール全取得
  .then(kintone_command.get_pickup_people_callid)   //input_pickup_people からpickup_peopleの電話番号を取得
  .done(function(){
    if(( input_pickup_people_callid.length > 0 ) && ( input_pickup_people_auto_call_flg > 0 )){
      make_phonecall_comment();                       //電話で伝える文言作成
      twilio_command.auto_call_to_pickup_people();    //電話発信
      console.log("Reserve to call");
    }
    else{
      console.log("NO need to call");
    }

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



