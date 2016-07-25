(function($) {
	var DATA_URL = './combobox.json';
	var comboboxSampleController = {

		__name: 'sample6.SampleController',

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
			//			this._accountComboBoxController.disable();
		},

		'input[name="disable"] click': function() {
			this._accountComboBoxController.disable();
		},

		'input[name="enable"] click': function() {
			this._accountComboBoxController.enable();
		},
	};

	h5.core.expose(comboboxSampleController);

})(jQuery);


// ---- Init ---- //
$(function() {
	h5.core.controller('body', sample6.SampleController);
});
;