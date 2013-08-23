/* globals Backbone */

$(function() {

	var Search = Backbone.Model.extend({
		defaults: function() {
			return {
				id: 0,
				title: '',
				keywords: '',
				autorefresh: false
			};
		},
		initialize: function() {
			if (!this.get("id")) {
				// TODO: create proper autoincrement. Will break as soon as item is deleted
				this.set({"id": Searches.length + 1});
			}
		},
		toggleAutorefresh: function() {
			this.save({autorefresh: !this.get("autorefresh")});
		}
	});

	var SearchList = Backbone.Collection.extend({
		model: Search,
		localStorage: new Backbone.LocalStorage("search-history")
	});

	var Searches = new SearchList;

	var Result = Backbone.Model.extend({

	});

	var SearchView = Backbone.View.extend({

		tagName: 'li',
		className: 'list-group-item',
		template: _.template($('#search-item').html()),
		events: {
			'click ._delete': 		'clear'
		},

		initialize: function() {
			this.listenTo(this.model, 'change', this.render);
			this.listenTo(this.model, 'destroy', this.remove);
		},

		render: function() {
			this.$el.html(this.template(this.model.toJSON()));
			return this;
		},

		clear: function() {
			this.model.destroy();
		}
	});

	var ResultView = Backbone.View.extend({
		tagName: 'div',
		className: 'result col-sm-6 col-md-3',
		
		template: _.template($('#search-result').html()),

		events: {
			'click ._viewOnYouTube': 	'viewOnYouTube'
		},

		render: function() {
			this.$el.html(this.template(this.model.toJSON()));
			return this;
		},

		viewOnYouTube: function(e) {
			window.open('http://www.youtube.com/watch?v='+this.model.get('videoId'), '_blank');
		}
	});

	var ResultsView = Backbone.View.extend({
		tagName: 'div',
		className: 'tab-pane',

		template: _.template($('#search-results').html()),

		events: {
			'click ._goToPage': 		'goToPage',
		},

		initialize: function() {
			this.counter = 1;
			this.results = [];
			this.elementId = 'result'+this.model.get('id');

			this.listenTo(this.model, 'destroy', this.remove);

			this.performSearch(this.model.get('keywords'));
		},

		render: function() {
			this.$el.attr('id', this.elementId);
			this.$el.html(this.template(this.model.toJSON()));

			return this;
		},

		performSearch: function(query, pageToken) {
			var self = this;
			var googleURL = 'https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=20&key=AIzaSyDUBevtbZ-oao3TWohyX-DUEesGfauIQIc';
			googleURL += '&q=' + query;
			if (pageToken) {
				googleURL += '&pageToken=' + pageToken;
			}

			$.getJSON(googleURL, function(data) {
				_.each(data.items, function(v, k) {
					var result = new Result;
					result.set({
						title: v.snippet.title,
						thumbnail: v.snippet.thumbnails.default.url,
						description: v.snippet.description,
						videoId: v.id.videoId
					});
					self.addResult(result);
				});
			});
		},

		addResult: function(result) {
			this.results.push(result);
			var row = this.counter % 4;
			if (row === 1) {
				this.$('._result-list').append('<div class="row">');
			}
			result.set('count', this.counter);
			var view = new ResultView({model: result});
			this.$('._result-list').append(view.render().el);

			if (row === 0) {
				this.$('._result-list').append('</div>');
			}
			this.counter += 1;
		}
	});

	var NavView = Backbone.View.extend({
		tagName: 'li',
		template: _.template($('#nav-item').html()),

		events: {
			
		},

		initialize: function() {
			this.listenTo(this.model, 'destroy', this.remove);
		},

		render: function() {
			this.$el.html(this.template(this.model.toJSON()));
			return this;
		}
	});

	var AppView = Backbone.View.extend({
		el: $('._app'),

		events: {
			'click ._saveSearch': 'saveSearch',
			'click ._navLink': 'selectTab'
		},

		initialize: function() {
			this.searchTitle 	= this.$('._searchTitle');
			this.searchKeywords = this.$('._searchKeywords');
			this.searchRefresh 	= this.$('._searchRefresh');

			this.listenTo(Searches, 'add', this.addSearch);
			this.listenTo(Searches, 'reset', this.addAllSearches);
			this.listenTo(Searches, 'all', this.render);

			this.main = $('._main');

			Searches.fetch();
		},

		render: function() {
			if (Searches.length) {
				this.main.show();
			} else {
				this.main.hide();
			}
		},

		saveSearch: function(e) {
			if (!this.searchTitle.val()) {
				return;
			}
			if (!this.searchKeywords.val()) {
				return;
			}
			if (Searches.length >= 10) {
				alert('Sorry, you can only have 10 saved searches.');
				return;
			}

			Searches.create({
				title: this.searchTitle.val(),
				keywords: this.searchKeywords.val(),
				autorefresh: this.searchRefresh.is(':checked')
			});

			this.resetForm();
		},

		resetForm: function() {
			this.searchTitle.val('');
			this.searchKeywords.val('');
			this.searchRefresh.removeAttr('checked');
		},

		addSearch: function(search) {
			var list = new SearchView({model: search});
			this.$('._search-list').append(list.render().el);

			var nav = new NavView({model: search});
			this.$('._nav').append(nav.render().el);

			var view = new ResultsView({model: search});
			this.$('._tabs').append(view.render().el);
		},

		addAllSearches: function() {
			Searches.each(this.addSearch, this);
		},

		selectTab: function(e) {
			var id = $(e.currentTarget).attr('href');
			var parent = $(e.currentTarget.parentElement);
			this.$('._navLink').closest('li').removeClass('active');
			this.$('.tab-pane').removeClass('active');
			parent.addClass('active');
			this.$(id).addClass('active');
		}
	});

	var App = new AppView;
});