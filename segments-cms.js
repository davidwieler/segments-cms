module.exports = (settings, app) => {
	const express = require('express');
	const router = express.Router();
	const routerAdditions = [];
	const cmsConfig = require('./cms.js');
	const passport = require('passport');
	const helmet = require('helmet');
	const cookieParser = require('cookie-parser');
	const session = require('express-session');
	const MongoStore = require('connect-mongo')(session)
	const flash = require('connect-flash');
	const fs = require('fs');
	const path = require('path');

	app.use(helmet({
		noSniff: false
	}));

    const dbSessionsConf = {
        db: {
            url: 'mongodb://' + settings.sessions.url,
            stringify: false
        },
        secret: settings.sessions.secret,
        sameSite: true,
        cookieName: settings.sessions.cookieName,
        cookieLength: settings.sessions.cookieLength || new Date(Date.now() + (30 * 24 * 60 * 60 * 1000))
    };

	const sessionOpts = {
	    saveUninitialized: false,
	    resave: false,
	    store: new MongoStore(dbSessionsConf.db),
	    secret: dbSessionsConf.secret,
	    name: settings.sessions.cookieName,
	    cookie : {  httpOnly: true, secure : false, sameSite: dbSessionsConf.sameSite, maxAge : dbSessionsConf.cookieLength} //Cookie for one month
	};

	app.use(cookieParser(dbSessionsConf.secret)); // read cookies (needed for auth)
	app.use(session(sessionOpts)); // session secret

	app.use(passport.initialize());
	app.use(passport.session());
	app.use(flash()); // use connect-flash for flash messages stored in session

	CMS.init(settings);

	// pass passport for configuration
	require('./admin/passport')(passport, CMS);

	// middleware that is specific to this router
	router.use( (req, res, next) => {
		let db = CMS.db();

		let requestUrl = req.url;
		let baseUrl = req.baseUrl;

		if (requestUrl === '/favicon.ico') {
			return;
		}

		if (CMS.passThroughUrl(requestUrl) === true) {

			// clear plugin navigation additions
			CMS.navigation = require('./admin/navigation.js');

			let adminPlugins = CMS.activePlugins.admin;

			for (var i = adminPlugins.length - 1; i >= 0; i--) {
				console.log(i);

				let requirePath = path.join(adminPlugins[i].pluginPath, adminPlugins[i].pluginInfo.require);

				let thisPlugin = require(requirePath);
				thisPlugin(CMS, router).init();

			}

			let pluginRoutes = CMS.activePluginRoutes;

            for (let i = pluginRoutes.length - 1; i >= 0; i--) {
            	let routes = pluginRoutes[i].routes;

            	for (let i = routes.length - 1; i >= 0; i--) {
	            	if (requestUrl.indexOf(routes[i].route) >= 0) {
	            		let routeInfo = pluginRoutes[i].routes[i];
	            		CMS.renderPluginTemplate(res, pluginRoutes[i], routeInfo);
	            		return;
	            	}
            	}

            }
            console.log(CMS.navigation);
			next();
			return;
		}

		db[CMS.dbConn.collection].findOne({postUrl: requestUrl, status: { $ne: 'trash' }}, (err, doc) => {

			if (err) {
				if (CMS.cmsDetails.custom500 === 'true') {
					// Use cms based error 500 page
					CMS.error(res, 500);
					CMS.sendResponse(res, 500, 'Server Error');
					return;
				} else {
					next();
					return;
				}
			}

			if (doc === null) {

				if (CMS.cmsDetails.custom404 === 'true') {
					// Use cms based error 404 page
					CMS.error(res, 404, 'Page not found');
					return;
				} else {
					next();
					return;
				}

			}

			CMS.renderTemplate(res, doc);
			return;
		});

	});

	router.get('/' + CMS.adminLocation + '/install', (req, res) => {
		if (fs.existsSync(__dirname + '/admin/.install')) {
			CMS.renderAdminTemplate(res, 'install', { message: req.flash('installMessage')});
		} else {
			CMS.renderAdminTemplate(res, 'login', {message: 'Install has already been complete. Please login to administer your site.'});
		}
	});

	router.get('/' + CMS.adminLocation + '/login', (req, res) => {
		if (fs.existsSync(__dirname + '/admin/.install')) {
			res.redirect('/' + CMS.adminLocation + '/install');
		} else {
			CMS.renderAdminTemplate(res, 'login', { message: req.flash('installMessage')});
		}

	});

	router.post('/' + CMS.adminLocation + '/install', (req, res, next) => {
        passport.authenticate('local-install', function(err, install, info) {
			if (err) {
				return next(err);
			}

			if (!install) {
				CMS.renderAdminTemplate(res, 'install', {message: info});
				return;
			}
			req.logIn(install, function(err) {
				if (err) {
					return res.redirect('/' + CMS.adminLocation + '/login');
				}

				res.redirect('/' + CMS.adminLocation + '/dashboard');

			});
        })(req, res, next);
    });

	router.post('/' + CMS.adminLocation + '/login', (req, res, next) => {
		passport.authenticate('local-login', function(err, user, info) {
			if (err) {
				return next(err);
			}

			if (!user) {
				CMS.renderAdminTemplate(res, 'login', {message: info});
				return;
			}
			req.logIn(user, function(err) {
				if (err) { return next(err); }

			    return res.redirect('/' + CMS.adminLocation + '/dashboard/');

			});
		})(req, res, next);
	});

	router.get('/' + CMS.adminLocation + '/logout', function(req, res){
	    req.logout();
	    res.redirect('/' + CMS.adminLocation + '/login');
	});

	router.get(['/' + CMS.adminLocation + '/dashboard', '/' + CMS.adminLocation + '/'], CMS.isLoggedIn, (req, res) => {
		CMS.renderAdminTemplate(res, 'dashboard');
	});

	router.get('/' + CMS.adminLocation + '/posts', CMS.isLoggedIn, (req, res) => {

		let findPosts = {
			limit: 20
		}

		let limit = req.query.limit;
		let offset = req.query.offset;
		let msg = req.query.msg;

		if (typeof limit !== 'undefined') {
			findPosts.limit = limit
		}

		if (typeof offset !== 'undefined') {
			findPosts.offset = offset
		}
		CMS.getPosts(findPosts, (result) => {
			CMS.renderAdminTemplate(res, 'posts', {posts: result, limit: findPosts.limit, msg: msg});
		});

	});

	router.get('/' + CMS.adminLocation + '/media', CMS.isLoggedIn, (req, res) => {
		let findAttachments = {
			limit: 20
		}

		let limit = req.query.limit;
		let offset = req.query.offset;
		let msg = req.query.msg;

		if (typeof limit !== 'undefined') {
			findAttachments.limit = limit
		}

		if (typeof offset !== 'undefined') {
			findAttachments.offset = offset
		}

		if (req.query.delete) {
			CMS.deleteAttachment(req.query.delete, (result) => {
				res.redirect('/' + CMS.adminLocation + '/media');
			});
			return;
		}

		CMS.getAttachments(findAttachments, (result) => {
			CMS.renderAdminTemplate(res, 'media', {attachments: result, limit: findAttachments.limit, msg: msg});
		});
	});

	router.get('/' + CMS.adminLocation + '/edit', CMS.isLoggedIn, (req, res) => {
		CMS.renderAdminTemplate(res, 'edit');
	});

	router.get('/' + CMS.adminLocation + '/pages', CMS.isLoggedIn, (req, res) => {
		CMS.renderAdminTemplate(res, 'pages');
	});

	router.post('/' + CMS.adminLocation + '/edit', CMS.isLoggedIn, (req, res) => {
		CMS.createContent(req.body, 'post', (result) => {
			res.redirect('/' + CMS.adminLocation + '/edit/' + result + '?msg=1');
		});
	});

	router.get('/' + CMS.adminLocation + '/edit/:id', CMS.isLoggedIn, (req, res) => {
		let msg = req.query.msg;
		if (typeof msg !== 'undefined') {
			CMS.renderAdminTemplate(res, 'edit', req.params, msg);
		} else {
			CMS.renderAdminTemplate(res, 'edit', req.params);
		}
	});

	router.post('/' + CMS.adminLocation + '/edit/:id', CMS.isLoggedIn, (req, res) => {
		const postId = req.params.id;
		req.body.postId = postId;
		CMS.updatePost(req.body, req.body.postId, (result) => {

			if (result.ok === 1) {
				if (req.body.status === 'trash') {
					res.redirect('/' + CMS.adminLocation + '/posts?msg=3');
					return;
				} else {
					res.redirect('/' + CMS.adminLocation + '/edit/' + postId + '?msg=2');
				}
			}
		});
	});

	//File uploads

	router.post('/' + CMS.adminLocation + '/upload', (req, res) => {
		let formidable = require('formidable');

		// create an incoming form object
		let form = new formidable.IncomingForm();

		// specify that we want to allow the user to upload multiple files in a single request
		form.multiples = true;

		// store all uploads in the /uploads directory
		form.uploadDir = CMS.uploadDir;

		// every time a file has been uploaded successfully,
		// rename it to it's orignal name
		form.on('file', function(field, file) {

			let fullFilePath = file.path;
			let filePath = fullFilePath.replace(__dirname, '');

			let data = {
				name: file.name,
				originalName: file.name,
				size: file.size,
				realPath: '/uploads/' + file.name,
				fileType: file.type,
				postId: field || ''
			}

			let fileName = file.name;
			let fileExt = fileName.split('.').pop();
			let named = fileName.substr(0, fileName.lastIndexOf('.'))

			CMS.getAttachments({search:{originalName: data.originalName}}, (result) => {
				if (result.attachmentCount >= 1) {
					//data.name = named + '_' + result.length + '.' + fileExt;
					named = named + '_' + result.attachmentCount;
				}

				data.name = named + '.' + fileExt;

				fs.rename(file.path, path.join(form.uploadDir, data.name), () => {
					let image = {
						path: path.join(form.uploadDir, data.name),
						fileName: named,
						ext: '.' + fileExt
					};

					if (!data.name.match(/.(jpg|jpeg|png|gif)$/i)){
							CMS.createContent(data, 'attachment', () => {
								CMS.sendResponse(res, 200, data);
							});
					} else {
						CMS.generateThumbnail(image, (err, result) => {
							data.thumbnails = result

							CMS.createContent(data, 'attachment', (id) => {
								data._id = id;
								CMS.sendResponse(res, 200, data);
							});
						});
					}

				});
			})
		});

		// log any errors that occur
		form.on('error', function(err) {
			console.log('An error has occured: \n' + err);
		});

		// once all the files have been uploaded, send a response to the client
		form.on('end', function() {
			//res.end('success');
		});

		// parse the incoming request containing the form data
		form.parse(req);
	});

	//API routes

	router.post('/' + CMS.adminLocation + '/api/posts', (req, res) => {

		if (req.body.id) {
			let post = CMS.getPost(req.body.id, (result) => {
				CMS.sendResponse(res, 200, result);
			});
			return
		}

		let findPosts = {
			limit: 20
		}

		let limit = 20;

		if (req.body.limit) {
			findPosts.limit = req.body.limit;
		}

		if (req.body.offset) {
			findPosts.offset = req.body.offset;
		}

		if (req.body.search) {
			findPosts.search = req.body.search;
		}

		CMS.getPosts(findPosts, (result) => {
			CMS.sendResponse(res, 200, {posts: result, limit: findPosts.limit});
		});

	});

	router.post('/' + CMS.adminLocation + '/api/attachments', (req, res) => {

		if (req.body.id) {
			let post = CMS.getAttachment(req.body.id, (result) => {
				CMS.sendResponse(res, 200, result);
			});
			return
		}

		let findAttachments = {
			limit: 20
		}

		if (req.body.limit) {
			findAttachments.limit = req.body.limit
		}

		if (req.body.offset) {
			findAttachments.offset = req.body.offset
		}

		if (req.body.search) {
			findAttachments.search = req.body.search;
		}

		CMS.getAttachments(findAttachments, (result) => {
			CMS.sendResponse(res, 200, {attachments: result});
		});

	});

	return router;

}