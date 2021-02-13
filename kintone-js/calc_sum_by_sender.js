/* ----------------------------------------------------
  カスタマイズリスト表示　総利用者数の表示

参考：https://developer.cybozu.io/hc/ja/articles/202905604
   ---------------------------------------------------- */

(function() {
  
  'use strict';
  
  kintone.events.on('app.record.index.show', function(event) {
    
    //違う画面を開いた時には本処理が走らないようにする
    //if (event.viewId !== 9617) {    //ListViewID
    //  return;
    //}
    //if (!document.getElementById('my-customized-view')) {
    //    return;
    //}
    if (event.viewName !== '集計(総利用者数)') {   //
      return;
    }
    
    var records = event.records;
    if (!records || !records.length) {
      document.getElementById('cost-view').innerHTML = '表示するレコードがありません';
      return;
    }

    var recUrl = location.protocol + '//' + location.hostname + '/k/' + kintone.app.getId() + '/show#record=';
    var myRecordSpace = document.getElementById('my-tbody');
    myRecordSpace.innerHTML = '';
    
    //this month & last month
    var nowdate_obj = getDateInfo();
    var this_year = nowdate_obj.this_year;
    var this_month = nowdate_obj.this_month;
    var last_month_year = nowdate_obj.last_month_year;
    var last_month = nowdate_obj.last_month;

    
    var output = new Array();
    var j=0;
    var flg = 0;
    var record;
    var input_date;
    var record_year, record_month;
    var sum_this_month = 0;
    
    
    for (var i = 0; i < records.length; i++) {
      console.log("i="+i + "length="+ records.length);
      record = records[i];
      
      //console.log("date=" + record.date.value);
      input_date = split_date(record.date.value);
      record_year = input_date.year;
      record_month = input_date.month;
      
      
      if( record.sender.value == "送迎者未決定" )   continue;
     
      flg = 0;
      for(j=0; j< output.length; j++){
        if(record.sender.value == output[j][0]){
          output[j][1] = count_up_for_sum(output[j][1], record.round_trip.value, record.num_of_parties.value);
          flg = 1;

          
          if((this_year == record_year) && (this_month == record_month)){
            output[j][2] = count_up_for_sum(output[j][2], record.round_trip.value, record.num_of_parties.value);
            sum_this_month = count_up_for_sum(sum_this_month, record.round_trip.value, record.num_of_parties.value);
          }
          else if((last_month_year == record_year) && (last_month == record_month)){
            output[j][3] = count_up_for_sum(output[j][3], record.round_trip.value, record.num_of_parties.value);
          }
          
          
          break;
        }
      }
      if( flg != 1 ){
        output[j] = new Array(2);

        output[j][0] = record.sender.value;   //人名
        output[j][1] = count_up_for_sum(0, record.round_trip.value, record.num_of_parties.value);  //トータル回数
        output[j][2] = 0;                     //今月回数初期化
        output[j][3] = 0;                     //先月回数初期化

        
        if((this_year == record_year) && (this_month == record_month)){
          output[j][2] = count_up_for_sum(output[j][2], record.round_trip.value, record.num_of_parties.value);
          sum_this_month = count_up_for_sum(sum_this_month, record.round_trip.value, record.num_of_parties.value);
        }
        else if((last_month_year == record_year) && (last_month == record_month)){
          output[j][3] = count_up_for_sum(output[j][3], record.round_trip.value, record.num_of_parties.value);
        }
        
      }
    }
    
    
    var k=0;

    for (k = 0; k < output.length; k++) {

      var row = myRecordSpace.insertRow(myRecordSpace.rows.length);
      var cell1 = row.insertCell(0);
      var cell2 = row.insertCell(1);
      var cell3 = row.insertCell(2);
      var cell4 = row.insertCell(3);

      
      //実際のレコードへのリンク
      /*
      var tmpA = document.createElement('a');
      tmpA.href = recUrl + record.レコード番号.value;
      tmpA.innerHTML = record.レコード番号.value;
      cell1.appendChild(tmpA);
      */
      //cell1.innerHTML = "test";
      //cell1.innerHTML = record.sender.value;    //送迎者名
      cell1.innerHTML = output[k][0];
      
      cell4.innerHTML = output[k][1];   //合計送迎回数
      cell2.innerHTML = output[k][2];   //今月送迎回数
      cell3.innerHTML = output[k][3];   //先月送迎回数
    }
    
    
    //window.alert('カスタマイズビューはじめました');
    
    document.getElementById('sum-view').innerHTML = "今月はのべ" + sum_this_month + "人！お疲れさまでした。";
    
  });
  
})();


/* --------------------------------------------
 現在日時を分解した形で取得
  input: 無し
  output: obj
-------------------------------------------- */
function getDateInfo(){
  var now = new Date();
  var this_month = now.getMonth()+1;
  var this_year = now.getFullYear();
  var last_month, last_month_year;
  if( this_month == 1 ){
    last_month = 12;
    last_month_year = this_year - 1;
  }
  else{
    last_month = this_month - 1;
    last_month_year = this_year;
  }
  console.log("this month=" + this_year + "/" + this_month);
  console.log("last month=" + last_month_year + "/" + last_month);
  
  var obj = new Object();
  obj.this_month = this_month;
  obj.this_year = this_year;
  obj.last_month = last_month;
  obj.last_month_year = last_month_year;
  
  return obj;
}

/* --------------------------------------------
 "2020-02-22" 形式の日付 を分解する
 input: "2020-02-22" 形式の日付
 output: obj
-------------------------------------------- */
function split_date( input_date ){
  var index   = input_date.indexOf("-");
  //console.log("index=" + index);
  var year = input_date.substring(0, index);
  
  var str = input_date.slice(index + 1);
  index   = str.indexOf("-");
  //console.log("index=" + index);
  var month = str.substring(0, index);
  var day = str.slice(index + 1);
  
  
  var obj = new Object();
  
  if(( year >= 2000 ) && (year < 2030 )){
    obj.year = year;
  }
  else{
    console.log("year error");
  }    

  if(( month >= 1 ) && ( month <= 12 )){
    obj.month = month;
  }
  else{
    console.log("month error");
  }
    
  if(( day >= 1 ) && ( day <= 31 )){
    obj.day = day;
  }
  else{
    console.log("day error");
  }
  
  return obj;
}

/* --------------------------------------------
 回数をカウントUPする
 引数：num = カウントUP前の回数
      round_trip = 右記３択　往復/往路のみ/復路のみ
 戻り値：カウントUP後の回数
-------------------------------------------- */
function count_up_for_sum( num, round_trip, parties ){
  var ret;
  
  //console.log("round_trip="+round_trip);
  
  /*
  switch( round_trip ){
    case "往復":
      ret = num + 1;
      break;
    case "往路のみ":
      ret = num + 0.5;
      break;
    case "復路のみ":
      ret = num + 0.5;
      break;
    default:
      ret = num + 1;
      console.log("round_trip="+round_trip);
      break;
  }
  */

  ret = num + 1;

  if( parties > 1 ){   //同行者がいれば、加算
    ret += parties - 1;
  }
  
  return ret;
}
