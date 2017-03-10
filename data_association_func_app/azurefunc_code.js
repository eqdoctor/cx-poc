var docDB = require('documentdb');
var docdbUtils = require('.\\..\\utils\\docdbUtils.js');
var DocumentDBClient = require('documentdb').DocumentClient;
var docDbClient = new DocumentDBClient(process.env["DocDBURI"], {
     masterKey: process.env["DocDBKey"]
 });

var databaseId = "associateDB";
var collectionId = "customer";
var collection = null;

module.exports = function (context, myEventHubTrigger) {
    var custId = myEventHubTrigger.customerId;  //pulling out customerID
    context.log('Customer ID from EH: ', custId);
    
    //Query Builder
    var query = "SELECT * FROM root c WHERE c.cust_id=@id AND (";
    var parameters = [{
        name: "@id",
        value: custId
    }];

    //Since we can get multiple BLNumbers, Containernumbers, BookingNumbers, etc., we're going to loop through the new interaction to see which ones are present in the interaction
    var i = 0;
    var toSubstr = false;
    if(myEventHubTrigger.key.ContainerNumber !== null){ //Ensuring that the ContainerNumber is not null
        myEventHubTrigger.key.ContainerNumber.forEach(function(container){
        query += "ARRAY_CONTAINS(c.keys.containers, @container"+i+") OR ";  //Building out the query.
        var param = {           //Defining parameters separately to avoid SQL injection
            name: '@container'+i,
            value: container
        }
        parameters.push(param);
        i++;
        toSubstr = true;
        });
    }
    
    if(myEventHubTrigger.key.BLNumber != null){
        i = 0;
        myEventHubTrigger.key.BLNumber.forEach(function(bl){
            query += "ARRAY_CONTAINS(c.keys.BLNumber, @bl"+i+") OR ";
            var param = {
                name: '@bl'+i,
                value: bl
            }
            parameters.push(param);
            i++;
            toSubstr = true;
        });
    }
    
    if(myEventHubTrigger.key.BookingNumber != null){
        i = 0;
        myEventHubTrigger.key.BookingNumber.forEach(function(booking){
            query += "ARRAY_CONTAINS(c.keys.BookingNumber, @booking"+i+") OR ";
            var param = {
                name: '@booking'+i,
                value: booking
            }
            parameters.push(param);
            i++;
            toSubstr = true;
        });
    }

    if(toSubstr){   //If we go through at least one of the forEach loops above, this condition will be true and we'll have to remove the lagging " OR "
        query = query.substr(0,query.length-4);
        query+=")";
    }
    else{   //If we do not go through any forEach loops above, we'll have to remove the lagging " AND (".
        query = query.substr(0,query.length-6);
    } 

    var querySpec = {       //Updating the QuerySpec so that we can call DocDB with the QuerySpec
            query: query,
            parameters: parameters    
    }
    
//Calling the function that is defined at the bottom of this program
    getDocument(docDbClient, databaseId, collectionId, querySpec, function(err, results){
        if(err){
            context.log("Error:",err);
        }
        else{
            context.log("Results: ",results);

            //Creating the JSON to be inserted into DocDB for the new interaction
            var interaction = {
                id: myEventHubTrigger.intID,
                cust_id: myEventHubTrigger.customerId,
                cust_name: myEventHubTrigger.customerName,
                channel: myEventHubTrigger.channel,
                createdTimeStamp: myEventHubTrigger.createdTimestamp,
                keys: {
                    containers: myEventHubTrigger.key.ContainerNumber,
                    bls: myEventHubTrigger.key.BookingNumber,
                    bookings: myEventHubTrigger.key.BLNumber,
                    locations: myEventHubTrigger.key.Location
                },
                correlations: []
            };
            
            results.forEach(function(result){
                var out = result;
                context.log("out: ", out);
                interaction.correlations.push(out.id);   //Adding correlated IDs to the new interaction
                out.correlations.push(myEventHubTrigger.intID); //updating all the related documents with the new interaction's id
                docDbClient.replaceDocument(out._self, result, function(err, updated){  //Commiting the changes to DocDB
                    if(err){
                        context.log("Error while updating document: ", err);
                    }else{
                        context.log("Document Updated; id: ", out.id);
                    }
                }); 
            });
        
        //Creating a new document in DocDB for the latest interaction 
            context.log("interaction: ",interaction);
            var collLink = "dbs/"+databaseId+"/colls/"+collectionId;
            docDbClient.createDocument(collLink, interaction, function (err, document) {
                if (err) {
                    console.log(err);
                } else {
                    console.log('created Doc: ' + document.id);
                }
            });
        }
    });
    context.done();
};

//Function to get Document out of a DocDB collection using a specified query
function getDocument(docDbClient, databaseId, collectionId, query, done){
    docdbUtils.getOrCreateDatabase(docDbClient, databaseId, function (err, db) {
        if (err) {
                done(err);
            } 
        else {
          docdbUtils.getOrCreateCollection(docDbClient, db._self, collectionId, function (err, coll) {
            if (err) {
                done(err);
            } 
            else {
                docDbClient.queryDocuments(coll._self, query).toArray(function(err, results){
                    if(err){
                        done(err);
                    }
                    else{
                       // context.log("Res: ", results);
                        done(null, results);
                    }    
                })
              }
          });
       }
    });
};
