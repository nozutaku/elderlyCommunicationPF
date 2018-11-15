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



global.input_date;
global.input_time;
global.input_pickup_people;   //送迎対象者(送迎される人)
global.input_sender;          //送迎する人
global.input_destination;
global.input_kintone_id;

global.line_reply_mode;
global.input_line_message;
global.line_reply_token;

//line_reply_modeへ格納する値
global.LINE_MODE_1 = 1;

global.LINE_MODE_ACCEPT_REPLY = 2;
global.LINE_MODE_DENEY_REPLY_NO_DATA = 3;
global.LINE_MODE_DENEY_REPLY_ALREADY_EXIST = 4;
global.LINE_MODE_DENEY_REPLY_CANCEL = 5;



global.LINE_MODE_NOTIFY_CORRECT_FORMAT = 7;   //フォーマット問い合わせ
global.LINE_MODE_FOLLOW = 8;
global.LINE_MODE_UNFOLLOW = 9;

global.new_follower_line_id;

global.line_broadcast_account;


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

global.CONFIRM_WORD = "CHOOSE_";
global.CANCEL_WORD = "CANCEL_";


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
    
    
    input_pickup_people = req.query.pickup_people;
    input_destination = "";
    
    console.log("------");
    console.log("input_date="+input_date);
    console.log("input_time="+input_time);
    console.log("input_pickup_people="+input_pickup_people);
    console.log("------");
    
    //カレンダー(DB)へ登録
    kintone_command.set_data2db();
    console.log("kintone_command END");
    
    //送迎者募集
    kintone_command.get_account_all()
    .done(function(){
      line_command.send_line_broadcast();
    });
    
    
  }
  
  /* ===============以下、テスト1 (postmanから送信) ============== */
  else if( req.params.command == "1"){
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
  
  res.send("your command receive");

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
              input_sender = "テストさん"; //★★★本番はLINEIDから取得する

              kintone_command.update_id2db()
              .done(function(){
                input_line_message = "";
                line_reply_mode = LINE_MODE_ACCEPT_REPLY;
                line_command.send_line_reply();
                console.log("kintone_command send");
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
    console.log("input_message = "+ input_line_message);
    input_destination = " ";
    
      if( is_valid_register_input( input_line_message )){
      console.log("input_date="+input_date);
      console.log("input_time="+input_time);
      console.log("input_pickup_people="+input_pickup_people);
      console.log("input_sender="+input_sender);
      
      
      
      kintone_command.update_data2db()
      .done(function(){
        line_reply_mode = LINE_MODE_ACCEPT_REPLY;
        line_command.send_line_reply();
        console.log("kintone_command send");
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
      + "送迎対象者: 〇〇\n"
      + "あなたの名前: 〇〇\n\n"
      */
  var KEYWORD_DATE = "日";
  var KEYWORD_TIME = "時間"
  var KEYWORD_PLACE = "場所";
  var KEYWORD_PICKUPPEOPLE = "送迎対象者";
  var KEYWORD_SENDER = "あなたの名前";


  //var str = "日時：2018/10/23 10:00\n場所: いそかわ\n人:野津"；
  //var str = "日時：2018/10/23 10:00"；
  //var str = "日時：2018/10/23 10:00";
  //var str = "日時：2018/10/23 10時\n場所：いそかわ\n人：野津";
  //var str = "日時：";
  
  //init
  input_date = "";
  input_time = "";
  input_pickup_people = "";
  input_sender = "";
  

  var arry = input_text.split("\n");

  console.log("array.length = "+ arry.length);
  console.log("arry");
  console.log(arry);

  for(var i=0; i<arry.length; i++ ){
    console.log("arry["+i+"]"+arry[i]);

    var tmp = arry[i].split( /:|：|" "|"　"/ );
    
    /*
    if(tmp[0]==KEYWORD_DATE){
      console.log("daytime＝"+tmp[1]);
      

      var tmp2 = tmp[1].replace("　", " ").split(" ");
//      var tmp2 = tmp[1].replace("　", " ").split(" ",0);
      //var tmp2 = tmp[1].split(" ");
      
      //var tmp2 = tmp[1].split(/" "|"　"|/);
      input_date = tmp2[0];
      input_time = tmp2[1];
      console.log("tmp2[0]="+tmp2[0]);
      console.log("tmp2[1]="+tmp2[1]);

    } */
      
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
    else if(tmp[0]==KEYWORD_SENDER){
      input_sender = tmp[1].trim();
      console.log("hito="+tmp[1]);
    }
  }
  
  
  if(( input_date != "" ) && ( input_time != "" ) && ( input_pickup_people != "" ) && ( input_sender != "" )){
    return(1);
  }
  else{
    return(0);  //登録材料は揃っていない
  }
  
  
}
