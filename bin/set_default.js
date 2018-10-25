//毎日朝３時に本関数が呼ばれ、postgresデータベースがデフォルトに戻る

var api = require('../iotcounter.js');

api.update_database( set_all_default );

