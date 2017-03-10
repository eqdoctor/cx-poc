var express = require('express');        // call express
var DocumentDBClient = require('documentdb').DocumentClient;
var bodyParser = require('body-parser');
var docdbUtils = require('./utils/docdbUtils.js');
var app = express();

var port = process.env.PORT || 8000;
var router = express.Router();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

router.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Cache-Control, Authorization");
    next();
});

var docDbClient = new DocumentDBClient('https://documentdbdemo01.documents.azure.com:443/', {
     masterKey: 'rKg8p5ASwoODVXmWBzKinUTkdwt8xQDMtvnJEBE3SbDOAGDMfb6URII6K4UejZceqE1P0LjdMUarVc69iZkQDw== '
 });

var databaseId = "KeyPharseExtractionDB";
var collectionId = "ExtractDataCollection";
var collection = null;

router.get('/', function(req, res) {
    res.json({ message: 'DocumentDB Sample API!' });   
});

router.route('/getdata')
    .get(function(req, res){
        var querySpec = {
            query: "SELECT * FROM ExtractDataCollection"
        }

        docdbUtils.getOrCreateDatabase(docDbClient, databaseId, function (err, db) {
            if (err) {
                return res.send(500, err);
            } else {
                docdbUtils.getOrCreateCollection(docDbClient, db._self, collectionId, function (err, coll) {
                    if (err) {
                        return res.send(500, err);
                    } else {
                        docDbClient.queryDocuments(coll._self, querySpec).toArray(function(err, results){
                            if(err){
                                return res.send(500, err);
                            }
                            else{
                                return res.json(results);
                            }    
                        })
                    }
                });
            }
    });
        
    });

app.use('/api', router);

app.listen(port, function () {
    console.log('Listening on port: ' + port);
});

module.exports = {app};