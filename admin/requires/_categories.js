const fs = require('fs');
const path = require('path');
const Events = require('../events.js');
const Utils = require('../utils.js');
module.exports = (CMS) => {

	var categories = {};

	categories.createCategory = (data, done) => {

		CMS.getCategories((err, result) => {

			const db = CMS.dbData;
			const collection = CMS.dbConn.data.collection;
			const query = {contentType: 'categoryList'};

			let categoryList;

			if (result === 0) {
				if (typeof data.slug === 'object') {
					categoryList = {
						slug: Utils().arrayUnique(data.slug),
						name: Utils().arrayUnique(data.name)
					};
				} else {
					categoryList = {
						slug: [data.slug],
						name: [data.name]
					};
				}
			} else {
				const slugs = result.slug;
				const names = result.name;
				const newSlugs = data.slug;
				const newNames = data.name

				const sulgsConcat = Utils().arrayUnique(slugs.concat(newSlugs));
				const namesConcat = Utils().arrayUnique(names.concat(newNames));

				categoryList = {
					slug: sulgsConcat,
					name: namesConcat
				}
			}

			const updateData = {
				categories: categoryList,
				contentType: 'categoryList'
			}

			CMS.dbUpsert(db, collection, query, updateData, (err, result) => {
				if (err) {
					done(err);
				}

				done(err, result);
			});

		});
	}

	categories.getCategories = (done) => {
		const db = CMS.dbData;
		const collection = CMS.dbConn.data.collection;

		let query = {contentType: 'categoryList'};

		CMS.dbFind(db, collection, query)
		.then((result) => {
			if (result.length === 0) {
				done(null, 0);
			} else {
				done(null, result[0].categories);
			}
		})
		.catch((e) => {
			done(e);
		});
	}

	return categories;

}
