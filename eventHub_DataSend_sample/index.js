var EventHubClient = require('azure-event-hubs').Client;

var client = EventHubClient.fromConnectionString('Endpoint=sb://testehoocl.servicebus.windows.net/;SharedAccessKeyName=RootManageSharedAccessKey;SharedAccessKey=xGbm2rW0uQe82LU63dE5cn2YKeNbuzpCrkmqylcGJWg=', 'testeh')

var jsonText = {
    intID : 100001,
customerId : 1002,
customerName : "Azure",
channel : "Email",
key : {BookingNumber : null,
        ContainerNumber: null,
        BLNumber :1223},
createdTimestamp: 20170308,
Intent: null,
AssociatedId: []
};

var sendText = JSON.stringify(jsonText);

console.log(sendText);

client.open()
    .then(function(){
        return client.createSender()
    })
    .then(function(tx){
        tx.on('errorReceived', function (err) { console.log(err); });
        
        tx.send(sendText); 
        console.log('sent item.');
    })
