/* ============================================
  Twilio　による電話処理
  ============================================ */
  
var https = require('https');



//電話番号 input_pickup_people_callid へphonecall_commentの内容を電話発信する
module.exports.auto_call_to_pickup_people = function(req, res){
  call_phone( input_pickup_people_callid, phonecall_comment );
}

//https://tech.sanwasystem.com/entry/2016/01/28/211457
//https://jp.twilio.com/docs/voice/tutorials/how-to-make-outbound-phone-calls-node-js


/* ==========================================
  電話番号 call_destination call_content の内容を電話発信する
  =========================================== */
function call_phone( call_destination, call_content ) {
  
  console.log("call_phone_inner START\n");
  
    var options = {
        hostname: "api.twilio.com",
        port: 443,
        path: "/2010-04-01/Accounts/" + process.env.TWILIO_ACCOUNT_SID + "/Calls",
        method: 'POST',
        auth: process.env.TWILIO_ACCOUNT_SID + ":" + process.env.TWILIO_API_TOKEN,
        headers : { "Content-Type" : "application/x-www-form-urlencoded" }
    };

    var req = https.request(options, function(res) {
        if (200 <= res.statusCode && res.statusCode <= 204) {
            console.log("OK!")
            //context.succeed();
        } else {
            console.log("HTTP status code is NOT 2xx but " + res.statusCode);
            res.setEncoding("utf8");
            res.on('data', function(data) {
                console.log(data);    
                //context.fail(res);
            });
        }
    });
    
    req.on('error', function(e) { 
      //context.fail(e.message); 
      console.log("ERROR\n");
      console.log(e.message);
    });

    var rawXml =
        '<?xml version="1.0" encoding="UTF-8"?>' +
        '<Response>' +
        '  <Say voice="alice" language="ja-JP" loop="2">' + call_content + '</Say>' +
        '</Response>';
    //var rawXml =
    //    '<?xml version="1.0" encoding="UTF-8"?>' +
    //    '<Response>' +
    //    '  <Say voice="alice" language="ja-JP" loop="2">これはテストです。</Say>' +
    //    '</Response>';
  
    var urlParam = encodeURIComponent('http://twimlets.com/echo?Twiml=' + encodeURIComponent(rawXml));

    var call_org = "From=" + process.env.TWILIO_SYSTEM_PHONE_NUMBER + "&";
    var call_destination = "To=" + change_jpphonenumber_to_nationalnumber( call_destination ) + "&";
  
    req.write(call_org);
    req.write(call_destination);
    //req.write("To=+819080683055&");
    //req.write("From=+815031343835&");
    req.write("Method=GET&");
    req.write("Url=" + urlParam);
    req.end();
};

//日本の電話番号から国際電話番号に変換。先頭の0を除いて+81をつける
function change_jpphonenumber_to_nationalnumber( jp_phone_number ){
  var national_number;
  var PHONE_COUNTRY_CODE_JP = "+81";
  
  if( jp_phone_number.length > 0 ){
    national_number = PHONE_COUNTRY_CODE_JP + jp_phone_number.substr( 1 );
    console.log("national number="+national_number);
  }
  else{
    national_number ="";
  }
  
  return national_number;
}

