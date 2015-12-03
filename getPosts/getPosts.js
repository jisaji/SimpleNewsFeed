console.log('Loading function');

var AWS = require("aws-sdk");
var async = require("async");

AWS.config.update({
  region: "us-east-1",
  endpoint: "https://dynamodb.us-east-1.amazonaws.com"
});

var dynamodbDoc = new AWS.DynamoDB.DocumentClient();

var params = {
    TableName : "postsV2",
};
var https = require('https');
var posts;

/**
 * Provide an event that contains the following keys:
 *
 *   - id_token: Token from Google Sign In
 */
exports.handler = function(event, context) {
    console.log('Received event:', JSON.stringify(event, null, 2));
    var url = "https://www.googleapis.com/oauth2/v3/tokeninfo?id_token=" + event.id_token;
    https.get(url, function(res) {
        console.log("Got response: " + res.statusCode);
        if (res.statusCode != 200) {
            context.fail()
        }
        res.on('data', function (chunk) {
            console.log('BODY: ' + chunk);
            var item = JSON.parse(chunk);
            dynamodbDoc.scan(params, function(err, data) {
                if (err) {
                    console.error("Unable to query. Error:", JSON.stringify(err, null, 2));
                    context.fail();
                } else {
                    console.log("Posts Query succeeded.");
                    async.each(data.Items,
                        function(item, callback) {
                            getUserNameFromId(item.userId, function(userName) {
                                item.userName = userName;
                                callback();
                            });
                            delete item.userId;
                        },
                        function(err) {
                            context.succeed(data.Items);        
                        }
                    );
                }
            });
        });
    }).on('error', function(e) {
        console.log("Got error: " + e.message);
        context.done(null, 'FAILURE');
    });
};

function getUserNameFromId(userId, callback) {
    dynamodbDoc.query({
        TableName : "users",
        KeyConditionExpression: "userId = :userId",
        ExpressionAttributeValues: {
            ":userId": userId
        }
    }, function(err, data) {
        if (err) {
            console.error("Unable to query. Error:", JSON.stringify(err, null, 2));
        } else {
            console.log("UserName Query succeeded.");
            console.log(data);
            callback(data.Items[0].firstName + " " + data.Items[0].lastName);
        }
    });
}
