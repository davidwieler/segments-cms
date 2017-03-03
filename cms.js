const mongojs = require('mongojs');
const ObjectId = mongojs.ObjectId;
const fs = require('fs');
const async = require('async');
const path = require('path');
const ejs = require('ejs');
const bcrypt   = require('bcrypt-nodejs');
const adminDir = './node_modules/segments-cms/admin';
const APP = require('./admin/assets/js/core/app.js');
const Promise = require('bluebird');
(() => {

	CMS = {
		init: (settings) => {
			CMS.cmsDetails = require('./config.json');
			CMS.dbConn = settings.db;
			CMS.dbAccountConn = settings.accountDb;
			CMS.adminLocation = settings.adminLocation;
			CMS.themeDir = settings.themeDir;
			CMS.pluginDir = settings.pluginDir;
			CMS.uploadDir = settings.uploadDir;

			let themes = fs.readdirSync(CMS.themeDir);

			for (let i = themes.length - 1; i >= 0; i--) {
				let themeFolder = themes[i];
				let themePath = path.join(CMS.themeDir, themeFolder);
				let themeJson = themePath + '/theme.json';
		        let themeInfo = JSON.parse(fs.readFileSync(themeJson, 'utf-8'));

		        if (themeInfo.active === 'true') {
		        	CMS.activeTheme = themeInfo;
		        	CMS.activeTheme.path = themePath;
		        }
			}

			let plugins = fs.readdirSync(CMS.pluginDir);
			CMS.activePlugins = {
				admin: [],
				user: []
			};

			CMS.activePluginRoutes = [];

			if (plugins.length !== 0) {
				CMS.plugins = {};
				for (let i = plugins.length - 1; i >= 0; i--) {
					if (plugins[i] === '.DS_Store') {
						continue;
					}
					let pluginFolder = plugins[i];
					let pluginPath = path.join(CMS.pluginDir, pluginFolder);
					let pluginJson = pluginPath + '/plugin.json';
			        let pluginInfo = JSON.parse(fs.readFileSync(pluginJson, 'utf-8'));
			        let pluginRoutes = pluginInfo.routes;

			        if (pluginInfo.active === 'true') {

			        	let details = {
			        		pluginName: pluginInfo.name,
			        		pluginPath: pluginPath,
			        		pluginFile: path.join(pluginPath, pluginInfo.init),
			        		pluginInfo: pluginInfo
			        	}

			        	if (pluginInfo.require) {
			        		CMS.plugins[pluginInfo.name] = require(path.join(pluginPath, pluginInfo.require))(CMS, APP);
			        	}

			        	pluginInfo.path = pluginPath;

			        	if (Object.prototype.toString.call(pluginRoutes) === '[object Array]') {
				        	for (let i = pluginRoutes.length - 1; i >= 0; i--) {
				        		CMS.activePluginRoutes.push(pluginInfo)
				        	}
			        	}

			        	switch (pluginInfo.type) {
			        		case 'admin' :
					        	CMS.activePlugins.admin.push(details);
			        		break;

			        		default :
			        		case 'user' :
					        	CMS.activePlugins.user.push(details);
			        		break;
			        	}
			        }
				}
			}
		},

		addAdminNavigation: (navObject, position, navItemName) => {
			let currentNav = CMS.navigation;
			navObject.navItemName = navItemName;

			// remove any plugin
			for (var i = currentNav.length - 1; i >= 0; i--) {
				if (currentNav[i].navItemName === navItemName) {
					currentNav.splice(i, 1);
				}
			}
			currentNav.splice(position, 0, navObject);
		},

		rebuildThumbnails: (images, attachmentId, done) => {

			for (let i = images.length - 1; i >= 0; i--) {
				CMS.generateThumbnail(images[i], (result) => {
					CMS.updateAttachment(attachmentId, result);
				})
			}

		},

		generateThumbnail: (data, done) => {

			let sharp = require('sharp');
			const thumbSettings = CMS.cmsDetails.thumbnails;
			let thumbnailDetails = {};

			let uploadFolder = CMS.uploadDir;

			Promise.map(thumbSettings, function(thumb) {
				let thumbnailFileName = data.fileName + thumb.suffix + data.ext;
				thumbnailDetails[thumb.suffix] = thumbnailFileName;
				if (thumb.suffix === '-preview') {
				    return sharp( data.path )
				    	.jpeg({quality: CMS.cmsDetails.jpgQuality})
				    	.png({quality: CMS.cmsDetails.pngQuality})
				        .resize( Number(thumb.size[0]), Number(thumb.size[1]), {
						    kernel: sharp.kernel.cubic,
						    interpolator: sharp.interpolator.nohalo
						})
				        .toFile( path.join(CMS.uploadDir,thumbnailFileName ) );
				} else {
				    return sharp( data.path )
				    	.jpeg({quality: CMS.cmsDetails.jpgQuality})
				    	.png({quality: CMS.cmsDetails.pngQuality})
				        .resize( Number(thumb.size[0]), Number(thumb.size[1]), {
						    kernel: sharp.kernel.cubic,
						    interpolator: sharp.interpolator.nohalo
						})
				        .max()
				        .toFile( path.join(CMS.uploadDir,thumbnailFileName ) );
				}
			}).then(function(){
				done(null, thumbnailDetails)
			});
		},

		writeConfig: (toWrite, done) => {
			let configFile = __dirname + '/config.json';
            let config = require('./config.json');
            config.name = toWrite.name;
            config.url = toWrite.url;

            let string = JSON.stringify(config, null, '\t');

            fs.writeFile(configFile, string, (err) => {
				if (err) {
					return done(err);
				}

				done(null, 'complete');
            });

		},

		hash: (string) => {

			let hash = bcrypt.hashSync(string);

			return hash;

		},

		isLoggedIn: (req, res, next) => {

            //sa.page(req.originalUrl)

            if (req.isAuthenticated()){
            	CMS.cmsDetails.currentUser = req.user.username;
            	next();
            }
            else{
            	res.redirect('/' + CMS.adminLocation + '/login')
            }
        },

		deleteTrashed: () => {

			let allPosts = CMS.getPosts(100, (posts) => {
				let postList = posts.posts;
				for (let i = postList.length - 1; i >= 0; i--) {
					let ts = postList[i].timestamp;
					let postId = postList[i]._id;
					let status = postList[i].status;
					let now = +new Date();
					let calc = (ts + Number(CMS.activeTheme.deleteAfter));

					if (calc > now && status === 'trash') {
						CMS.deletePost(postId);
					}
				}
			});
		},

	    db: () => {
	    	let db = mongojs(CMS.dbConn.url, [CMS.dbConn.collection]);
	    	return db;
	    },

	    dbUserAccounts: () => {
	    	let db = mongojs(CMS.dbAccountConn.url, [CMS.dbAccountConn.collection]);
	    	return db;
	    },

		passThroughUrl: (url) => {
            let okay = [
	            '/' + CMS.adminLocation,
	            '/assets'
            ];

            for (let i = okay.length - 1; i >= 0; i--) {
            	if (url.indexOf(okay[i]) >= 0) {
            		return true;
            	}
            }

            return false;
		},

		sendResponse: (res, status, response) => {

	        if(typeof response === 'object'){
	            response = JSON.stringify(response);
	        }

	        res.status(status);
	        res.write(response);
	        res.end();
	        return;

	    },

	    error: (res, statusCode, msg) => {

	    	if (typeof CMS.activeTheme === 'undefined') {
	    		CMS.sendResponse(res, statusCode, msg || 'error');
	    		return;
	    	}

	    	let themePath = CMS.activeTheme.path;
	    	let renderPath = themePath + '/' + statusCode + '.ejs';

			if (fs.existsSync(renderPath)) {
				let templateData = {
					template: statusCode,
					statusCode: 404
				}
			    CMS.renderTemplate(res, templateData);
			    return;
			}

	    },

	    createContent: (data, type, done) => {

	    	let db = CMS.db();

	    	data.timestamp = +new Date();
	    	data.contentType = type;

	    	db[CMS.dbConn.collection].insert(data, (err, result) => {
	        	if (err) {
	        		console.log(err);
	        	}

	        	if (typeof done === 'function') {
	        		done(result._id);
	        	}
	    	})

	    },

	    deletePost: (postId, done) => {
	    	let db = CMS.db();

	    	db[CMS.dbConn.collection].remove({'_id':ObjectId(postId)}, (err, result) => {
	        	if (err) {
	        		console.log(err);
	        	}

	        	if (typeof done === 'function') {
	        		done(result);
	        	}
	    	})

	    },

	    deleteAttachment: (attachmentIds, done) => {

	    	let db = CMS.db();

        	if (Object.prototype.toString.call(attachmentIds) !== '[object Array]') {
        		attachmentIds = [attachmentIds];
        	}

        	let unlink = [];

			async.forEachOf(attachmentIds, (value, key, callback) => {

				let search = {'_id':ObjectId(value)};

		    	let getAttachmentData = (search, readyCallback) => {

		            db[CMS.dbConn.collection].find(search).toArray((err, docs) => {
		            	readyCallback(docs)
		            });
		        };

		        getAttachmentData(search, (results) => {
		        	unlink.push(results[0].name)

		        	for(let t in results[0].thumbnails){
		        		unlink.push(results[0].thumbnails[t]);
		        	};

			    	db[CMS.dbConn.collection].remove({'_id':ObjectId(results[0]._id)});
		        	callback();
		        });
			}, (err) => {
			    if (err){
			    	console.error(err.message);
			    }

			    for (let i = unlink.length - 1; i >= 0; i--) {
			    	if (fs.existsSync(path.join(CMS.uploadDir, unlink[i]))) {

				    	fs.unlinkSync(path.join(CMS.uploadDir, unlink[i]));
			    	} else {
			    		continue;
			    	}
			    }

			    done('done');

			});

	    },

	    getRevisions: (originalPostId, done) => {

	    },

	    createRevision: () => {

	    },

	    updatePost: (data, postId, done) => {
			let db = CMS.db();

			data.postContent = APP.sanitizeHtml(data.postContent);

			if (CMS.cmsDetails.postRevisions === true) {

				CMS.getPost(postId, (res) => {
					console.log(res);
					res.postId = data.postId;
					delete res._id;
					db.postrevisions.save(res);

					delete data.postId;
					data.updatedTimestamp = +new Date();

				    db[CMS.dbConn.collection].update(
				        {'_id':ObjectId(postId)},
				        { $set: data},
				        (err, response) => {
				        	if (err) {
				        		console.log(err);
				        	}
				        	if (typeof done === 'function') {
				        		done(response);
				        	}

				        }
				    )
				});
			} else {
			    db[CMS.dbConn.collection].update(
			        {'_id':ObjectId(postId)},
			        { $set: data},
			        (err, response) => {
			        	if (err) {
			        		console.log(err);
			        	}
			        	if (typeof done === 'function') {
			        		done(response);
			        	}

			        }
			    )
			}

	    },

	    getPost: (postId, done) => {
			let db = CMS.db();

	        db[CMS.dbConn.collection].findOne({'_id':ObjectId(postId)}, (err, post) => {
	        	if (err) {
	        		console.log(err);
	        	}
	        	done(post);
	        });
	    },

	    getAttachment: (attachmentId, done) => {
			let db = CMS.db();

	        db[CMS.dbConn.collection].findOne({'_id':ObjectId(attachmentId), contentType: 'attachment'}, (err, post) => {
	        	if (err) {
	        		console.log(err);
	        	}
	        	done(post);
	        });
	    },

	    getAttachments: (findAttachments, done) => {

			let db = CMS.db();
			let returnedAttachments = [];
			let count = 0;
			let returnedLimits = {};
			let limit = findAttachments.limit;
			let search = {contentType: 'attachment'};

			if (typeof findAttachments.search !== 'undefined') {
				search = findAttachments.search;
			}

    		returnedLimits.limit = limit;
    		returnedLimits.offset = Number(findAttachments.offset) || 0;
			let calc = (limit - 1);
			db[CMS.dbConn.collection].find(search).sort({timestamp: -1}, (err, attachments) => {

				for (var i = 0; i < attachments.length; i++) {
					if (returnedLimits.offset >= 1) {
						calc = (limit - 1 + returnedLimits.offset);
						if (i < (returnedLimits.offset)) {
							continue;
						}
					}

					if (i <= calc) {
						returnedAttachments.push(attachments[i]);
					} else {
						break;
					}

				}
				done({attachmentCount: attachments.length, attachments: returnedAttachments, limits: returnedLimits});
			});
	    },

	    getPosts: (findPosts, done) => {
			let db = CMS.db();
			let returnedPosts = [];
			let count = 0;
			let returnedLimits = {};
			let limit = findPosts.limit;
			let search = {contentType: 'post'};

			if (typeof findPosts.search !== 'undefined') {
				search = findPosts.search;
			}

    		returnedLimits.limit = limit;
    		returnedLimits.offset = Number(findPosts.offset) || 0;
    		let calc = (limit - 1);
    		//db[CMS.dbConn.collection].find(search).limit(Number(limit)).sort({timestamp: -1}, (err, posts) => {
			db[CMS.dbConn.collection].find(search).sort({timestamp: -1}, (err, posts) => {

				for (var i = 0; i < posts.length; i++) {
					if (returnedLimits.offset >= 1) {
						calc = (limit - 1 + returnedLimits.offset);
						if (i < (returnedLimits.offset)) {
							continue;
						}
					}

					if (i <= calc) {
						returnedPosts.push(posts[i]);
					} else {
						break;
					}

				}
				done({postCount: posts.length, posts: returnedPosts, limits: returnedLimits});
			});
	    },

	    getTemplates: () => {
			let themes = fs.readdirSync(CMS.themeDir);
			let templateNames = [];

			for (let i = themes.length - 1; i >= 0; i--) {
				let themeFolder = themes[i];
				let themePath = path.join(CMS.themeDir, themeFolder);
				let themeJson = themePath + '/theme.json';
		        let themeInfo = JSON.parse(fs.readFileSync(themeJson, 'utf-8'));

		        if (themeInfo.active === 'true') {
		        	let templates = fs.readdirSync(themePath);
		        	for (let i = templates.length - 1; i >= 0; i--) {
		        		templates[i]
				        let data = fs.readFileSync(themePath + '/' + templates[i], 'utf-8');
						let temp = data.split('#!');

						if (temp.length >= 2) {
							let templateData = JSON.parse(temp[0].trim());
							if (typeof templateData.template !== 'undefined') {
								templateNames.push({location:themePath + '/' + templates[i], filename: templates[i], name: templateData.template});
							}
						}
		        	}

		        }
			}

			return templateNames;
	    },

	    renderTemplate: (res, templateData) => {

	    	if (typeof CMS.activeTheme === 'undefined') {
	    		CMS.error(res, 500, 'You do not have an active theme. ');
	    		return;
	    	}

	        let render = {
	            data: templateData,
	        	plugins: CMS.activePlugins.user
	        }

	        if (typeof templateData === 'undefined') {
	        	CMS.error(res, 502, 'missing template data. Can not render.');
	            return;
	        }

	        let statusCode = 200;
	        if (typeof templateData.statusCode !== 'undefined') {
				statusCode = templateData.statusCode;
	        }

	        let template = templateData.template;

	        if (template === 'default') {
	        	template = 'index';
	        }

	        if (typeof template === 'undefined') {
	        	console.error('Error: Could not find template for this post. Rendering index.ejs from your theme folder.');
	           	let template = 'index';
	        }

	        let themePath = CMS.activeTheme.path;
	        let renderPath = '../' + themePath + '/' + template;

	        let options = {
	        	filename: themePath + '/' + template + '.ejs'
	        };

	    	let templateExists = options.filename;

	    	render.app = APP;

			console.log(render);

			if (!fs.existsSync(templateExists)) {
				CMS.sendResponse(res, 500, 'Missing ' + template + '.ejs template file');
			    return;
			}

	        let data = fs.readFileSync(themePath + '/' + template + '.ejs', 'utf-8');
			let temp = data.split('#!');

			// If there is no loop data, just render the template.
	        if (temp.length === 1) {
	        	let rendered = ejs.render(data, render, options);
	        	CMS.sendResponse(res, statusCode, rendered);
	            return;
	        }

	        let templateLoopData = JSON.parse(temp[0].trim());
			let configs = [];
			let returns = {};
			let db = CMS.db();

			async.forEachOf(templateLoopData.loop, (value, key, callback) => {

				let context = value.return;

				delete value.return;

		    	let data = (search, readyCallback) => {

		            db[CMS.dbConn.collection].find(search).toArray((err, docs) => {
		            	readyCallback(docs)
		            });
		        };

		        data(value, (results) => {
		        	returns[context] = results;
		        	callback();
		        });
			}, (err) => {
			    if (err){
			    	console.error(err.message);
			    }
			    render.loops = returns;

	        	let rendered = ejs.render(temp[1], render, options);
	            CMS.sendResponse(res, statusCode, rendered);

			});
	    },

	    renderPluginTemplate: (res, pluginInfo, routeInfo) => {
	    	console.log(res.req.url);
	        let options = {
	        	filename: path.join(pluginInfo.path, routeInfo.template + '.ejs')
	        };
	        let render = {
	        	cms: CMS,
	        	cmsInfo: CMS.cmsDetails,
	        	themeInfo: CMS.activeTheme,
	        	templates: CMS.getTemplates(),
	        	adminLocation: CMS.adminLocation,
	        	app: APP,
	        	plugins: CMS.activePlugins.admin
	        };
	        console.log(options);
	        let data = fs.readFileSync(options.filename, 'utf-8');
        	let rendered = ejs.render(data, render, options);
            CMS.sendResponse(res, 200, rendered);
	    },

	    renderAdminTemplate: (res, type, urlParams, msg) => {

	        let options = {
	        	filename: path.join(adminDir, 'templates', type + '.ejs')
	        };
	        let user = res.req.user;
	        if (user) {
	        	delete user.pass
	        }

	        let render = {
	        	cms: CMS,
	        	cmsInfo: CMS.cmsDetails,
	        	themeInfo: CMS.activeTheme,
	        	templates: CMS.getTemplates(),
	        	adminLocation: CMS.adminLocation,
	        	data: urlParams,
	        	app: APP,
	        	postData: {},
	        	user: user,
	        	plugins: CMS.activePlugins.admin
	        };

	        if (typeof msg !== 'undefined') {
	        	render.alert = msg;
	        }

	    	let data = fs.readFileSync(options.filename, 'utf-8');
	    	switch (type) {
	    		case 'edit' :
			        if (typeof urlParams !== 'undefined') {
				    	let id = urlParams.id.toString();
				    	let post = CMS.getPost(id, (postData) => {
				    		render.postData = postData;
				        	let rendered = ejs.render(data, render, options);
				            CMS.sendResponse(res, 200, rendered);
				    	});
			        } else {
			        	let rendered = ejs.render(data, render, options);
			            CMS.sendResponse(res, 200, rendered);
			        }
	    		break;

	    		case '' :

	    		break;

	    		default :
		        	let rendered = ejs.render(data, render, options);
		            CMS.sendResponse(res, 200, rendered);
	    		break;
	    	}


	    }
	}

})();