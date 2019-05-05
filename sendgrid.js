/* *********************************************
  SendGrid メール送信PF
  
  https://app.sendgrid.com/
  
   *********************************************/

var $ = require('jquery-deferred');


/* ------------- 公開関数 ---------------- */
module.exports.send_email_broadcast_notify_register_schedule = function(req, res){
  
  var dfd_send_email = new $.Deferred;
  
  return send_email_broadcast_notify_register_schedule_inner( dfd_send_email );
}




/* -------------- 内部関数 ----------------*/

/* =================================================
  送迎希望者からの申し込みがあった旨をemail配信。
  
  宛先：email_broadcast_account
  内容：input_date, input_time, input_pickup_people, input_destination　から作成
  ================================================== */
function send_email_broadcast_notify_register_schedule_inner( dfd ){
  
  //[参考] https://devcenter.heroku.com/articles/sendgrid

  var email_content 
  = "鹿ノ台送迎支援システム「いきいきの輪」からのご連絡です。\n\n"
  + "下記送迎要請有り。送迎可能な方はカレンダーから登録をお願いします\n\n\n\n"
  + "==============================================\n\n"
  + "日時： " + input_date + " " + input_time + "\n\n"
  + "送迎対象者： " +  input_pickup_people + "\n\n"
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
  
  
  /* ----TEST START -------------------------------------
  
  //https://devcenter.heroku.com/articles/sendgrid
  // https://github.com/sendgrid/sendgrid-nodejs/blob/master/packages/mail/USE_CASES.md
  s//https://blog.wh-plus.co.jp/entry/2018/12/02/103008
  const sgMail = require('@sendgrid/mail');
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  const msg = {
    to: 'ikiikinowa.noreply@gmail.com',
    from: '鹿ノ台送迎システムいきいきの輪<ikiikinowa.noreply@gmail.com>',
    replyTo: 'ikiikinowa.noreply@gmail.com',
    subject: 'TEST 1st',
    text: '送迎システムです',
    //html: '<p>Hello HTML world!</p>',
  };
  sgMail.send(msg);
  console.log("mail send end\n");
  
    ----TEST END ------------------------------------- */
  
  var from_addr = "いきいきの輪<ikiikinowa.noreply@gmail.com>";
  var dummy_addr = "ikiikinowa.noreply@gmail.com";
  var replyto_addr = "ikiikinowa.noreply@gmail.com";
  var subject_string = "[鹿ノ台送迎支援システム]送迎希望者からの連絡";
  
  
  if( email_broadcast_account.length == 0 ){
    console.log("NO need to send email.\n");
    return dfd.resolve();
  }

  
  var to_array = email_broadcast_account.split(",");
  
  console.log("email_broadcast_account="+email_broadcast_account);
  console.log("to_array.length="+to_array.length);
  
  
  const sgMail = require('@sendgrid/mail');
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  
  var msg;
  
  if( to_array.length > 1 ){
    msg = {
      to: dummy_addr,
      bcc: to_array,
      from: from_addr,
      replyTo: replyto_addr,
      subject: subject_string,
      text: email_content,
    };
  }
  else if( to_array.length == 1 ){
    msg = {
      to: email_broadcast_account,
      from: from_addr,
      replyTo: replyto_addr,
      subject: subject_string,
      text: email_content,
    };    
  }
  else{
    //来ないはず
    console.log("to adder=" + email_broadcast_account);
    return;
  }
  
  
  
  sgMail.send(msg);
  
  console.log("[send_email_broadcast_notify_register_schedule_inner]\n");
  console.log("to="+ email_broadcast_account + "\n");
  console.log("subject=" + subject_string + "\n");
  console.log("body=" + email_content + "\n");
  
  
  
  return dfd.resolve();
  
}


