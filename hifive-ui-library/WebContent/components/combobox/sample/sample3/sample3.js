(function($) {
	var DATA_URL = './combobox.json';
	var comboboxSampleController = {

		__name: 'sample3.SampleController',

		/** コンボボックスコントローラ */
		_accountComboBoxController: h5.ui.components.combobox.ComboBoxController,

		__meta: {
			_accountComboBoxController: {
				rootElement: 'input[name="accountcode"]'
			}
		},

		__ready: function() {

			this._accountComboBoxController.init({
				url: DATA_URL
			});
		}
	};

	h5.core.expose(comboboxSampleController);

})(jQuery);


// ---- Init ---- //
$(function() {
	h5.core.controller('body', sample3.SampleController);
});