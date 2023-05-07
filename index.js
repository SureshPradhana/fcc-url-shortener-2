require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
const bodyParser = require('body-parser');
const { MongoClient } = require('mongodb');

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

const port = process.env.PORT || 3000;
app.use(cors());
app.use('/public', express.static(`${process.cwd()}/public`));

async function main(callback) {
  const URI = process.env.MONGODB_URI; 
  const client = new MongoClient(URI, { useNewUrlParser: true, useUnifiedTopology: true });
  try {
    await client.connect();
    await callback(client);
  } catch (e) {
    console.error(e);
    throw new Error('Unable to Connect to Database')
  }
}
main(async (client) => {
  const myDataBase = await client.db("urlsshortner").collection("urls");
  const max = await myDataBase.find().sort({ id: -1 }).limit(1).toArray();
  let id= max[0].id;
  app.get('/', function(req, res) {
    res.sendFile(process.cwd() + '/views/index.html');
  });
  app.get('/api/hello', function(req, res) {
    res.json({ greeting: 'hello API' });
  });
  app.post('/api/shorturl', async function(req, res) {
    let url = req.body.url;
    if (isValidUrl(url)) {
      const result = await myDataBase.insertOne({ original: url , id:id++});
      res.json({ original_url: url, short_url: id - 1, });
    }
    else { 
      res.json({ error: 'invalid url' }); 
    }
  });
  app.get('/api/shorturl/:shortid', async function(req, res) {
    try {
    const result = await myDataBase.findOne({ id: parseInt(req.params.shortid) });
    if (result) {
      // redirect to original URL 
      res.redirect(result.original);
    } else {
      res.status(404).send('Short URL not found');
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal server error');
  }
});

}).catch((e) => {
  console.log(e)
});

const urlRegex = /^(?:\w+:)?\/\/([^\s\.]+\.\S{2}|localhost[\:?\d]*)\S*$/;
const isValidUrl = (url) => {
  return urlRegex.test(url);
};

app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});
