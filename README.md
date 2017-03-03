# segments-cms

### Requirements
* NodeJS 4.4 + minimum. **Works best on NodeJS 7.6.**
* Express 4 framework
* body-parser NPM module
* MongoDB

##NOTE
This is a dev version that is currently an alpha.

Version 0.1 will soon be on NPM.

### How to install.

Clone/download this repo into your `node_modules` folder, `cd` into the directory and run `npm install`.

### Working server.js file.
```
var express = require('express');
var path = require('path');
var http = require('http');
var bodyParser = require('body-parser');
var app = express();
var port = 7637;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

var cms = require('segments-cms');
var cmsSettings = {
    adminLocation: 'cms-admin',
    themeDir: path.join(__dirname + '/themes'),
    pluginDir: path.join(__dirname + '/plugins'),
    uploadDir: path.join(__dirname + '/uploads'),
    db: {
        url: 'localhost:27017/cms',
        collection: 'data'
    },
    accountDb: {
        url: 'localhost:27017/cms',
        collection: 'accounts'
    },
    sessions: {
      url: 'localhost:27017/cms',
      secret: 'storethesegmentsessions',
      cookieName: 'chooseacookiename'
    }
}

app.use("/assets", express.static(path.join(__dirname + '/node_modules/cms/admin/assets') ));
app.use("/uploads", express.static(cmsSettings.uploadDir ));
app.use('/', cms(cmsSettings, app))

app.listen(port);
```

### The Install
Navigate to `localhost:7367/cms-admin`.
The first time you run the app, you'll be taken to an install screen.
Eventually this screen will allow you to add and create the database connections, as well as a few other fun things.