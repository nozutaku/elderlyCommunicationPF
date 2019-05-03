# 高齢者用　配車プラットフォーム

### 構成

1) Twilioで支援必要者からの電話を受けプッシュボタン方式（IVR：Interactive Voice Response)で用件を入力してもらう
2) 上記内容をherokuへhttpで渡す
3) herokuからkintone DBへ保存
4) herokuからメールとLINE push通知で送迎ボランティア会員へ一斉配信
5) 送迎ボランティア会員から返信あれば、スケジュールへ自動登録
6) heroku上にnode.js＋express+ejsにて　動的html表示(heroku postgresからデータを取得して判断)
7) 支援必要者へTwilio電話で通知

### 設定

●SEARCH_TEL_NUMBER_PREFERED　フラグについて 
　・1＝送迎依頼者の電話番号優先(送迎依頼者による入力番号より発信者番号を優先する。発信者番号登録が無ければ、送迎依頼者による入力番号を利用する)
　・0＝送迎依頼者の入力番号のみを利用
 
 

