console.log('Loading function');

var AWS = require("aws-sdk");
var https = require('https');

AWS.config.update({
  region: "us-east-1",
  endpoint: "https://dynamodb.us-east-1.amazonaws.com"
});

var dynamodbDoc = new AWS.DynamoDB.DocumentClient();

var params = {
    Item: {
        timestamp: 1,
        userId: 0,
        postText: "Does this work??"
    },
    TableName : "postsV2",
};

exports.handler = function(event, context) {
    var url = "https://www.googleapis.com/oauth2/v3/tokeninfo?id_token=" + event.id_token;
    https.get(url, function(res) {
        console.log("Got response: " + res.statusCode);
        res.on('data', function (chunk) {
            console.log('BODY: ' + chunk);
            var userInfo = JSON.parse(chunk);
            dynamodbDoc.put({
                Item: {
                    timestamp: Date.now(),
                    userId: parseInt(userInfo.sub),
                    postText: event.postText,
                },
                TableName : "postsV2",
            }, function(err, data) {
                if (err) {
                    console.error("Unable to query. Error:", JSON.stringify(err, null, 2));
                    context.fail();
                } else {
                    console.log("Put succeeded.");
                    context.succeed(data);
                }
            });     
        });
    }).on('error', function(e) {
        console.log("Got error: " + e.message);
        context.done(null, 'FAILURE');
    });
};
