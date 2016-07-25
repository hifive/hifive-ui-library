(function($) {
	var DATA_URL = './combobox.json';
	var comboboxSampleController = {

		__name: 'sample10.SampleController',

		/** コンボボックスコントローラ */
		_accountComboBoxController: null,
		//		_accountComboBoxController: h5.ui.components.combobox.ComboBoxController,

		/*		__meta: {
					_accountComboBoxController: {
						rootElement: 'input[name="accountcode"]'
					}
				},
		*/
		__ready: function() {
			this._accountComboBoxController = h5.core.controller('input[name="accountcode"]',
					h5.ui.components.combobox.ComboBoxController);
			this._accountComboBoxController.init({
				url: DATA_URL
			});
		},

		'input[name="destroy"] click': function() {
			this._accountComboBoxController.destroy();
		}
	};

	h5.core.expose(comboboxSampleController);

})(jQuery);


// ---- Init ---- //
$(function() {
	h5.core.controller('body', sample10.SampleController);
});
;