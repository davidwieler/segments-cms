$(document).ready(function() {

    $('body').on('click', '.plugin-action', function(e) {
        e.preventDefault();
		var action = $(this).data('plugin-action');
		var plugin = $(this).data('plugin-name');

		$.post(`/${adminLocation}/plugin/action`, {action, plugin}, function() {
			setTimeout(() => {
			window.location.reload()
			}, 1500);
		})
    });

    $('.alert').on('closed.bs.alert', function() {
    	adminPost('/')
    });

    // category-tag page
    $('body').on('input change', '#category-tag input[name="category[][name]"]', function() {
        var value = $(this).val();
		$('input[name="category[][slug]"').val(`${app.sanitizeTitle(value)}`);
    });

	$('body').on('input change', '#category-tag input[name="tag[][name]"]', function() {
		var value = $(this).val();
		$('input[name="tag[][slug]"').val(`${app.sanitizeTitle(value)}`);
	})

    // Auto save functions
    let timeoutId;
    $('body').on('input propertychange change paste', '#edit-form form input, #editor', function() {

		var text = $('#editor').text();
		var content = $('#editor').html();
		var postTitle = $('input[name="postTitle"]').val();
		previewIframeContents(content, postTitle);
		//return;
		var wordCount = app.countWords(text);
		var countParagraphs = app.countParagraphs(content);
		var countCharacters = app.countCharacters(text);
		var countSentences = app.countSentences(text);
		var uniqueWords = app.uniqueWords(text);
		var readTime = app.readTime(text, 250);
		var readTimeSeconds = app.readTime(text, 250, true);

		$('.word-count-stat').html(wordCount);
		$('.paragraph-stat').html(countParagraphs);
		$('.characters-stat').html(countCharacters);
		$('.sentences-stat').html(countSentences);
		$('.unique-words-stat').html(uniqueWords);

		$('input[name="postStats[wordCount]"]').val(wordCount);
		$('input[name="postStats[paragraphCount]"]').val(countParagraphs);
		$('input[name="postStats[characterCount]"]').val(countCharacters);
		$('input[name="postStats[sentenceCount]"]').val(countSentences);
		$('input[name="postStats[uniqueWordCount]"]').val(uniqueWords);


		if (typeof readTime === 'number') {
			readTime = `${readTime} seconds`;
		} else {
			readTime = `${readTime[0]} min, ${readTime[1]} seconds`;
		}

		$('.read-time-stat').html(readTime);
		$('input[name="postStats[readTime]"]').val(readTime);
		$('input[name="postStats[readTimeSeconds]"]').val(readTimeSeconds);

	    if (postId) {
	        if ($(this).data('autosave') !== false) {
	            clearTimeout(timeoutId);
	            timeoutId = setTimeout(function() {
	                // Runs 1 second (1000 ms) after the last change
	                $('textarea[name="postContent"], input[name="autoSave"]').remove();
					$('.edit-form').append(`<textarea style="display:none;" name="postContent">${content}</textarea><input type="hidden" value="true" name="autoSave">`);
	                autoSave($('.edit-form'));
	            }, autoSaveTimer);
	        }
		}

    });
    // --------- end auto save functions
    $('body').on('input change', 'input[name="postTitle"]', function() {
        var value = $(this).val();
        if ($('form.edit-form').hasClass('update')) {
            return;
        }
        if (value === '') {
            $('input[name="postUrl"').val('');
            return;
        }
        $('input[name="postUrl"').val(`/${app.sanitizeTitle(value)}`);
    });

    $('body').on('input change', 'input[name="postUrl"]', function() {
        var value = $(this).val();
        $('input[name="postUrl"').val(app.sanitizeTitle(value));
    });

    $('body').on('input change', '.edit-form input[name="postTitle"]', function() {
        $('.submit-editor').prop('disabled', false);
    });

    // category/tag form

	$('.add-category').select2({
		placeholder: 'Enter a category'
	});
	$('.add-tag').select2({
		placeholder: 'Enter a tag',
		tags: true
	});

    $('body').on('keydown', '.category-list-input', function(e) {
        if(e.which === 13) {
           e.preventDefault();
           categoryNew($(this).val(), true)
        }
    });

	$('body').on('click', '.delete-category', function() {
		var categoryData = {
			slug: $(this).data('categorySlug'),
			removeFromPosts: true
		}

		$('.modal-title').text('Delete Category')
		$('.modal-body').text('Are you sure you want to delete this Category?')
		$('.confirm-modal').addClass('delete-category-confirm').data(categoryData)
		var modal = $('#confirmationModal');
		modal.modal('toggle');
	});

	$('body').on('click', '.delete-tag', function() {
		var tagData = {
			slug: $(this).data('tagSlug'),
			removeFromPosts: true
		}

		$('.modal-title').text('Delete Tag')
		$('.modal-body').text('Are you sure you want to delete this Tag?')
		$('.confirm-modal').addClass('delete-tag-confirm').data(tagData)
		var modal = $('#confirmationModal');
		modal.modal('toggle');
	});

	$('body').on('click', '.confirm-modal.delete-category-confirm', function() {
		var data = $(this).data();

		adminPost(`/categories/delete`, data, function() {
			$(`tr[data-id="${data.slug}"]`).remove();
			var modal = $('#confirmationModal');
			modal.modal('toggle');
		});
	})

	$('body').on('click', '.confirm-modal.delete-tag-confirm', function() {
		var data = $(this).data();

		adminPost(`/tags/delete`, data, function() {
			$(`tr[data-id="${data.slug}"]`).remove();
			var modal = $('#confirmationModal');
			modal.modal('toggle');
		});
	})

    $('body').on('input change', '.category-list-input', function(e) {
        $('.submit-new-category').prop('disabled', false);

        if ($(this).val() === '') {
            $('.submit-new-category').prop('disabled', true);
        }
    });

    $('body').on('click', '.submit-new-category', function(e) {
		e.preventDefault();
		categoryNew($('.category-list-input').val(), false);
    });

	$('body').on('click', '.add-category', function(e) {
		e.preventDefault();
		var selectedCategory = $('.add-category option:selected').val();

		if (selectedCategory !== '') {
			categoryNew(selectedCategory, false);
		}
		$('.add-category option:selected').prop('disabled', true);
    });

    $('body').on('click', '.category-list-options', function() {
        let options = $(this).parent().find('.category-list-options-buttons');

        if (options.hasClass('open')) {
            options.addClass('hidden').hide().removeClass('open');
        } else {
            options.removeClass('hidden').show().addClass('open');
        }

    });

    $('body').on('click', '.category-to-url', function(e) {
        e.preventDefault();
        let self = $(this);
        let categorySlug = self.parents().eq(1).attr('data-id');
        let categoryName = self.parents().eq(1).attr('data-name');
        let toDo = '';
        if (self.hasClass('added')) {
            toDo = 'remove';
        } else {
            toDo = 'add';
        }
        categoryToUrl(categorySlug, categoryName, toDo, self);
    });

    $('body').on('click', '.category-remove', function(e) {
        e.preventDefault();
        let self = $(this);
        let categorySlug = self.parents().eq(1).attr('data-id');
        let categoryName = self.parents().eq(1).attr('data-name');
        categoryToUrl(categorySlug, categoryName, 'remove', self);
        $('li[data-id="' + categorySlug + '"]').remove();
    });

    // --------- end category form

    $('body').on('click', '.submit-editor', function(e) {
        e.preventDefault();
        var title = $('input[name="postTitle"]');
        var postUrl = $('input[name="postUrl"]');
        if (title.val() === '' || postUrl.val() === '') {
            $('.edit-form .error_msg').html('Post must have a title and URL');
            $('.submit-editor').prop('disabled', true);
            return;
        } else {
			var type = $('.editor-mode.btn-info').data('mode');
            $('textarea[name="postContent"]').remove();

			switch (type) {
				case 'html':
					var content = $('.html-editor').val();
				break;
				case 'visual':
					var content = $('#editor').html();
				break;
			}

            if (content === 'Start entering your content') {
                content = '';
            }
            $('input[name="postContent"], input[name="autoSave"]').remove();
            $('.edit-form').append(`<textarea style="display:none;" name="postContent">${content}</textarea>`);
            $('.edit-form').submit();
        }
    });

    $('body').on('click', '.trash-editor', function(e) {
        e.preventDefault();
        $('select[name="status"]').val('trash')
        $('.edit-form').submit();
    });

    $('body').on('click', '.action-distraction-free', function() {
		enableDistractionFree($(this));
    });

    $('body').on('click', '.action-preview', function() {
        var panel = $('.editor-panel');
        var panelFooter = panel.find('.panel-footer');
        var panelEditor = panel.find('.wysihtml5-editor');


        if (panel.hasClass('is-preview')) {
            $(this).removeClass('btn-info');
			panel.removeClass('is-preview');
			$('.main-panel').removeClass('col-md-6').addClass('col-md-9');
			var sidePanel = $('.side-panel').addClass('col-md-3').detach();
			$('.main-panel').after(sidePanel);
			$('.sidebar-main-toggle').click();
			$('.preview-panel').hide();
        } else {
            $(this).addClass('btn-info');
            panel.addClass('is-preview');
			$('.main-panel').removeClass('col-md-9').addClass('col-md-6');
			var sidePanel = $('.side-panel').removeClass('col-md-3').detach();
			$('.main-panel').append(sidePanel);
			$('.preview-panel').fadeIn();
			$('.sidebar-main-toggle').click();

			$('#previewiframe').attr({src: $('input[name="postUrl"]').val()});
			var previewData = {
				url: $('input[name="postUrl"]').val(),
				template: $('select[name="template"] option:selected').val()
			}
			app.preview = {};
			var items = $("form :input").map(function(index, elm) {
				var item = {};
				var type = elm.type;
				var name = elm.name;
				var value = $(elm).val();

				if (type === 'hidden' || type === 'button' || type === 'submit' || name === '' || type === 'select-one') {
					return;
				}


				return {name, type, value};

			});
        }
    });

    $('body').on('click', '.editor-mode', function() {
        var type = $(this).attr('data-mode');
        changeEditorMode(type);
        $('.editor-mode').removeClass('btn-info');
        $(this).addClass('btn-info');
    });

    $('body').on('click', '.file-uploads', function(e) {
		e.preventDefault();
        $('.file-details').empty();
        getAttachments(function(res) {
            appendAttachments(res);
            var modal = $('#fileuploadsmodal');
            modal.modal('toggle');
        }, 63, postId);
    });

    $('body').on('click', '.checker input[type="checkbox"]', function() {
        $(this).parent().toggleClass('checked');
    });

    $('body').on('click', '.btn-checkbox-all', function() {
        $(this).find('span').toggleClass('checked');
        $('.checker span').toggleClass('checked');
        var inputs = $('.checker span').find('input[type="checkbox"].checkInput');

        inputs.each(function(i) {
            if ($(this).is(':checked')) {
                $(this).prop('checked', false);
            } else {
                $(this).prop('checked', true);
            }
        });

    });

    // bulk operations --------

    $('body').on('click', '.bulk-selection a', function(e) {

        var toDo = $(this).data('do');
        e.preventDefault();

        const checked = bulkCheckboxValues();

        switch (toDo) {
            case 'bulk-edit' :

                let editContent = [];

                for (var i = checked.length - 1; i >= 0; i--) {
                    getPosts(function(res){
                        editContent.push(res);
                    }, $('input[name="limit"]').val(), checked, 0, undefined, true);
                }

                console.log(editContent);

                var modal = $('#quickeditposts');
                modal.modal('toggle');
            break;
        }
    });

    $('body').on('click', '.delete-post', function() {
        //$('#table-form').submit();
        var checked = $('.checker').children('.checked');
        var checkedBoxes = [];

        checked.each(function(i){
            var value = $(this).find('input[type="checkbox"]').val();
            checkedBoxes.push();
        })
    });

    $('body').on('click', '.media-item-wrap', function() {
        $(this).toggleClass('selected');
        showSelectedImages();
        showAttachmentDetails($(this));
    });

    $('body').on('click', '.clear-selected-images', function() {
        $('.media-item-wrap.selected').removeClass('selected');
        showSelectedImages();
    });

    $('body').on('click', '.get-attachments', function() {
        $('.media-item-wrap.selected').removeClass('selected');
        showSelectedImages();
        if ($(this).hasClass('this-post')) {
            getAttachments(function(res) { appendAttachments(res, true); }, 63, postId);
        }

        if ($(this).hasClass('all-posts')) {
            getAttachments(function(res) { appendAttachments(res, true); }, 63);
        }
    });

    $('body').on('click', '.insert-selected-images', function() {
		showSelectedImages();

		$selectedImages = $('.media-item-wrap.selected');
		const imageSize = $('.insert-settings select option:selected').val();
		const attachmentUrl = $('.link-settings select option:selected').val();

		$selectedImages.each(function(i, el) {
			let str = '';
			let link;
			let image;
			let imageData = $(this).children('.panel').data();

			if (imageSize === 'original') {
				image = imageData.location;
			} else {
				image = '/uploads/' + imageData.thumbnails[imageSize];
			}

			switch (attachmentUrl) {
				case 'none' :
					link = null;
				break;
				case 'attachment' :
					link = image;
				break;
				default:
					link = '{{POSTURL}}'
				break;
			}

			if (link !== null) {
				str += '<a href="' + link + '" class="image-link">';
				str += '<img src="' + image + '" />';
				str += '</a>';
			} else {
				str += '<img src="' + image + '" />';
			}

			console.log(str);

			insertIntoEditor(str);
		});

		var modal = $('#fileuploadsmodal');
		modal.modal('toggle');
    });

    $('body').on('click', '.uploads-modal .edit-image-toggle', function() {
        $('.image-edit').show();
        $('.image-display').hide();
        $('.clear-selected-images').click();
    });

    $('body').on('click', '.generateRandomPassword', function(e) {
        e.preventDefault();
        $('input[name="password"]').val(passwordApiGenerator(16));
    });

	$('body').on('click', '.generateApiKey', function(e) {
		e.preventDefault();
		$('input[name="apiKey"]').val(passwordApiGenerator(64));
	});

	$('body').on('click', '.revokeApiKey', function(e) {
		e.preventDefault();
		$('input[name="apiKey"]').val('');
	});

	$('body').on('click', '.show-password', function(e) {

		if ($(this).hasClass('shown')) {
			$(this).removeClass('shown');
			$('input[name="password"]').attr('type', 'password');
			$(this).children('i').removeClass('icon-eye-blocked');
		} else {
			$(this).addClass('shown');
			$('input[name="password"]').attr('type', 'text');
			$(this).children('i').addClass('icon-eye-blocked');
		}

	});

    // Editor on click content events

    $('body').on('click', '.wysihtml5-editor a, .insert-link', function() {

        var isEditorLinkClicked = $(this).is('.wysihtml5-editor a');
        var self = $(this);

        getPosts(function(res) {
            var modal = $('#linksinsertmodal');
            modal.modal('toggle');
            var posts = JSON.parse(res);
            posts = posts.data.posts;

            if (isEditorLinkClicked) {
                self.wrap('<span class="editing">')
                var href = self.attr('href');
                var title = self.text();
                var nofollow = self.attr('rel');
                var blank = self.attr('target');
                $('.links-modal .link-selection').show();
                $('.links-modal .existing-posts').hide();
                $('.external-url-toggle').text('use your published posts');
                $('.links-modal input.link-title').val(title);
                $('.links-modal input.link-url').val(href);
                if (nofollow) {
                    $('input[name="nofollow"]').prop('checked', true).parent().addClass('checked');
                }

                if (blank) {
                    $('input[name="blank"]').prop('checked', true).parent().addClass('checked');
                }
                $('.insert-link-to-post').text('Update');
            } else {
                $('.links-modal .link-selection').hide();
                $('.links-modal .existing-posts').show();
                $('.external-url-toggle').addClass('on').text('or use an external URL');
                $('input[name="blank"]').prop('checked', false).parent().removeClass('checked');
                $('input[name="nofollow"]').prop('checked', false).parent().removeClass('checked');
                $('.insert-link-to-post').text('Insert');
            }
            $('.post-list').empty();
            for (var i = posts.length - 1; i >= 0; i--) {
                var title = posts[i].postTitle;
                var url = posts[i].postUrl

                $('.post-list').append('<a href="#" class="list-group-item" data-title="' + title + '" data-url="' + url + '"><strong>' + title + '</strong><br /><small class="list-group-item-text">' + url + '</small></a>');
            }
        }, 100, undefined, undefined, {status: 'published'});
    });

    $('body').on('click', '.post-list .list-group-item', function() {

        var textSelection = window.getSelection().toString();

        if (textSelection.length === 0) {
            var title = $(this).data('title')
        } else {
            var title = textSelection;
        }
        $('.links-modal .link-selection').show();
        $('.links-modal input.link-title').val(title);
        $('.links-modal input.link-url').val($(this).data('url'));
    });

    $('body').on('click', '.external-url-toggle', function() {

        var textSelection = window.getSelection().toString();

        if ($(this).hasClass('on')) {
            $('.links-modal .link-selection').show();
            $('.links-modal .existing-posts').hide();
            $(this).removeClass('on').text('use your published posts');
        } else {
            $('.links-modal .link-selection').hide();
            $('.links-modal .existing-posts').show();
            $(this).addClass('on').text('or use an external URL');
        }

        $('.links-modal input.link-title').val(textSelection || '');
        $('.links-modal input.link-url').val('');
    });

    $('body').on('click', '.insert-link-to-post', function() {

        let insertUrl = {}
        insertUrl.title = $('.links-modal input.link-title').val();
        insertUrl.url = $('.links-modal input.link-url').val();

        if ($('input[name="nofollow"]').is(':checked')) {
            insertUrl.nofollow = 'rel="nofollow"';
        } else {
            insertUrl.nofollow = '';
        }

        if ($('input[name="blank"]').is(':checked')) {
            insertUrl.blank = 'target="_blank"';
        } else {
            insertUrl.blank = '';
        }

        var span = document.createElement("span");
        span.id = "new_selection_span";
        span.innerHTML = '<!--MARK-->';

        let url = app.createUrl(insertUrl);
        insertIntoEditor(url);
        var modal = $('#linksinsertmodal');
        modal.modal('toggle');
    });

    $('body').on('click', '.check-updates-toggle', function(e) {
		e.preventDefault();
        $(this).find('.icon-sync').addClass('spinner');
		checkUpdates();
    });

    // Upload drag and drop handlers
    $('body').on('click', '.upload-file-handler', function() {
        $('#upload-input').click();
    });

    $('body').on('click', '.cancel-upload', function() {
        $('.file-uploads-display').hide();
        $('.thumbnail-display').show();
        $("#file-upload-list").empty();
    });

    $('#upload-input').on('change', function(){

        var files = $(this).get(0).files;

        if (files.length > 0){
            getFileList(files);
        }

    });

    $('.drag-drop')
        .on("dragenter", onDragEnter)
        .on("dragover", onDragOver)
        .on("drop", onDrop);

    $('.drag-overlay')
        .on("dragleave", onDragLeave)
});

// Allow CSS transitions when page is loaded
$(window).on('load', function() {
    $('body').removeClass('no-transitions');
});


$(function() {

    // ========================================
    //
    // Heading elements
    //
    // ========================================


    // Heading elements toggler
    // -------------------------

    // Add control button toggler to page and panel headers if have heading elements
    $('.panel-heading, .page-header-content, .panel-body, .panel-footer').has('> .heading-elements').append('<a class="heading-elements-toggle"><i class="icon-more"></i></a>');


    // Toggle visible state of heading elements
    $('.heading-elements-toggle').on('click', function() {
        $(this).parent().children('.heading-elements').toggleClass('visible');
    });



    // Breadcrumb elements toggler
    // -------------------------

    // Add control button toggler to breadcrumbs if has elements
    $('.breadcrumb-line').has('.breadcrumb-elements').append('<a class="breadcrumb-elements-toggle"><i class="icon-menu-open"></i></a>');


    // Toggle visible state of breadcrumb elements
    $('.breadcrumb-elements-toggle').on('click', function() {
        $(this).parent().children('.breadcrumb-elements').toggleClass('visible');
    });




    // ========================================
    //
    // Navbar
    //
    // ========================================


    // Navbar navigation
    // -------------------------

    // Prevent dropdown from closing on click
    $(document).on('click', '.dropdown-content', function (e) {
        e.stopPropagation();
    });

    // Disabled links
    $('.navbar-nav .disabled a').on('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
    });

    // Show tabs inside dropdowns
    $('.dropdown-content a[data-toggle="tab"]').on('click', function (e) {
        $(this).tab('show');
    });



    // Drill down menu
    // ------------------------------

    // If menu has child levels, add selector class
    $('.menu-list').find('li').has('ul').parents('.menu-list').addClass('has-children');

    // Attach drill down menu to menu list with child levels
    $('.has-children').dcDrilldown({
        defaultText: 'Back to parent',
        saveState: true
    });


    // ========================================
    //
    // Element controls
    //
    // ========================================


    // Reload elements
    // -------------------------

    // Panels
    $('.panel [data-action=reload]').click(function (e) {
        e.preventDefault();
        var block = $(this).parent().parent().parent().parent().parent();
        $(block).block({
            message: '<i class="icon-spinner2 spinner"></i>',
            overlayCSS: {
                backgroundColor: '#fff',
                opacity: 0.8,
                cursor: 'wait',
                'box-shadow': '0 0 0 1px #ddd'
            },
            css: {
                border: 0,
                padding: 0,
                backgroundColor: 'none'
            }
        });

        // For demo purposes
        window.setTimeout(function () {
           $(block).unblock();
        }, 2000);
    });


    // Sidebar categories
    $('.category-title [data-action=reload]').click(function (e) {
        e.preventDefault();
        var block = $(this).parent().parent().parent().parent();
        $(block).block({
            message: '<i class="icon-spinner2 spinner"></i>',
            overlayCSS: {
                backgroundColor: '#000',
                opacity: 0.5,
                cursor: 'wait',
                'box-shadow': '0 0 0 1px #000'
            },
            css: {
                border: 0,
                padding: 0,
                backgroundColor: 'none',
                color: '#fff'
            }
        });

        // For demo purposes
        window.setTimeout(function () {
           $(block).unblock();
        }, 2000);
    });


    // Light sidebar categories
    $('.sidebar-default .category-title [data-action=reload]').click(function (e) {
        e.preventDefault();
        var block = $(this).parent().parent().parent().parent();
        $(block).block({
            message: '<i class="icon-spinner2 spinner"></i>',
            overlayCSS: {
                backgroundColor: '#fff',
                opacity: 0.8,
                cursor: 'wait',
                'box-shadow': '0 0 0 1px #ddd'
            },
            css: {
                border: 0,
                padding: 0,
                backgroundColor: 'none'
            }
        });

        // For demo purposes
        window.setTimeout(function () {
           $(block).unblock();
        }, 2000);
    });



    // Collapse elements
    // -------------------------

    //
    // Sidebar categories
    //

    // Hide if collapsed by default
    $('.category-collapsed').children('.category-content').hide();


    // Rotate icon if collapsed by default
    $('.category-collapsed').find('[data-action=collapse]').addClass('rotate-180');


    // Collapse on click
    $('.category-title [data-action=collapse]').click(function (e) {
        e.preventDefault();
        var $categoryCollapse = $(this).parent().parent().parent().nextAll();
        $(this).parents('.category-title').toggleClass('category-collapsed');
        $(this).toggleClass('rotate-180');

        containerHeight(); // adjust page height

        $categoryCollapse.slideToggle(150);
    });


    //
    // Panels
    //

    // Hide if collapsed by default
    $('.panel-collapsed').children('.panel-heading').nextAll().hide();


    // Rotate icon if collapsed by default
    $('.panel-collapsed').find('[data-action=collapse]').addClass('rotate-180');


    // Collapse on click
    $('body').on('click', '.panel [data-action=collapse]', function (e) {
        e.preventDefault();
        var $panelCollapse = $(this).parent().parent().parent().parent().nextAll();
        $(this).parents('.panel').toggleClass('panel-collapsed');
        $(this).toggleClass('rotate-180');

        //containerHeight(); // recalculate page height

        $panelCollapse.slideToggle(150);
    });



    // Remove elements
    // -------------------------

    // Panels
    $('.panel [data-action=close]').click(function (e) {
        e.preventDefault();
        var $panelClose = $(this).parent().parent().parent().parent().parent();

        containerHeight(); // recalculate page height

        $panelClose.slideUp(150, function() {
            $(this).remove();
        });
    });


    // Sidebar categories
    $('.category-title [data-action=close]').click(function (e) {
        e.preventDefault();
        var $categoryClose = $(this).parent().parent().parent().parent();

        containerHeight(); // recalculate page height

        $categoryClose.slideUp(150, function() {
            $(this).remove();
        });
    });




    // ========================================
    //
    // Main navigation
    //
    // ========================================


    // Main navigation
    // -------------------------

    // Add 'active' class to parent list item in all levels
    $('.navigation').find('li.active').parents('li').addClass('active');

    // Hide all nested lists
    //$('.navigation').find('li').not('.active, .category-title').has('ul').children('ul').addClass('hidden-ul');

    // Highlight children links
    $('.navigation').find('li').has('ul').children('a').addClass('has-ul');

    // Add active state to all dropdown parent levels
    $('.dropdown-menu:not(.dropdown-content), .dropdown-menu:not(.dropdown-content) .dropdown-submenu').has('li.active').addClass('active').parents('.navbar-nav .dropdown:not(.language-switch), .navbar-nav .dropup:not(.language-switch)').addClass('active');



    // Main navigation tooltips positioning
    // -------------------------

    // Left sidebar
    $('.navigation-main > .navigation-header > i').tooltip({
        placement: 'right',
        container: 'body'
    });



    // Collapsible functionality
    // -------------------------

    // Main navigation
    $('.navigation-main').find('li').has('ul').children('a').on('click', function (e) {
        e.preventDefault();

        // Collapsible
        $(this).parent('li').not('.disabled').not($('.sidebar-xs').not('.sidebar-xs-indicator').find('.navigation-main').children('li')).toggleClass('active').children('ul').slideToggle(250);

        // Accordion
        if ($('.navigation-main').hasClass('navigation-accordion')) {
            $(this).parent('li').not('.disabled').not($('.sidebar-xs').not('.sidebar-xs-indicator').find('.navigation-main').children('li')).siblings(':has(.has-ul)').removeClass('active').children('ul').slideUp(250);
        }
    });


    // Alternate navigation
    $('.navigation-alt').find('li').has('ul').children('a').on('click', function (e) {
        e.preventDefault();

        // Collapsible
        $(this).parent('li').not('.disabled').toggleClass('active').children('ul').slideToggle(200);

        // Accordion
        if ($('.navigation-alt').hasClass('navigation-accordion')) {
            $(this).parent('li').not('.disabled').siblings(':has(.has-ul)').removeClass('active').children('ul').slideUp(200);
        }
    });




    // ========================================
    //
    // Sidebars
    //
    // ========================================


    // Mini sidebar
    // -------------------------

    // Toggle mini sidebar
    $('.sidebar-main-toggle').on('click', function (e) {
        e.preventDefault();

        // Toggle min sidebar class
        $('body').toggleClass('sidebar-xs');
    });



    // Sidebar controls
    // -------------------------

    // Disable click in disabled navigation items
    $(document).on('click', '.navigation .disabled a', function (e) {
        e.preventDefault();
    });


    // Adjust page height on sidebar control button click
    $(document).on('click', '.sidebar-control', function (e) {
        //containerHeight();
    });


    // Hide main sidebar in Dual Sidebar
    $(document).on('click', '.sidebar-main-hide', function (e) {
        e.preventDefault();
        $('body').toggleClass('sidebar-main-hidden');
    });


    // Toggle second sidebar in Dual Sidebar
    $(document).on('click', '.sidebar-secondary-hide', function (e) {
        e.preventDefault();
        $('body').toggleClass('sidebar-secondary-hidden');
    });


    // Hide all sidebars
    $(document).on('click', '.sidebar-all-hide', function (e) {
        e.preventDefault();
        $('body').toggleClass('sidebar-all-hidden');
    });



    //
    // Opposite sidebar
    //

    // Collapse main sidebar if opposite sidebar is visible
    $(document).on('click', '.sidebar-opposite-toggle', function (e) {
        e.preventDefault();

        // Opposite sidebar visibility
        $('body').toggleClass('sidebar-opposite-visible');

        // If visible
        if ($('body').hasClass('sidebar-opposite-visible')) {

            // Make main sidebar mini
            $('body').addClass('sidebar-xs');

            // Hide children lists
            $('.navigation-main').children('li').children('ul').css('display', '');
        }
        else {

            // Make main sidebar default
            $('body').removeClass('sidebar-xs');
        }
    });


    // Hide main sidebar if opposite sidebar is shown
    $(document).on('click', '.sidebar-opposite-main-hide', function (e) {
        e.preventDefault();

        // Opposite sidebar visibility
        $('body').toggleClass('sidebar-opposite-visible');

        // If visible
        if ($('body').hasClass('sidebar-opposite-visible')) {

            // Hide main sidebar
            $('body').addClass('sidebar-main-hidden');
        }
        else {

            // Show main sidebar
            $('body').removeClass('sidebar-main-hidden');
        }
    });


    // Hide secondary sidebar if opposite sidebar is shown
    $(document).on('click', '.sidebar-opposite-secondary-hide', function (e) {
        e.preventDefault();

        // Opposite sidebar visibility
        $('body').toggleClass('sidebar-opposite-visible');

        // If visible
        if ($('body').hasClass('sidebar-opposite-visible')) {

            // Hide secondary
            $('body').addClass('sidebar-secondary-hidden');

        }
        else {

            // Show secondary
            $('body').removeClass('sidebar-secondary-hidden');
        }
    });


    // Hide all sidebars if opposite sidebar is shown
    $(document).on('click', '.sidebar-opposite-hide', function (e) {
        e.preventDefault();

        // Toggle sidebars visibility
        $('body').toggleClass('sidebar-all-hidden');

        // If hidden
        if ($('body').hasClass('sidebar-all-hidden')) {

            // Show opposite
            $('body').addClass('sidebar-opposite-visible');

            // Hide children lists
            $('.navigation-main').children('li').children('ul').css('display', '');
        }
        else {

            // Hide opposite
            $('body').removeClass('sidebar-opposite-visible');
        }
    });


    // Keep the width of the main sidebar if opposite sidebar is visible
    $(document).on('click', '.sidebar-opposite-fix', function (e) {
        e.preventDefault();

        // Toggle opposite sidebar visibility
        $('body').toggleClass('sidebar-opposite-visible');
    });



    // Mobile sidebar controls
    // -------------------------

    // Toggle main sidebar
    $('.sidebar-mobile-main-toggle').on('click', function (e) {
        e.preventDefault();
        $('body').toggleClass('sidebar-mobile-main').removeClass('sidebar-mobile-secondary sidebar-mobile-opposite');
    });


    // Toggle secondary sidebar
    $('.sidebar-mobile-secondary-toggle').on('click', function (e) {
        e.preventDefault();
        $('body').toggleClass('sidebar-mobile-secondary').removeClass('sidebar-mobile-main sidebar-mobile-opposite');
    });


    // Toggle opposite sidebar
    $('.sidebar-mobile-opposite-toggle').on('click', function (e) {
        e.preventDefault();
        $('body').toggleClass('sidebar-mobile-opposite').removeClass('sidebar-mobile-main sidebar-mobile-secondary');
    });
// Popover

});
