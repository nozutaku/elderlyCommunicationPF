//===== サーバープログラム ===================================

//===== 設定(ここから) =======================================
var IS_HEROKU = 1;		//デバッグオプション
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
global.input_pickup_people;
global.input_sender;
global.input_destination;
global.input_kintone_id;

global.line_reply_mode;
global.input_line_message;
global.line_reply_token;

//line_reply_modeへ格納する値
global.LINE_MODE_1 = 1;
global.LINE_MODE_FOLLOW = 8;
global.LINE_MODE_UNFOLLOW = 9;

global.new_follower_line_id;

global.line_broadcast_account;


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

	console.log("command="+req.params.command);
  
  //twillioから送迎要求
  if( req.params.command == "register"){
    var params = querystring.parse(　req.params.command　);
    
    //★★★★このあたりのI/Fの合わせこみ未　★★★★
    input_date = params['date'];
    input_time = params['time'];
    input_pickup_people = params['pickup_people'];
    input_destination = params['destination'];
    
    
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
            line_message(event);
              
          }
          else{
            line_reply_mode = LINE_MODE_UNFOLLOW;
            line_message(event);
          }
        }
      }
    }
    // グループまたはトークルームに参加
    else if(( event.type == 'join' ) || ( event.type == 'leave' )){
    }
    //よくわからないメッセージ受信
    else{
      console.log("unknown webhook");    //★★LINEスタンプを返そう。「ごめんわからないよー」とかの意味の
    }
  }
  

  
});
         
app.post('/', function (req, res) {
  console.log("etc");
  res.send('POST request work well');
});


function line_message( event ){
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
    
    if( is_valid_register_input( input_line_message )){
      //DBへ登録★★★
      
    }
    else{
      //正常な入力では無いのでその旨連絡必要★★★
    }
  }
  else{
    input_line_message = "";
  }
  
  line_reply_token = event.replyToken;
  
  
  line_command.send_line_reply();
}

function is_valid_register_input( input_text ){
  /*
  + "日時: 〇〇\n"
      + "送迎対象者: 〇〇\n"
      + "あなたの名前: 〇〇\n\n"
      */
  
  var counter = input_text.indexOf( '日時' );
  
  return(1);
  
}
