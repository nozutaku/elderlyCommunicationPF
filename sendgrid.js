/* *********************************************
  SendGrid メール送信PF
  
  https://app.sendgrid.com/
  
   *********************************************/


/* ------------- 公開関数 ---------------- */
module.exports.send_email_broadcast_notify_register_schedule = function(req, res){
  send_email_broadcast_notify_register_schedule_inner();
  console.log("finish send");
}




/* -------------- 内部関数 ----------------*/

/* =================================================
  送迎希望者からの申し込みがあった旨をemail配信。
  
  宛先：email_broadcast_account
  内容：input_date, input_time, input_pickup_people, input_destination　から作成
  ================================================== */
function send_email_broadcast_notify_register_schedule_inner(){
  
  //[参考] https://devcenter.heroku.com/articles/sendgrid

  var email_content 
  = "鹿ノ台送迎支援システム「いきいきの輪」からのご連絡です。\n\n"
  + "下記送迎要請有り。送迎可能な方はカレンダーから登録をお願いします\n\n"
  + "==============================================\n"
  + "日時： " + input_date + " " + input_time + "\n"
  + "送迎対象者： " +  input_pickup_people + "\n"
  + "送迎先： " + input_destination + "\n\n"
  + "登録先カレンダー: " + URL_CALENDER + "\n"
  + "==============================================\n";
  

  /*
  
  var helper = require('sendgrid').mail;
  var from_email = new helper.Email('app111109854@heroku.com');
  var to_email = new helper.Email(email_broadcast_account);
  var subject = '[鹿ノ台送迎支援システム]送迎希望者からの連絡';
  var content = new helper.Content('text/plain', email_content);
  var mail = new helper.Mail(from_email, subject, to_email, content);

  var sg = require('sendgrid')(process.env.SENDGRID_API_KEY);
  var request = sg.emptyRequest({
    method: 'POST',
    path: '/v3/mail/send',
    body: mail.toJSON(),
  });

  sg.API(request, function(error, response) {
    console.log("statusCode=" + response.statusCode);
    console.log("body=" + response.body);
    console.log("\n\n headers=\n");
    console.log(response.headers);
  });
  
  console.log("[send_email_broadcast_notify_register_schedule_inner]\n");
  console.log("to="+ email_broadcast_account + "\n");
  console.log("subject=" + subject + "\n");
  console.log("body=" + email_content + "\n");
  
  
  */
  
  
  
  
  //https://devcenter.heroku.com/articles/sendgrid
  // https://github.com/sendgrid/sendgrid-nodejs/blob/master/packages/mail/USE_CASES.md
  const sgMail = require('@sendgrid/mail');
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  const msg = {
    to: 'nztak@yahoo.co.jp',
    from: 'app111109854@heroku.com',
    subject: 'Hello world',
    text: 'Hello plain world!',
    html: '<p>Hello HTML world!</p>',
  };
  sgMail.send(msg);
  console.log("mail send end\n");
  
  
  /* --------------本命ここから -------------------
  
  if( email_broadcast_account.length == 0 ) return;
  
  var to_array = email_broadcast_account.split(",");
  
  
  const sgMail = require('@sendgrid/mail');
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  
  if( to_array.length > 1 ){
    const msg = {
      to: to_array,
      from: 'Shikanodai<app111109854@heroku.com>',
      subject: '[鹿ノ台送迎支援システム]送迎希望者からの連絡',
      text: email_content,
      html: '<p>Hello HTML world!</p>',
    };
  }
  else if( to_array.length == 1 ){
    const msg = {
      to: email_broadcast_account,
      from: 'Shikanodai<app111109854@heroku.com>',
      subject: '[鹿ノ台送迎支援システム]送迎希望者からの連絡',
      text: email_content,
      html: '<p>Hello HTML world!</p>',
    };    
  }
  else{
    //来ないはず
    console.log("to adder=" + email_broadcast_account);
    return;
  }
  
  
  sgMail.send(msg);
  
  --------------本命ここまで ------------------- */
  
  
  
  
  //https://blog.wh-plus.co.jp/entry/2018/12/02/103008
  
  /*
  sgMail.setApiKey(SENDGRID_API_KEY);
  //sgMail.setApiKey(process.env.SENDGRID_API);
  const msg = {
    to: "nozutaku@gmail.com",
    from: "app111109854@heroku.com",
    //replyTo: "test@gmail.com",
    subject: TEST,
    text: "this is test",
  };

  sgMail.send(msg);
  res.send('ok');
  */
}


