var api = require('../pf_main.js');
var dummy_req = {
    _parsedUrl: {
	query: param1="1"
    }
};
api.callback_for_reminder(dummy_req, null);

