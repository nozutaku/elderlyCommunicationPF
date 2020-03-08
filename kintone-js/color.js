(function() {
  "use strict";

// カレンダービュー 
kintone.events.on('app.record.index.show', function(event) { 

  // カレンダービューの表示時にフィールド値の条件に応じて、文字色、フィールドの背景色を変更する 
  var eles = document.getElementsByClassName("cellitem-value-gaia"); 
  for (var i = 0, il = eles.length; i < il; i++) { 
    var ele = eles[i]; 
    
    // eleに「〇〇」が含まれていたら、文字色を変更 
    if (ele.textContent.indexOf("送迎者未決定") >= 0) { 
      ele.style.color = 'red'; 
      ele.style.fontWeight = 'bold'; 
    } 
    else { 
      ele.style.color = 'black'; 
      ele.style.fontWeight = 'normal'; 
    } 
  } 
}); 

})();