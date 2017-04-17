var express = require('express');
var app = express();
var mongo=require("mongodb").MongoClient;
var hash=require("crypto");
var urlMongo='mongodb://localhost:27017/UrlShortener';

app.set('views', __dirname + '/views');
app.engine('html', require('ejs').renderFile);
app.get('/', function (req, res)
{
    res.render('app.html');
});
app.get("/showMeAll",function(req, res) {
    mongo.connect(urlMongo,function(err,db){
        if (err){
            res.send('Oups, Something went wrong');
        }
        var UrlData=db.collection('UrlData');
        UrlData.find().toArray(function(err,data){
            if (err){
                res.send('Oups, Something went wrong');
            }
            res.send(JSON.stringify(data));
            db.close();
        })
    })
})



app.get('/:short', function(req,res){
    mongo.connect(urlMongo,function(err,db){
        if (err){
            res.send("Could not connect to the database: ",err)
        }
        var urlData=db.collection('UrlData');
        urlData.find({_id:req.params.short}).toArray(function(err,data){
            console.log(data[0])
            if (err){
                res.send('Could not find the data',err)
            }
            if (data[0]==undefined){
                res.render('notInDb.html');
                db.close();
            }
            else{res.redirect(data[0].original_url);
                db.close();
            }
            
            
        })
    })
})

app.get('/:url(*)',function (req, res) {
    if (isValidUrl(req.params.url)){
        mongo.connect(urlMongo,function(err,db){
            if (err){
                res.send('Sorry we are temporarily not available');
            }
            var urlData=db.collection('UrlData');
            var id=hash.createHash('sha1').update(req.params.url).digest('hex').slice(0,5);
            urlData.find({_id:id}).toArray(function(err,doc){
                if (err){
                    res.send('Sorry we are temporarily not available');
                }
                if (doc[0]==undefined){
                    var docUrl=jsonUrl(req.protocol + '://' + req.get('host') + req.originalUrl,req.params.url,id,false);
                    urlData.insert(docUrl,function(err,data){
                        if (err){
                            res.send('Sorry we are temporarily not available');
                        }
                        res.json(jsonUrl(req.protocol + '://' + req.get('host') + req.originalUrl,req.params.url,id,true));
                        db.close();
                    });
                }
                else{
                    res.json({short_url:doc[0].short_url,original_url:doc[0].original_url});
                    db.close();
                }
            });
        });
    }
    
    else{
        res.json({error:'invalid Url'})
    }
});


app.listen(8080);




function jsonUrl(url1,url2,id,noId){
    url1=url1.slice(0,url1.length-url2.length-1);
    if (noId){
        return {short_url:url1+'/'+id,original_url:url2};
    }
    else{
    return {_id:id,short_url:url1+'/'+id,original_url:url2};
    }
}

function isValidUrl (url){
    return ((url.slice(0,7)=='http://' || url.slice(0,8)=='https://')&&url.split(".").length>1);
}