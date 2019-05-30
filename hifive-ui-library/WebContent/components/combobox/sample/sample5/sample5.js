(function($) {
	var DATA_URL = './combobox.json';
	var comboboxSampleController = {

		__name: 'sample5.SampleController',

		/** コンボボックスコントローラ */
		_accountComboBoxController: h5.ui.components.combobox.ComboBoxController,

		__meta: {
			_accountComboBoxController: {
				rootElement: 'input[name="accountcode"]'
			}
		},

		__ready: function() {
			this._accountComboBoxController.init({
				url: DATA_URL,
				postData: {
					btnCd: "0002"
				}
			});
		}
	};

	h5.core.expose(comboboxSampleController);

})(jQuery);


// ---- Init ---- //
$(function() {
	h5.core.controller('body', sample5.SampleController);
});
