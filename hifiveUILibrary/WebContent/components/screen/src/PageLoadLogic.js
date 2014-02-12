var PageLoadLogic = {
	__name: 'h5.ui.PageLoadLogic',
	load: function(url) {
		return h5.ajax(url);
	}
};
h5.core.expose(PageLoadLogic);