# 高齢者用　配車プラットフォーム

### 構成

1) Twilioで支援必要者からの電話を受けプッシュボタン方式（IVR：Interactive Voice Response)で用件を入力してもらう
2) 上記内容をherokuへhttpで渡す
3) herokuからkintone DBへ保存
4) herokuからメールとLINE push通知で送迎ボランティア会員へ一斉配信
5) 送迎ボランティア会員からlineで返信あれば、kintoneスケジューラーへ自動登録
6) kintoneでカレンダー表示可能
7) 支援必要者へTwilio電話で自動通知

