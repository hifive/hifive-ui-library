$(function(){

	var logger = h5.log.createLogger('TabbableController');

	var tabbableController = {
		__name: 'TabbableController',

		__ready: function(){

		},

		'.nav-tabs a click': function(context){
			context.event.preventDefault();
			var cur = $(context.event.currentTarget);
			var tabName = cur.attr('data-tab-name');
			var target = this.$find('[data-tab-name="'+ tabName + '"]');
			this.$find('.nav-tabs > *').removeClass('active');
			cur.closest('.nav-tabs > *').addClass('active');
			this.$find('.tab-pane').removeClass('active');
			this.$find('.tab-pane').filter(target).addClass('active');
		}
	};
	$('.tabbable').each(function(){
		h5.core.controller(this, tabbableController);
	});


});