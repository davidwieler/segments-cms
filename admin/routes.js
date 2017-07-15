const fs = require('fs');
const path = require('path');
const Events = require('./events.js');
const request = require('request');
const _ = require('lodash');
module.exports = (CMS, router, passport, settings) => {

	router.get('/' + CMS.adminLocation + '/install', (req, res) => {
		if (fs.existsSync(__dirname + '/admin/.install')) {
			CMS.renderAdminTemplate('install', { message: req.flash('installMessage')});
		} else {
			CMS.renderAdminTemplate('login', {message: 'Install has already been complete. Please login to administer your site.'});
		}
	});

	router.get('/' + CMS.adminLocation + '/login', (req, res) => {
		if (fs.existsSync(__dirname + '/admin/.install')) {
			res.redirect('/' + CMS.adminLocation + '/install');
		} else {
			res.clearCookie(global.cms.cookieName);
			CMS.renderAdminTemplate('login', { message: ''});
		}

	});

	router.post('/' + CMS.adminLocation + '/login', (req, res, next) => {
		passport.authenticate('local-login', function(err, user, info) {
			if (err) {
				return next(err);
			}

			if (!user) {
				CMS.renderAdminTemplate('login', {message: info});
				return;
			}

			req.logIn(user, function(err) {
				if (err) { return next(err); }

			    return res.redirect('/' + CMS.adminLocation + '/dashboard/');

			});
		})(req, res, next);
	});

	router.get('/' + CMS.adminLocation + '/logout', function(req, res){

		req.session.destroy(function() {
		    res.clearCookie(global.cms.cookieName);
		    res.redirect('/' + CMS.adminLocation + '/login');
		});

	});

	router.get('/' + CMS.adminLocation + '/forgot-password', (req, res) => {
		CMS.renderAdminTemplate('forgot-password', { message: ''});

	});

	router.post('/' + CMS.adminLocation + '/forgot-password', (req, res) => {

		if (req.body.user === '') {
			CMS.renderAdminTemplate('forgot-password', {message: 'Please enter your username or email'});
			return;
		}
	});

	router.get(['/' + CMS.adminLocation + '/dashboard', '/' + CMS.adminLocation + '/'], CMS.isLoggedIn, (req, res) => {
		CMS.renderAdminTemplate('dashboard');
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

		CMS.getAttachments(findAttachments, (err, result) => {
			CMS.renderAdminTemplate('media', {attachments: result, limit: findAttachments.limit, msg: msg});
		});
	});

	router.get('/' + CMS.adminLocation + '/edit', CMS.isLoggedIn, (req, res) => {
		CMS.renderAdminTemplate('edit');
	});

	router.get('/' + CMS.adminLocation + '/categories', CMS.isLoggedIn, (req, res) => {
		CMS.renderAdminTemplate('category-tag', 'categories');
	});

	router.get('/' + CMS.adminLocation + '/tags', CMS.isLoggedIn, (req, res) => {
		CMS.renderAdminTemplate('category-tag', 'tags');
	});

	router.post('/' + CMS.adminLocation + '/categories', CMS.isLoggedIn, (req, res) => {

		CMS.createCategory(req.body.category[0]).then((result) => {
			res.redirect('/' + CMS.adminLocation + '/categories');
		})
	});

	router.get('/' + CMS.adminLocation + '/tags', CMS.isLoggedIn, (req, res) => {
		CMS.renderAdminTemplate('category-tag');
	});

	router.get('/' + CMS.adminLocation + '/menus', CMS.isLoggedIn, (req, res) => {
		CMS.renderAdminTemplate('menus');
	});

	router.get('/' + CMS.adminLocation + '/updates', CMS.isLoggedIn, (req, res) => {
		CMS.renderAdminTemplate('updates');
	});

	router.post('/' + CMS.adminLocation + '/edit', CMS.isLoggedIn, (req, res) => {
		CMS.createContent(req.body, req.body.contentType, (err, result) => {
			res.redirect('/' + CMS.adminLocation + '/edit/' + result + '?msg=1');
		});
	});

	router.get('/' + CMS.adminLocation + '/edit/:id', CMS.isLoggedIn, (req, res) => {
		let msg = req.query.msg;
		if (typeof msg !== 'undefined') {
			CMS.renderAdminTemplate('edit', req.params, msg);
		} else {
			CMS.renderAdminTemplate('edit', req.params);
		}
	});

	router.get('/' + CMS.adminLocation + '/post-revision/:id', CMS.isLoggedIn, (req, res) => {
		CMS.renderAdminTemplate('post-revision', req.params);
	});

	router.post('/' + CMS.adminLocation + '/edit/:id', CMS.isLoggedIn, (req, res) => {
		const postId = req.params.id;
		let autoSave = false;
		req.body.postId = postId;

		if (req.body.autoSave) {
			autoSave = true;
			delete req.body.autoSave;
		}
		CMS.updatePost(req.body, req.body.postId, (err, result) => {

			if (result.noChange === true) {
				res.redirect('/' + CMS.adminLocation + '/edit/' + postId + '?msg=5');
				return;
			}

			if (result.ok === 1) {
				if (autoSave === true) {
					CMS.sendResponse(res, 200, result);
					return;
				}
				if (req.body.status === 'trash') {
					res.redirect('/' + CMS.adminLocation + '/posts?msg=4');
					return;
				} else {
					res.redirect('/' + CMS.adminLocation + '/edit/' + postId + '?msg=2');
				}
			} else {
				res.redirect('/' + CMS.adminLocation + '/edit/' + postId + '?msg=3');
			}
		});
	});

	// Settings routes
	router.get('/' + CMS.adminLocation + '/settings', CMS.isLoggedIn, (req, res) => {
		CMS.renderAdminTemplate('settings', req.params);
	});

	router.post('/' + CMS.adminLocation + '/settings', CMS.isLoggedIn, (req, res) => {

		let settings = {};

		if (!req.body.maintenance) {
			settings.maintenance = false;
		} else {
			settings.maintenance = true;
		}

		if (!req.body.postRevisions) {
			settings.postRevisions = false;
		} else {
			settings.postRevisions = true;
		}

		if (!req.body.imageRevisions) {
			settings.imageRevisions = false;
		} else {
			settings.imageRevisions = true;
		}

		if (!req.body.prettyPagination) {
			settings.prettyPagination = false;
		} else {
			settings.prettyPagination = true;
		}

		if (!req.body.custom404) {
			settings.custom404 = false;
		} else {
			settings.custom404 = true;
		}

		if (!req.body.custom500) {
			settings.custom500 = false;
		} else {
			settings.custom500 = true;
		}

		if (!req.body.anyoneRegister) {
			settings.anyoneRegister = false;
		} else {
			settings.anyoneRegister = true;
		}

		const settingsJson = _.merge(req.body, settings);
		CMS.writeConfig(settingsJson).then((result) => {
			res.redirect('/' + CMS.adminLocation + '/settings?msg=1');
		})
	});

	router.get('/' + CMS.adminLocation + '/analytics', CMS.isLoggedIn, (req, res) => {
		CMS.renderAdminTemplate('analytics', req.params);
	});

	// Theme routes
	router.get('/' + CMS.adminLocation + '/themes', CMS.isLoggedIn, (req, res) => {
		let msg = req.query.msg;
		CMS.renderAdminTemplate('themes', req.params, msg);
	});

	router.post('/' + CMS.adminLocation + '/themes', CMS.isLoggedIn, (req, res) => {
		CMS.themeSwitch(req.body.themeId, res, (newTheme) => {
			res.redirect('/' + CMS.adminLocation + '/themes?msg=1');
		});
	});

	// Plugin routes
	router.get('/' + CMS.adminLocation + '/plugins', CMS.isLoggedIn, (req, res) => {
		let msg = req.query.msg;
		CMS.renderAdminTemplate('plugins', req.params, msg);
	});

	router.post('/' + CMS.adminLocation + '/plugins', CMS.isLoggedIn, (req, res) => {
		CMS.themeSwitch(req.body.themeId, res, (newTheme) => {
			res.redirect('/' + CMS.adminLocation + '/themes?msg=1');
		});
	});

	router.get('/' + CMS.adminLocation + '/plugin/:plugin/:page', CMS.isLoggedIn, (req, res) => {
		CMS.renderPluginTemplate(res, req.params.plugin, req.params.page);
	});

	// User routes
	router.get('/' + CMS.adminLocation + '/users', CMS.isLoggedIn, (req, res) => {
		let msg = req.query.msg;

		CMS.getUsers({}, (err, results) => {
			CMS.renderAdminTemplate('users', results, msg);
		});
	});

	router.get('/' + CMS.adminLocation + '/user/edit/:id', CMS.isLoggedIn, (req, res) => {
		let msg = req.query.msg;

		const searchThisUser = {
			search: {
				_id: req.params.id
			}
		}

		const searchGetEditors = {
			search: {
				accounttype: 'editor'
			}
		}

		CMS.Promise.join(CMS.getUsers(searchThisUser), CMS.getUsers(searchGetEditors), (results, editors) => {
			results.roles = CMS.rolesAndCaps.getRoleTypes();
			results.userId = req.params.id;
			results.editors = editors
			CMS.renderAdminTemplate('user-edit', results, msg);

		});
	});

	router.get('/' + CMS.adminLocation + '/users/add', CMS.isLoggedIn, (req, res) => {
		let msg = req.query.msg;
		const results = {
			roles: CMS.rolesAndCaps.getRoleTypes()
		};
		CMS.renderAdminTemplate('user-new', results, msg);
	});

	router.post('/' + CMS.adminLocation + '/update-user', CMS.isLoggedIn, (req, res) => {
		const data = {
			roles: CMS.rolesAndCaps.getRoleTypes(),
			formData: req.body
		};

		switch (req.body.formType) {
			case 'new':

				if (req.body.username === '' || req.body.email === '' || req.body.password === '') {
					res.redirect('/' + CMS.adminLocation + '/users/add?msg=95');
					return;
				}

				CMS.createUser(req.body)
				.then((user) => {
					res.redirect('/' + CMS.adminLocation + '/user/edit/' + user._id + '?msg=98');
				})
				.catch((e) => {
					delete req.body.formType;
					delete req.body.password;
					if (e.message === 'user exists') {
						res.redirect('/' + CMS.adminLocation + '/users/add?msg=96&' + CMS._utilities.serialize(req.body));
					} else {
						res.redirect('/' + CMS.adminLocation + '/users/add?msg=97');
					}
				});
			break;
			case 'update':

				const userId = data.formData.userId;
				delete data.formData.userId;
				delete data.formData.formType;

				data.formData.accounttype = data.formData.accounttype.toLowerCase();

				if (data.formData.password) {
					data.formData.pass = CMS._utilities.hash(data.formData.password);
				}

				delete data.formData.password;

				CMS.updateUser(userId, data.formData)
				.then((user) => {
					res.redirect('/' + CMS.adminLocation + '/user/edit/' + userId + '?msg=98');
				})
				.catch((e) => {
					res.redirect('/' + CMS.adminLocation + '/user/edit/' + userId + '?msg=94');
				});
			break;

		}


	});

	//File uploads

	router.post('/' + CMS.adminLocation + '/upload', (req, res) => {

		/*
			TODO:
			- Add support for Adobe file formats (PSD, AI, EPS, etc..)
			- Set file size limit somehow
			- Set file type white/blacklist
		*/
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
				fileType: file.type,
				postId: field || ''
			}

			let fileName = file.name;
			let fileExt = fileName.split('.').pop();
			let named = fileName.substr(0, fileName.lastIndexOf('.'))

			CMS.getAttachments({search:{originalName: data.originalName}}, (err, result) => {
				if (result.attachmentCount >= 1) {
					//data.name = named + '_' + result.length + '.' + fileExt;
					named = named + '_' + result.attachmentCount;
				}

				data.name = named + '.' + fileExt;
				data.realPath = '/uploads/' + data.name

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
							data.thumbnails = result;

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

	router.post('/' + CMS.adminLocation + '/api/preview', CMS.isLoggedIn, (req, res) => {
		const previewUrl = req.body.url;
		const template = req.body.template;
		const getUrl = `${CMS.config.url}${previewUrl}`;

		CMS.sendResponse(res, 200, CMS._render._fileData(template));
	});

	router.post('/' + CMS.adminLocation + '/api/posts', (req, res) => {

		if (req.body.id) {
			let post = CMS.getPostById(req.body.id, (err, result) => {
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

		if (req.body.multiId) {
			findPosts.multiId = true;
		}

		CMS.getPosts(findPosts, (err, result) => {
			CMS.sendResponse(res, 200, {posts: result, limit: findPosts.limit});
		});

	});

	router.post('/' + CMS.adminLocation + '/api/attachments', (req, res) => {

		if (req.body.id) {
			let post = CMS.getAttachment(req.body.id, (err, result) => {
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

		CMS.getAttachments(findAttachments, (err, result) => {
			CMS.sendResponse(res, 200, result);
		});

	});

	router.post('/segment-cms/api/install', (req, res, next) => {

		if (!fs.existsSync(__dirname + '/.install')) {
			CMS.sendResponse(res, 401, 'only available during install');
			return;
		}
		const type = req.body.type;

		switch (type) {
			case 'testdb' :
				const testUrl = req.body.url;
				const testCollection = req.body.collection;

				CMS.testDbConnection(testUrl, testCollection, (err, result) => {
					if (err) {
						CMS.sendResponse(res, 200, err);
						return;
					}

					CMS.sendResponse(res, 200, 'connected');

				});
			break;

			case 'configs' :

				const config = {
					name: req.body.data.siteName.value,
					url: req.body.data.siteUrl.value,
					adminEmail: req.body.data.email.value,
					adminLocation: req.body.data.adminLocation.value,
					cmsLocation: req.body.data.siteLocation.value,
					dbHost: req.body.data.dbHost.value,
					dbUsername: req.body.data.dbUsername.value,
					dbPassword: req.body.data.dbPassword.value,
					dbName: req.body.data.dbName.value,
					dbPort: req.body.data.dbPort.value,
					dbData: req.body.data.dbCollectionData.value,
					dbAccounts: req.body.data.dbCollectionAccounts.value,
					dbSessions: req.body.data.dbCollectionSessions.value,
				}

				CMS.writeConfig(config, (err, result) => {
					if (err) {
						CMS.sendResponse(res, 200, err.message);
					} else {
						CMS.sendResponse(res, 200, 'success');
					}
				});
			break;

			case 'user' :

				// Config files written, so init the CMS with settings to
				// open a database connection

				CMS.init(settings);

				req.body.username = req.body.data.username.value;
				req.body.password = req.body.data.password.value;
				req.body.email = req.body.data.email.value;

				require('./passport.js')(passport, CMS);
		        passport.authenticate('local-install', function(err, install, info) {
					if (err) {
						CMS.sendResponse(res, 200, err.message);
						return;
					}

					if (!install) {
						CMS.sendResponse(res, 200, info);
						return;
					}

					// Reinitialize the CMS with all the new data
					CMS.init(settings);
					CMS.sendResponse(res, 200, 'success');

					setTimeout(() => {
						var events = Events();
						events.restartServer();
					}, 1500);

		        })(req, res, next);
			break;
		}
	});

	// TEMP UPDATE ROUTES!!! move to production server

	router.post('/' + CMS.adminLocation + '/api/updates', (req, res) => {

		const coreVersion = 0.5;
		const sentVersion = req.body.version;
		let msg;

		if (!isNaN(parseInt(sentVersion))) {
			if (coreVersion > sentVersion) {
				msg = 'update available';
			} else {
				msg = 'no update available';
			}
		} else {
			msg = 'invalid version sent';
		}

		CMS.sendResponse(res, 200, msg);
		return;

	});

	CMS.addedRoutes.forEach(function(route) {

		let middleware = [];

		if (route.auth) {
			middleware.push(CMS.isLoggedIn)
		}

		router[route.type](route.url, middleware, (req, res) => {
			if (typeof route.function === 'function') {
				if (route.type === 'post') {}
				route.function(req.body);
			}
		})
	});

	router.get('/' + CMS.adminLocation + '/*', CMS.isLoggedIn, (req, res) => {
	  let msg = req.query.msg;
	  CMS.errorHandler({type: 'pagenotfound'}, res);
	});

	return router;
}
