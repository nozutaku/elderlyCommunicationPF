/* ----------------------------------------------------
  カスタマイズリスト表示

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
    if (event.viewName !== '経費計算') {   //
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
    
    
    var output = new Array();
    var j=0;
    var flg = 0;
    
    for (var i = 0; i < records.length; i++) {
      var record = records[i];
     
      flg = 0;
      for(j=0; j< output.length; j++){
        if(record.sender.value == output[j][0]){
          output[j][1]++;
          flg = 1;
          console.log(output[j][1]);
          break;
        }
      }
      if( flg != 1 ){
        output[j] = new Array(2);

        output[j][0] = record.sender.value;   //人
        output[j][1] = 1;                     //回数
        console.log("input j="+j);
      }
    }
    
    
    var k=0;

    for (k = 0; k < output.length; k++) {

      var row = myRecordSpace.insertRow(myRecordSpace.rows.length);
      var cell1 = row.insertCell(0);
      var cell2 = row.insertCell(1);
      var cell3 = row.insertCell(2);

      
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
      
      //２番目は合計回数にしたい
      cell2.innerHTML = output[k][1];
      
      cell3.innerHTML = "test";
      //var createdAt = new Date(record.date.value);
      //cell3.innerHTML = createdAt.toLocaleString();
      
    }
    
    
    //window.alert('カスタマイズビューはじめました');
    
  });
  
})();




