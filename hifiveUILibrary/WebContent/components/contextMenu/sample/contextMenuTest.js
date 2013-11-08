$(function(){

	var logger = h5.log.createLogger('ContextMenuTestController');

	var contextMenuTestController = {

		__name: 'ContextMenuTestController',

		contextMenuController : h5.ui.ContextMenuController,

		__meta : {
			contextMenuController: {
				rootElement: '> ._contextMenuBox'
			},
		},

		__ready: function(context) {
			this.contextMenuController.contextMenuExp = this.$find('.contextMenuExp').val();
			this.$find('.targetAll').val(['1']);
			this.contextMenuController.targetAll = true;

		},

		'.targetAll change' : function(context){
			this.contextMenuController.targetAll = context.event.target.checked;
		},

		'.contextMenuExp change' : function(context){
			this.contextMenuController.contextMenuExp = $(context.event.target).val();
		},
	};

	h5.core.controller('#contextMenuTest', contextMenuTestController);
});